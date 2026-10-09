const pool = require("../config/db");

const sendExpoPush = async (tokens, notification) => {
  if (!tokens.length || typeof globalThis.fetch !== "function") {
    return;
  }

  const pushMessages = tokens.map((token) => ({
    to: token.token,
    sound: "default",
    title: notification.title,
    body: notification.message,
    data: notification.data || {},
  }));
  const accessToken = process.env.EXPO_ACCESS_TOKEN;

  try {
    for (let offset = 0; offset < pushMessages.length; offset += 100) {
      const response = await globalThis.fetch(
        "https://exp.host/--/api/v2/push/send",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(pushMessages.slice(offset, offset + 100)),
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) {
        console.error("Expo push request failed with status", response.status);
        continue;
      }

      const result = await response.json();
      const tickets = result.data || [];
      const invalidTokens = [];
      tickets.forEach((ticket, index) => {
        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
        ) {
          const token = tokens[offset + index]?.token;
          if (token) invalidTokens.push(token);
        }
      });
      if (invalidTokens.length > 0) {
        await pool.query(
          `UPDATE push_tokens SET is_active = FALSE, updated_at = NOW() WHERE token = ANY($1::text[])`,
          [invalidTokens],
        );
      }
    }
  } catch (error) {
    console.error("Expo push delivery failed:", error.message);
  }
};

const notifyUser = async ({ userId, type, title, message, data = null }) => {
  try {
    const result = await pool.query(
      `
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT id, $2, $3, $4, $5::jsonb
        FROM users
        WHERE id = $1 AND is_active = TRUE
        RETURNING id, user_id AS "userId", type, title, message, data,
          is_read AS "isRead", created_at AS "createdAt"
      `,
      [
        userId,
        type,
        title,
        message,
        data === null ? null : JSON.stringify(data),
      ],
    );
    const notification = result.rows[0];
    if (!notification) return null;

    const tokensResult = await pool.query(
      `SELECT token FROM push_tokens WHERE user_id = $1 AND is_active = TRUE`,
      [userId],
    );
    await sendExpoPush(tokensResult.rows, notification);
    return notification;
  } catch (error) {
    console.error("Notification creation failed:", error.message);
    return null;
  }
};

const listNotifications = async (userId, { limit, unreadOnly, before }) => {
  const result = await pool.query(
    `
      SELECT id, user_id AS "userId", type, title, message, data,
        is_read AS "isRead", created_at AS "createdAt"
      FROM notifications
      WHERE user_id = $1
        AND ($2::boolean = FALSE OR is_read = FALSE)
        AND ($3::timestamptz IS NULL OR created_at < $3::timestamptz)
      ORDER BY created_at DESC, id DESC
      LIMIT $4
    `,
    [userId, unreadOnly, before, limit],
  );
  return result.rows;
};

const markNotificationRead = async (userId, notificationId) => {
  const result = await pool.query(
    `
      UPDATE notifications SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING id, is_read AS "isRead"
    `,
    [notificationId, userId],
  );
  return result.rows[0] || null;
};

const markAllNotificationsRead = async (userId) => {
  const result = await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId],
  );
  return result.rowCount;
};

const registerPushToken = async (userId, { token, platform }) => {
  const result = await pool.query(
    `
      INSERT INTO push_tokens (user_id, token, platform, is_active, last_used_at)
      VALUES ($1, $2, $3, TRUE, NOW())
      ON CONFLICT (token) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        is_active = TRUE,
        last_used_at = NOW(),
        updated_at = NOW()
      RETURNING id, user_id AS "userId", token, platform, is_active AS "isActive",
        last_used_at AS "lastUsedAt", created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [userId, token, platform],
  );
  return result.rows[0];
};

const deactivatePushToken = async (userId, token) => {
  const result = await pool.query(
    `
      UPDATE push_tokens SET is_active = FALSE, updated_at = NOW()
      WHERE user_id = $1 AND token = $2
      RETURNING id, is_active AS "isActive"
    `,
    [userId, token],
  );
  return result.rows[0] || null;
};

module.exports = {
  notifyUser,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  registerPushToken,
  deactivatePushToken,
};
