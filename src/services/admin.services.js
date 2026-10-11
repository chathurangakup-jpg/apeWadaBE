const pool = require("../config/db");
const { notifyUser } = require("./notification.services");

const CATEGORY_COLUMNS = {
  nameEn: "name_en",
  nameSi: "name_si",
  slug: "slug",
  icon: "icon",
  isActive: "is_active",
};

const ADMIN_USER_SELECT = `
  SELECT u.id, u.role, u.name, u.email, u.phone,
    u.preferred_language AS "preferredLanguage", u.is_active AS "isActive",
    u.last_login_at AS "lastLoginAt", u.created_at AS "createdAt",
    u.updated_at AS "updatedAt",
    CASE
      WHEN u.role = 'CUSTOMER' AND cp.user_id IS NOT NULL THEN
        jsonb_build_object(
          'address', cp.address, 'district', cp.district,
          'city', cp.city, 'venue', cp.venue,
          'createdAt', cp.created_at, 'updatedAt', cp.updated_at
        )
      WHEN u.role = 'WORKER' AND wp.user_id IS NOT NULL THEN
        jsonb_build_object(
          'bio', wp.bio, 'experienceYears', wp.experience_years,
          'educationSummary', wp.education_summary, 'district', wp.district,
          'city', wp.city, 'venue', wp.venue,
          'approvalStatus', wp.approval_status,
          'availabilityStatus', wp.availability_status,
          'averageRating', wp.average_rating, 'reviewCount', wp.review_count,
          'createdAt', wp.created_at, 'updatedAt', wp.updated_at,
          'categories', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', c.id, 'nameEn', c.name_en, 'nameSi', c.name_si,
              'slug', c.slug, 'icon', c.icon
            ) ORDER BY c.name_en)
            FROM worker_categories wc
            JOIN categories c ON c.id = wc.category_id
            WHERE wc.worker_id = u.id
          ), '[]'::jsonb),
          'experiences', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', we.id, 'companyName', we.company_name,
              'jobTitle', we.job_title, 'description', we.description,
              'startDate', we.start_date, 'endDate', we.end_date,
              'isCurrent', we.is_current
            ) ORDER BY we.created_at)
            FROM worker_experience we WHERE we.worker_id = u.id
          ), '[]'::jsonb),
          'education', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', we.id, 'institution', we.institution,
              'qualification', we.qualification, 'description', we.description,
              'startDate', we.start_date, 'endDate', we.end_date
            ) ORDER BY we.created_at)
            FROM worker_education we WHERE we.worker_id = u.id
          ), '[]'::jsonb),
          'portfolio', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', p.id, 'title', p.title, 'description', p.description,
              'completedAt', p.completed_at
            ) ORDER BY p.created_at)
            FROM worker_portfolio p WHERE p.worker_id = u.id
          ), '[]'::jsonb)
        )
      ELSE NULL
    END AS profile
  FROM users u
  LEFT JOIN customer_profiles cp ON cp.user_id = u.id
  LEFT JOIN worker_profiles wp ON wp.user_id = u.id
`;

