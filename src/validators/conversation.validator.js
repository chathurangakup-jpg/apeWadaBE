const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validationError = (message) => {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
};

const validateUuid = (value, field) => {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw validationError(`${field} must be a valid UUID`);
  }
  return value;
};

const validateCreateConversationPayload = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }
  const allowedFields = ["jobId", "participantId"];
  const invalidFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  );
  if (invalidFields.length > 0) {
    throw validationError(`Unsupported fields: ${invalidFields.join(", ")}`);
  }
  return {
    jobId:
      body.jobId === undefined || body.jobId === null || body.jobId === ""
        ? null
        : validateUuid(body.jobId, "jobId"),
    participantId: validateUuid(body.participantId, "participantId"),
  };
};

const validateConversationId = (value) => validateUuid(value, "conversationId");

const validateMessagePayload = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "content") {
    throw validationError("Only text content is supported");
  }
  if (typeof body.content !== "string" || body.content.trim().length === 0) {
    throw validationError("content is required");
  }
  if (body.content.trim().length > 5000) {
    throw validationError("content must be at most 5000 characters");
  }
  return { content: body.content.trim() };
};

const validateMessageQuery = (query = {}) => {
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw validationError("limit must be a whole number from 1 to 100");
  }
  if (query.before !== undefined && Number.isNaN(Date.parse(query.before))) {
    throw validationError("before must be a valid timestamp");
  }
  return { limit, before: query.before || null };
};

module.exports = {
  validateCreateConversationPayload,
  validateConversationId,
  validateMessagePayload,
  validateMessageQuery,
};
