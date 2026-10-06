const pool = require("../config/db");

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

module.exports = { listCategories, createCategory, updateCategory };
