const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXPO_TOKEN_PATTERN = /^(ExpoPushToken|ExponentPushToken)\[[^\]]+\]$/;

const validationError = (message) => {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
};

const validateNotificationId = (id) => {
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    throw validationError("notificationId must be a valid UUID");
  }
  return id;
};

const validateNotificationQuery = (query = {}) => {
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw validationError("limit must be a whole number from 1 to 100");
  }

  let unreadOnly = false;
  if (query.unreadOnly !== undefined) {
    if (!["true", "false"].includes(query.unreadOnly)) {
      throw validationError("unreadOnly must be true or false");
    }
    unreadOnly = query.unreadOnly === "true";
  }

  if (query.before !== undefined && Number.isNaN(Date.parse(query.before))) {
    throw validationError("before must be a valid timestamp");
  }

  return { limit, unreadOnly, before: query.before || null };
};

const validatePushTokenPayload = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }
  const fields = Object.keys(body);
  if (
    fields.length !== 2 ||
    !fields.includes("token") ||
    !fields.includes("platform")
  ) {
    throw validationError("token and platform are required");
  }

  if (
    typeof body.token !== "string" ||
    body.token.length > 512 ||
    !EXPO_TOKEN_PATTERN.test(body.token)
  ) {
    throw validationError("token must be a valid Expo push token");
  }
  const platform = String(body.platform).toUpperCase();
  if (!["IOS", "ANDROID"].includes(platform)) {
    throw validationError("platform must be IOS or ANDROID");
  }
  return { token: body.token, platform };
};

const validatePushTokenRemovalPayload = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }
  const fields = Object.keys(body);
  if (fields.length !== 1 || fields[0] !== "token") {
    throw validationError("Only token can be provided");
  }
  if (
    typeof body.token !== "string" ||
    body.token.length > 512 ||
    !EXPO_TOKEN_PATTERN.test(body.token)
  ) {
    throw validationError("token must be a valid Expo push token");
  }
  return { token: body.token };
};

module.exports = {
  validateNotificationId,
  validateNotificationQuery,
  validatePushTokenPayload,
  validatePushTokenRemovalPayload,
};
