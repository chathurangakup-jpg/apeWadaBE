CREATE TABLE IF NOT EXISTS worker_categories (
  worker_id UUID NOT NULL REFERENCES worker_profiles(user_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (worker_id, category_id)
);

CREATE INDEX IF NOT EXISTS worker_categories_category_id_idx
  ON worker_categories (category_id);