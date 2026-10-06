const pool = require("../config/db");
const { hashPassword } = require("../middleware/password");

/**
 * Ensure required database tables exist.
 *
 * NOTE:
 * In a production application, database migrations are preferable.
 * This function is kept here to match the current project structure.
 */
const ensureRequiredSchema = async (client = pool) => {
  await client.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      role VARCHAR(20) NOT NULL
        CHECK (role IN ('CUSTOMER', 'WORKER', 'ADMIN'))
        DEFAULT 'CUSTOMER',

      name VARCHAR(100) NOT NULL,

      email VARCHAR(255) UNIQUE NOT NULL,

      phone VARCHAR(20) UNIQUE,

      password_hash TEXT,

      avatar_path TEXT,

      preferred_language VARCHAR(10) NOT NULL DEFAULT 'EN'
        CHECK (preferred_language IN ('EN', 'SI')),

      is_active BOOLEAN NOT NULL DEFAULT TRUE,

      last_login_at TIMESTAMPTZ,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS customer_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      user_id UUID NOT NULL UNIQUE
        REFERENCES users(id)
        ON DELETE CASCADE,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS worker_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      user_id UUID NOT NULL UNIQUE
        REFERENCES users(id)
        ON DELETE CASCADE,

      approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (
          approval_status IN (
            'PENDING',
            'APPROVED',
            'REJECTED'
          )
        ),

      availability_status VARCHAR(20) NOT NULL DEFAULT 'UNAVAILABLE'
        CHECK (
          availability_status IN (
            'AVAILABLE',
            'UNAVAILABLE'
          )
        ),

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

/**
 * Find user by ID
 */
const findUserById = async (userId) => {
  await ensureRequiredSchema();

  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        phone,
        role,
        password_hash,
        preferred_language,
        avatar_path,
        is_active,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE id = $1
    `,
    [userId],
  );

  return result.rows[0] || null;
};

/**
 * Find user by email
 */
const findUserByEmail = async (email) => {
  await ensureRequiredSchema();

  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        phone,
        role,
        password_hash,
        preferred_language,
        avatar_path,
        is_active,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE email = $1
    `,
    [email],
  );

  return result.rows[0] || null;
};

/**
 * Update user's last login timestamp
 */
const updateLastLogin = async (userId) => {
  await ensureRequiredSchema();

  await pool.query(
    `
      UPDATE users
      SET
        last_login_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `,
    [userId],
  );
};

/**
 * Create user and related profile in one transaction
 */
const createUserWithProfile = async ({
  name,
  email,
  password,
  phone,
  role,
  preferredLanguage,
}) => {
  const client = await pool.connect();

  try {
    await ensureRequiredSchema(client);

    await client.query("BEGIN");

    const hashedPassword = await hashPassword(password);

    const userResult = await client.query(
      `
        INSERT INTO users (
          name,
          email,
          password_hash,
          phone,
          avatar_path,
          role,
          preferred_language,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING
          id,
          name,
          email,
          phone,
          role,
          preferred_language,
          avatar_path,
          is_active,
          created_at,
          updated_at
      `,
      [
        name,
        email,
        hashedPassword,
        phone || null,
        null,
        role,
        preferredLanguage,
      ],
    );

    const user = userResult.rows[0];

    if (role === "CUSTOMER") {
      await client.query(
        `
          INSERT INTO customer_profiles (
            user_id,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            NOW(),
            NOW()
          )
        `,
        [user.id],
      );
    }

    if (role === "WORKER") {
      await client.query(
        `
          INSERT INTO worker_profiles (
            user_id,
            approval_status,
            availability_status,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            'PENDING',
            'UNAVAILABLE',
            NOW(),
            NOW()
          )
        `,
        [user.id],
      );
    }

    await client.query("COMMIT");

    return user;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createUserWithProfile,
  findUserByEmail,
  findUserById,
  updateLastLogin,
  ensureRequiredSchema,
};
