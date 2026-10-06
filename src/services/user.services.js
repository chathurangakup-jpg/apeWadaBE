const pool = require("../config/db");
const { hashPassword } = require("../middleware/password");

/**
 * Get current user + role-specific profile
 */
const getCurrentUser = async (userId) => {
  const client = await pool.connect();

  try {
    const userResult = await client.query(
      `
        SELECT
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
        FROM users
        WHERE id = $1
      `,
      [userId],
    );

    const user = userResult.rows[0];

    if (!user) {
      return null;
    }

    let profile = null;

    if (user.role === "CUSTOMER") {
      const profileResult = await client.query(
        `
          SELECT
            address,
            district,
            city,
            venue
          FROM customer_profiles
          WHERE user_id = $1
        `,
        [userId],
      );

      profile = profileResult.rows[0] || null;
    }

    if (user.role === "WORKER") {
      const profileResult = await client.query(
        `
          SELECT
            bio,
            experience_years,
            education_summary,
            district,
            city,
            venue,
            approval_status,
            availability_status,
            average_rating,
            review_count
          FROM worker_profiles
          WHERE user_id = $1
        `,
        [userId],
      );

      profile = profileResult.rows[0] || null;

      if (profile) {
        const categoriesResult = await client.query(
          `
            SELECT c.id, c.name_en AS "nameEn", c.name_si AS "nameSi", c.slug, c.icon
            FROM worker_categories wc
            JOIN categories c ON c.id = wc.category_id
            WHERE wc.worker_id = $1
            ORDER BY c.name_en ASC
          `,
          [userId],
        );

        profile.categories = categoriesResult.rows;

        const [experiencesResult, educationResult, portfolioResult] =
          await Promise.all([
            client.query(
              `
                SELECT id, company_name AS "companyName", job_title AS "jobTitle",
                  description, start_date AS "startDate", end_date AS "endDate",
                  is_current AS "isCurrent", created_at AS "createdAt", updated_at AS "updatedAt"
                FROM worker_experience WHERE worker_id = $1 ORDER BY created_at ASC
              `,
              [userId],
            ),
            client.query(
              `
                SELECT id, institution, qualification, description,
                  start_date AS "startDate", end_date AS "endDate",
                  created_at AS "createdAt", updated_at AS "updatedAt"
                FROM worker_education WHERE worker_id = $1 ORDER BY created_at ASC
              `,
              [userId],
            ),
            client.query(
              `
                SELECT id, title, description, completed_at AS "completedAt",
                  created_at AS "createdAt", updated_at AS "updatedAt"
                FROM worker_portfolio WHERE worker_id = $1 ORDER BY created_at ASC
              `,
              [userId],
            ),
          ]);

        profile.experiences = experiencesResult.rows;
        profile.education = educationResult.rows;
        profile.portfolio = portfolioResult.rows;
      }
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferred_language,
        avatarPath: user.avatar_path,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },

      profile,
    };
  } finally {
    client.release();
  }
};

/**
 * Update user account
 */
