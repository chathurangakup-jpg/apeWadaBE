const pool = require("../config/db");
const { notifyUser } = require("./notification.services");

const CATEGORY_COLUMNS = {
  nameEn: "name_en",
  nameSi: "name_si",
  slug: "slug",
  icon: "icon",
  isActive: "is_active",
};

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
  approveJobAndNotify,
  approveWorkerAndNotify,
};
