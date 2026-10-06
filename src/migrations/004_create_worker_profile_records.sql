CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS worker_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES worker_profiles(user_id) ON DELETE CASCADE,
  company_name VARCHAR(150),
  job_title VARCHAR(150),
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS worker_experience_worker_id_idx
  ON worker_experience (worker_id);

CREATE TABLE IF NOT EXISTS worker_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES worker_profiles(user_id) ON DELETE CASCADE,
  institution VARCHAR(200),
  qualification VARCHAR(200),
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS worker_education_worker_id_idx
  ON worker_education (worker_id);

CREATE TABLE IF NOT EXISTS worker_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES worker_profiles(user_id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  completed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS worker_portfolio_worker_id_idx
  ON worker_portfolio (worker_id);