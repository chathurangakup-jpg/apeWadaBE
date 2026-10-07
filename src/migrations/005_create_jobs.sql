CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  district VARCHAR(100) NOT NULL,
  city VARCHAR(100),
  venue TEXT NOT NULL,
  preferred_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL'
    CHECK (status IN ('PENDING_APPROVAL', 'OPEN', 'WORKER_SELECTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jobs_customer_id_idx ON jobs (customer_id);
CREATE INDEX IF NOT EXISTS jobs_category_id_idx ON jobs (category_id);
CREATE INDEX IF NOT EXISTS jobs_status_created_at_idx ON jobs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS job_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_filename VARCHAR(255),
  mime_type VARCHAR(100),
  file_size BIGINT CHECK (file_size IS NULL OR file_size >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_images_job_id_idx ON job_images (job_id);