CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS job_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES worker_profiles(user_id) ON DELETE RESTRICT,
  proposed_budget NUMERIC(12,2) NOT NULL CHECK (proposed_budget > 0),
  message TEXT,
  proposed_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SELECTED', 'REJECTED', 'WITHDRAWN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT job_requests_job_worker_unique UNIQUE (job_id, worker_id)
);

CREATE INDEX IF NOT EXISTS job_requests_worker_id_idx ON job_requests (worker_id);
CREATE INDEX IF NOT EXISTS job_requests_job_status_idx ON job_requests (job_id, status);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  worker_id UUID NOT NULL REFERENCES worker_profiles(user_id) ON DELETE RESTRICT,
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_CONFIRMATION'
    CHECK (status IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bookings_time_order CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time)
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_per_job_idx
  ON bookings (job_id)
  WHERE job_id IS NOT NULL AND status <> 'CANCELLED';

CREATE INDEX IF NOT EXISTS bookings_customer_id_idx ON bookings (customer_id);
CREATE INDEX IF NOT EXISTS bookings_worker_status_idx ON bookings (worker_id, status);