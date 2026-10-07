const validateCancellationPayload = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    const error = new Error("Request body must be a JSON object");
    error.name = "ValidationError";
    throw error;
  }

  const fields = Object.keys(body);
  if (fields.length !== 1 || fields[0] !== "reason") {
    const error = new Error("Only reason can be provided");
    error.name = "ValidationError";
    throw error;
  }

  if (typeof body.reason !== "string" || body.reason.trim().length === 0) {
    const error = new Error("reason is required");
    error.name = "ValidationError";
    throw error;
  }
  if (body.reason.trim().length > 2000) {
    const error = new Error("reason must be at most 2000 characters");
    error.name = "ValidationError";
    throw error;
  }

  return { reason: body.reason.trim() };
};

module.exports = { validateCancellationPayload };
