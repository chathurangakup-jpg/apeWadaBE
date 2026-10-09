const pool = require("../config/db");

const createConversation = async (userId, { jobId, participantId }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const currentUserResult = await client.query(
      `SELECT id, role, is_active FROM users WHERE id = $1 FOR SHARE`,
      [userId],
    );
    const currentUser = currentUserResult.rows[0];
    if (!currentUser || !currentUser.is_active) {
      const error = new Error("Active account required");
      error.code = "ACTIVE_ACCOUNT_REQUIRED";
      throw error;
    }

    let customerId;
    let workerId;
    if (currentUser.role === "CUSTOMER") {
      customerId = userId;
      workerId = participantId;
    } else if (currentUser.role === "WORKER") {
      customerId = participantId;
      workerId = userId;
    } else {
      const error = new Error("Only customers and workers can chat");
      error.code = "CHAT_ROLE_NOT_ALLOWED";
      throw error;
    }

    const relationshipResult = jobId
      ? await client.query(
          `
            SELECT j.id
            FROM jobs j
            JOIN users customer ON customer.id = j.customer_id
            JOIN users worker ON worker.id = $2
            JOIN worker_profiles wp ON wp.user_id = worker.id
            WHERE j.id = $1
              AND j.customer_id = $3
              AND customer.is_active = TRUE
              AND customer.role = 'CUSTOMER'
              AND worker.role = 'WORKER'
              AND worker.is_active = TRUE
              AND wp.approval_status = 'APPROVED'
              AND j.status IN ('OPEN', 'WORKER_SELECTED', 'SCHEDULED', 'IN_PROGRESS')
          `,
          [jobId, workerId, customerId],
        )
      : await client.query(
          `
            SELECT customer.id
            FROM users customer
            JOIN users worker ON worker.id = $2
            JOIN worker_profiles wp ON wp.user_id = worker.id
            WHERE customer.id = $1
              AND customer.role = 'CUSTOMER'
              AND customer.is_active = TRUE
              AND worker.role = 'WORKER'
              AND worker.is_active = TRUE
              AND wp.approval_status = 'APPROVED'
          `,
          [customerId, workerId],
        );
    if (relationshipResult.rowCount === 0) {
      const error = new Error(
        "Chat requires an active customer and an active, approved worker; jobId must belong to that customer when provided",
      );
      error.code = "CHAT_PARTICIPANTS_NOT_ELIGIBLE";
      throw error;
    }

    const conversationResult = jobId
      ? await client.query(
          `
            INSERT INTO conversations (job_id, customer_id, worker_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (job_id, customer_id, worker_id)
            DO UPDATE SET updated_at = conversations.updated_at
            RETURNING id, job_id AS "jobId", customer_id AS "customerId",
              worker_id AS "workerId", created_at AS "createdAt",
              updated_at AS "updatedAt"
          `,
          [jobId, customerId, workerId],
        )
      : await client.query(
          `
            INSERT INTO conversations (job_id, customer_id, worker_id)
            VALUES (NULL, $1, $2)
            ON CONFLICT (customer_id, worker_id) WHERE job_id IS NULL
            DO UPDATE SET updated_at = conversations.updated_at
            RETURNING id, job_id AS "jobId", customer_id AS "customerId",
              worker_id AS "workerId", created_at AS "createdAt",
              updated_at AS "updatedAt"
          `,
          [customerId, workerId],
        );
    const conversation = conversationResult.rows[0];

    await client.query(
      `
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES ($1, $2), ($1, $3)
        ON CONFLICT (conversation_id, user_id) DO NOTHING
      `,
      [conversation.id, customerId, workerId],
    );

    await client.query("COMMIT");
    return conversation;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const listConversations = async (userId) => {
  const result = await pool.query(
    `
      SELECT c.id, c.job_id AS "jobId", j.title AS "jobTitle",
        c.customer_id AS "customerId", c.worker_id AS "workerId",
        other.id AS "participantId", other.name AS "participantName",
        other.role AS "participantRole", other.avatar_path AS "participantAvatarPath",
        c.created_at AS "createdAt", c.updated_at AS "updatedAt",
        latest.content AS "lastMessage", latest.sent_at AS "lastMessageAt",
        COALESCE(unread.count, 0)::INTEGER AS "unreadCount"
      FROM conversation_participants cp
      JOIN conversations c ON c.id = cp.conversation_id
      LEFT JOIN jobs j ON j.id = c.job_id
      JOIN users other ON other.id = CASE
        WHEN c.customer_id = $1 THEN c.worker_id
        ELSE c.customer_id
      END
      LEFT JOIN LATERAL (
        SELECT m.content, m.sent_at
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.sent_at DESC, m.id DESC
        LIMIT 1
      ) latest ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS count
        FROM messages m
        WHERE m.conversation_id = c.id
          AND m.sender_id <> $1
          AND m.read_at IS NULL
      ) unread ON TRUE
      WHERE cp.user_id = $1
      ORDER BY COALESCE(latest.sent_at, c.updated_at) DESC
    `,
    [userId],
  );
  return result.rows;
};

const getConversationMessages = async (
  userId,
  conversationId,
  { limit, before },
) => {
  const participantResult = await pool.query(
    `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId],
  );
  if (participantResult.rowCount === 0) return null;

  const result = await pool.query(
    `
      SELECT m.id, m.conversation_id AS "conversationId",
        m.sender_id AS "senderId", u.name AS "senderName",
        u.role AS "senderRole", m.message_type AS "messageType",
        m.content, m.sent_at AS "sentAt", m.read_at AS "readAt"
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = $1
        AND ($2::timestamptz IS NULL OR m.sent_at < $2::timestamptz)
      ORDER BY m.sent_at DESC, m.id DESC
      LIMIT $3
    `,
    [conversationId, before, limit],
  );
  return result.rows.reverse();
};

const sendTextMessage = async (userId, conversationId, content) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const participantResult = await client.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 FOR SHARE`,
      [conversationId, userId],
    );
    if (participantResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const result = await client.query(
      `
        INSERT INTO messages (conversation_id, sender_id, message_type, content)
        VALUES ($1, $2, 'TEXT', $3)
        RETURNING id, conversation_id AS "conversationId",
          sender_id AS "senderId", message_type AS "messageType",
          content, sent_at AS "sentAt", read_at AS "readAt"
      `,
      [conversationId, userId, content],
    );
    await client.query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [conversationId],
    );
    await client.query(
      `UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId],
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const markConversationRead = async (userId, conversationId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const participantResult = await client.query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 FOR UPDATE`,
      [conversationId, userId],
    );
    if (participantResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    await client.query(
      `UPDATE messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
      [conversationId, userId],
    );
    await client.query(
      `UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getConversationParticipants = async (conversationId) => {
  const result = await pool.query(
    `SELECT customer_id, worker_id
     FROM conversations
     WHERE id = $1`,
    [conversationId],
  );
  if (result.rowCount === 0) return null;
  const { customer_id, worker_id } = result.rows[0];
  return { participantIds: [customer_id, worker_id] };
};

module.exports = {
  createConversation,
  listConversations,
  getConversationMessages,
  sendTextMessage,
  markConversationRead,
  getConversationParticipants, // 👈 add
};
