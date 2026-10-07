CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS worker_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES worker_profiles(user_id) ON DELETE CASCADE,
  availability_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status VARCHAR(20) NOT NULL CHECK (status IN ('AVAILABLE', 'UNAVAILABLE')),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT worker_availability_time_order
    CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time)
);

CREATE INDEX IF NOT EXISTS worker_availability_worker_date_idx
  ON worker_availability (worker_id, availability_date);
CREATE UNIQUE INDEX IF NOT EXISTS worker_availability_booking_id_idx
  ON worker_availability (booking_id)
  WHERE booking_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE RESTRICT,
  booking_id UUID REFERENCES bookings(id) ON DELETE RESTRICT,
  cancelled_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cancelled_by_role VARCHAR(20) NOT NULL
    CHECK (cancelled_by_role IN ('CUSTOMER', 'WORKER', 'ADMIN')),
  reason TEXT NOT NULL CHECK (LENGTH(TRIM(reason)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cancellation_job_or_booking_required
    CHECK (job_id IS NOT NULL OR booking_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS cancellations_cancelled_by_idx
  ON cancellations (cancelled_by);
CREATE INDEX IF NOT EXISTS cancellations_booking_id_idx
  ON cancellations (booking_id);
