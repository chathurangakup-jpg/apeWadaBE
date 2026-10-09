CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  worker_id UUID NOT NULL REFERENCES worker_profiles(user_id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_job_participants_unique
    UNIQUE (job_id, customer_id, worker_id),
  CONSTRAINT conversations_distinct_participants
    CHECK (customer_id <> worker_id)
);

CREATE INDEX IF NOT EXISTS conversations_customer_id_idx
  ON conversations (customer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS conversations_worker_id_idx
  ON conversations (worker_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS conversation_participants_user_id_idx
  ON conversation_participants (user_id, conversation_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT' CHECK (message_type = 'TEXT'),
  content TEXT NOT NULL CHECK (LENGTH(TRIM(content)) > 0),
  attachment_path TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS messages_conversation_sent_at_idx
  ON messages (conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx
  ON messages (sender_id);


ALTER TABLE conversations
  ALTER COLUMN job_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_direct_participants_unique
  ON conversations (customer_id, worker_id)
  WHERE job_id IS NULL;