const serializeCategory = (row) => ({
  id: row.id,
  nameEn: row.name_en,
  nameSi: row.name_si,
  slug: row.slug,
  icon: row.icon,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const listCategories = async () => {
  const result = await pool.query(
    `SELECT id, name_en, name_si, slug, icon, is_active, created_at, updated_at
     FROM categories
     ORDER BY name_en ASC`,
  );

  return result.rows.map(serializeCategory);
};

const createCategory = async (payload) => {
  const result = await pool.query(
    `INSERT INTO categories (name_en, name_si, slug, icon, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name_en, name_si, slug, icon, is_active, created_at, updated_at`,
    [
      payload.nameEn,
      payload.nameSi ?? null,
      payload.slug,
      payload.icon ?? null,
      payload.isActive ?? true,
    ],
  );

  return serializeCategory(result.rows[0]);
};

const updateCategory = async (id, payload) => {
  const fields = Object.entries(payload);
  const assignments = fields.map(
    ([field], index) => `${CATEGORY_COLUMNS[field]} = $${index + 1}`,
  );
  const values = fields.map(([, value]) => value);
  values.push(id);

  const result = await pool.query(
    `UPDATE categories
     SET ${assignments.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING id, name_en, name_si, slug, icon, is_active, created_at, updated_at`,
    values,
  );

  return result.rows[0] ? serializeCategory(result.rows[0]) : null;
};

const listAdminUsers = async (role) => {
  const result = await pool.query(
    `${ADMIN_USER_SELECT}
     WHERE u.role IN ('CUSTOMER', 'WORKER')
       AND ($1::VARCHAR IS NULL OR u.role = $1)
     ORDER BY u.created_at DESC`,
    [role],
  );
  return result.rows;
};

const updateAdminUser = async (userId, payload) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userResult = await client.query(
      `SELECT id, role FROM users WHERE id = $1 AND role IN ('CUSTOMER', 'WORKER') FOR UPDATE`,
      [userId],
    );
    const user = userResult.rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      return null;
    }

    const workerOnlyFields = ["bio", "experienceYears", "educationSummary"];
    const customerOnlyFields = ["address"];
    const disallowedFields =
      user.role === "WORKER" ? customerOnlyFields : workerOnlyFields;
    if (
      Object.keys(payload).some((field) => disallowedFields.includes(field))
    ) {
      const error = new Error(
        `Profile fields do not match the ${user.role} account`,
      );
      error.code = "PROFILE_FIELDS_NOT_ALLOWED";
      throw error;
    }

    const userColumns = {
      name: "name",
      email: "email",
      phone: "phone",
      preferredLanguage: "preferred_language",
      isActive: "is_active",
    };
    const accountFields = Object.entries(userColumns).filter(
      ([field]) => payload[field] !== undefined,
    );
    if (accountFields.length > 0) {
      const values = accountFields.map(([field]) => payload[field]);
      values.push(userId);
      const assignments = accountFields.map(
        ([, column], index) => `${column} = $${index + 1}`,
      );
      await client.query(
        `UPDATE users SET ${assignments.join(", ")}, updated_at = NOW() WHERE id = $${values.length}`,
        values,
      );
    }

    const profileColumns = {
      district: "district",
      city: "city",
      venue: "venue",
      ...(user.role === "CUSTOMER"
        ? { address: "address" }
        : {
            bio: "bio",
            experienceYears: "experience_years",
            educationSummary: "education_summary",
          }),
    };
    const profileFields = Object.entries(profileColumns).filter(
      ([field]) => payload[field] !== undefined,
    );
    if (profileFields.length > 0) {
      const columns = profileFields.map(([, column]) => column);
      const values = [
        userId,
        ...profileFields.map(([field]) => payload[field]),
      ];
      const placeholders = profileFields.map((_, index) => `$${index + 2}`);
      const assignments = profileFields.map(
        ([, column]) => `${column} = EXCLUDED.${column}`,
      );
      await client.query(
        `
          INSERT INTO ${user.role === "CUSTOMER" ? "customer_profiles" : "worker_profiles"}
            (user_id, ${columns.join(", ")})
          VALUES ($1, ${placeholders.join(", ")})
          ON CONFLICT (user_id) DO UPDATE
          SET ${assignments.join(", ")}, updated_at = NOW()
        `,
        values,
      );
    }

    const updatedResult = await client.query(
      `${ADMIN_USER_SELECT} WHERE u.id = $1`,
      [userId],
    );
    await client.query("COMMIT");
    return updatedResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const approveCustomerJob = async (jobId, adminId, { decision, reason }) => {
  const approved = decision === "APPROVE";
  const result = await pool.query(
    `
      UPDATE jobs
      SET status = $1,
        approved_by = $2,
        approved_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
        rejection_reason = CASE WHEN $3 THEN NULL ELSE $4 END,
        updated_at = NOW()
      WHERE id = $5 AND status = 'PENDING_APPROVAL'
      RETURNING id, customer_id AS "customerId", title, status
    `,
    [approved ? "OPEN" : "REJECTED", adminId, approved, reason, jobId],
  );
  if (result.rows[0]) return result.rows[0];

  const existingResult = await pool.query(
    `SELECT id, status FROM jobs WHERE id = $1`,
    [jobId],
  );
  return existingResult.rowCount === 0
    ? null
    : { error: "JOB_NOT_PENDING", status: existingResult.rows[0].status };
};

const approveWorkerProfile = async (
  workerId,
  adminId,
  { decision, reason },
) => {
  const approved = decision === "APPROVE";
  const result = await pool.query(
    `
      UPDATE worker_profiles wp
      SET approval_status = $1,
        approved_by = $2,
        approved_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
        approval_reason = $4,
        updated_at = NOW()
      FROM users u
      WHERE wp.user_id = $5 AND u.id = wp.user_id
        AND u.role = 'WORKER' AND wp.approval_status = 'PENDING'
      RETURNING wp.user_id AS "workerId", wp.approval_status AS "approvalStatus"
    `,
    [approved ? "APPROVED" : "REJECTED", adminId, approved, reason, workerId],
  );
  if (result.rows[0]) return result.rows[0];

  const existingResult = await pool.query(
    `SELECT wp.user_id, wp.approval_status FROM worker_profiles wp JOIN users u ON u.id = wp.user_id WHERE wp.user_id = $1 AND u.role = 'WORKER'`,
    [workerId],
  );
  return existingResult.rowCount === 0
    ? null
    : {
        error: "WORKER_NOT_PENDING",
        approvalStatus: existingResult.rows[0].approval_status,
      };
};

const approveJobAndNotify = async (jobId, adminId, payload) => {
  const result = await approveCustomerJob(jobId, adminId, payload);
  if (result && !result.error) {
    const approved = payload.decision === "APPROVE";
    await notifyUser({
      userId: result.customerId,
      type: approved ? "JOB_APPROVED" : "JOB_REJECTED",
      title: approved ? "Job approved" : "Job not approved",
      message: approved
        ? `Your job "${result.title}" is now open for worker requests.`
        : `Your job "${result.title}" was not approved${payload.reason ? `: ${payload.reason}` : "."}`,
      data: { jobId: result.id, status: result.status },
    });
  }
  return result;
};

const approveWorkerAndNotify = async (workerId, adminId, payload) => {
  const result = await approveWorkerProfile(workerId, adminId, payload);
  if (result && !result.error) {
    const approved = payload.decision === "APPROVE";
    await notifyUser({
      userId: result.workerId,
      type: approved ? "WORKER_APPROVED" : "WORKER_REJECTED",
      title: approved
        ? "Worker profile approved"
        : "Worker profile not approved",
      message: approved
        ? "Your worker profile is approved and can now be discovered by customers."
        : `Your worker profile was not approved${payload.reason ? `: ${payload.reason}` : "."}`,
      data: {
        workerId: result.workerId,
        approvalStatus: result.approvalStatus,
      },
    });
  }
  return result;
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  listAdminUsers,
  updateAdminUser,
  approveJobAndNotify,
  approveWorkerAndNotify,
};