const updateCurrentUser = async (userId, payload) => {
  const fields = [];
  const values = [];
  let parameterIndex = 1;

  if (payload.name !== undefined) {
    fields.push(`name = $${parameterIndex}`);
    values.push(payload.name);
    parameterIndex++;
  }

  if (payload.phone !== undefined) {
    fields.push(`phone = $${parameterIndex}`);
    values.push(payload.phone);
    parameterIndex++;
  }

  if (payload.preferredLanguage !== undefined) {
    fields.push(`preferred_language = $${parameterIndex}`);
    values.push(payload.preferredLanguage);
    parameterIndex++;
  }

  if (fields.length === 0) {
    return null;
  }

  fields.push("updated_at = NOW()");

  values.push(userId);

  const result = await pool.query(
    `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = $${parameterIndex}
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
    values,
  );

  return result.rows[0] || null;
};

/**
 * Update customer profile
 */
const updateCustomerProfile = async (userId, payload) => {
  const fields = [];
  const values = [];
  let parameterIndex = 1;

  const fieldMap = {
    address: "address",
    district: "district",
    city: "city",
    venue: "venue",
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    if (payload[key] !== undefined) {
      fields.push(`${column} = $${parameterIndex}`);
      values.push(payload[key]);
      parameterIndex++;
    }
  }

  if (fields.length === 0) {
    return null;
  }

  fields.push("updated_at = NOW()");

  values.push(userId);

  const result = await pool.query(
    `
      UPDATE customer_profiles
      SET ${fields.join(", ")}
      WHERE user_id = $${parameterIndex}
      RETURNING
        address,
        district,
        city,
        venue,
        created_at,
        updated_at
    `,
    values,
  );

  return result.rows[0] || null;
};

/**
 * Update worker profile
 *
 * IMPORTANT:
 * approval_status,
 * approved_by,
 * approved_at,
 * average_rating,
 * review_count,
 * availability_status
 *
 * are intentionally NOT accepted here.
 */
const updateWorkerProfile = async (userId, payload) => {
  const client = await pool.connect();
  const fields = [];
  const values = [];
  let parameterIndex = 1;

  const fieldMap = {
    bio: "bio",
    experienceYears: "experience_years",
    educationSummary: "education_summary",
    district: "district",
    city: "city",
    venue: "venue",
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    if (payload[key] !== undefined) {
      fields.push(`${column} = $${parameterIndex}`);
      values.push(payload[key]);
      parameterIndex++;
    }
  }

  try {
    await client.query("BEGIN");

    const workerResult = await client.query(
      `SELECT user_id FROM worker_profiles WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );

    if (workerResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    let profileResult;

    if (fields.length > 0) {
      fields.push("updated_at = NOW()");
      values.push(userId);

      profileResult = await client.query(
        `
          UPDATE worker_profiles
          SET ${fields.join(", ")}
          WHERE user_id = $${parameterIndex}
          RETURNING
            bio,
            experience_years,
            education_summary,
            district,
            city,
            venue,
            approval_status,
            availability_status,
            average_rating,
            review_count,
            created_at,
            updated_at
        `,
        values,
      );
    } else {
      profileResult = await client.query(
        `
          SELECT
            bio,
            experience_years,
            education_summary,
            district,
            city,
            venue,
            approval_status,
            availability_status,
            average_rating,
            review_count,
            created_at,
            updated_at
          FROM worker_profiles
          WHERE user_id = $1
        `,
        [userId],
      );
    }

    if (payload.categoryIds !== undefined) {
      const activeCategoriesResult = await client.query(
        `SELECT id FROM categories WHERE id = ANY($1::uuid[]) AND is_active = TRUE`,
        [payload.categoryIds],
      );

      if (activeCategoriesResult.rowCount !== payload.categoryIds.length) {
        const error = new Error(
          "One or more categoryIds are invalid or inactive",
        );
        error.code = "INVALID_CATEGORY_IDS";
        throw error;
      }

      await client.query(`DELETE FROM worker_categories WHERE worker_id = $1`, [
        userId,
      ]);

      if (payload.categoryIds.length > 0) {
        await client.query(
          `
            INSERT INTO worker_categories (worker_id, category_id)
            SELECT $1, category_id
            FROM UNNEST($2::uuid[]) AS category_id
          `,
          [userId, payload.categoryIds],
        );
      }
    }

    const recordCollections = [
      {
        payloadKey: "experiences",
        table: "worker_experience",
        columns:
          "worker_id, company_name, job_title, description, start_date, end_date, is_current",
        values: (record) => [
          userId,
          record.companyName,
          record.jobTitle,
          record.description,
          record.startDate,
          record.endDate,
          record.isCurrent ?? false,
        ],
        placeholders: "$1, $2, $3, $4, $5, $6, $7",
      },
      {
        payloadKey: "education",
        table: "worker_education",
        columns:
          "worker_id, institution, qualification, description, start_date, end_date",
        values: (record) => [
          userId,
          record.institution,
          record.qualification,
          record.description,
          record.startDate,
          record.endDate,
        ],
        placeholders: "$1, $2, $3, $4, $5, $6",
      },
      {
        payloadKey: "portfolio",
        table: "worker_portfolio",
        columns: "worker_id, title, description, completed_at",
        values: (record) => [
          userId,
          record.title,
          record.description,
          record.completedAt,
        ],
        placeholders: "$1, $2, $3, $4",
      },
    ];

    for (const collection of recordCollections) {
      if (payload[collection.payloadKey] === undefined) {
        continue;
      }

      await client.query(
        `DELETE FROM ${collection.table} WHERE worker_id = $1`,
        [userId],
      );

      for (const record of payload[collection.payloadKey]) {
        await client.query(
          `INSERT INTO ${collection.table} (${collection.columns}) VALUES (${collection.placeholders})`,
          collection.values(record),
        );
      }
    }

    const categoriesResult = await client.query(
      `
        SELECT c.id, c.name_en AS "nameEn", c.name_si AS "nameSi", c.slug, c.icon
        FROM worker_categories wc
        JOIN categories c ON c.id = wc.category_id
        WHERE wc.worker_id = $1
        ORDER BY c.name_en ASC
      `,
      [userId],
    );

    const [experiencesResult, educationResult, portfolioResult] =
      await Promise.all([
        client.query(
          `SELECT id, company_name AS "companyName", job_title AS "jobTitle", description, start_date AS "startDate", end_date AS "endDate", is_current AS "isCurrent" FROM worker_experience WHERE worker_id = $1 ORDER BY created_at ASC`,
          [userId],
        ),
        client.query(
          `SELECT id, institution, qualification, description, start_date AS "startDate", end_date AS "endDate" FROM worker_education WHERE worker_id = $1 ORDER BY created_at ASC`,
          [userId],
        ),
        client.query(
          `SELECT id, title, description, completed_at AS "completedAt" FROM worker_portfolio WHERE worker_id = $1 ORDER BY created_at ASC`,
          [userId],
        ),
      ]);

    await client.query("COMMIT");

    return {
      ...profileResult.rows[0],
      categories: categoriesResult.rows,
      experiences: experiencesResult.rows,
      education: educationResult.rows,
      portfolio: portfolioResult.rows,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get password hash for authentication
 */
const getPasswordHash = async (userId) => {
  const result = await pool.query(
    `
      SELECT password_hash
      FROM users
      WHERE id = $1
    `,
    [userId],
  );

  return result.rows[0]?.password_hash || null;
};

/**
 * Change password
 */
const changePassword = async (userId, newPassword) => {
  const hashedPassword = await hashPassword(newPassword);

  await pool.query(
    `
      UPDATE users
      SET
        password_hash = $1,
        updated_at = NOW()
      WHERE id = $2
    `,
    [hashedPassword, userId],
  );
};

/**
 * Update avatar path
 */
const updateAvatarPath = async (userId, avatarPath) => {
  const result = await pool.query(
    `
      UPDATE users
      SET
        avatar_path = $1,
        updated_at = NOW()
      WHERE id = $2
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
    [avatarPath, userId],
  );

  return result.rows[0] || null;
};

/**
 * Deactivate account
 */
const deactivateUser = async (userId) => {
  const result = await pool.query(
    `
      UPDATE users
      SET
        is_active = FALSE,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        is_active,
        updated_at
    `,
    [userId],
  );

  return result.rows[0] || null;
};

module.exports = {
  getCurrentUser,
  updateCurrentUser,
  updateCustomerProfile,
  updateWorkerProfile,
  getPasswordHash,
  changePassword,
  updateAvatarPath,
  deactivateUser,
};
