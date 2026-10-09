const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORY_FIELDS = ["nameEn", "nameSi", "slug", "icon", "isActive"];

const validationError = (message) => {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
};

const validateCategoryId = (id) => {
  if (!UUID_PATTERN.test(String(id || ""))) {
    throw validationError("INVALID_CATEGORY_ID");
  }

  return id;
};

const validateCategoryPayload = (body = {}, isUpdate = false) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }

  const providedFields = Object.keys(body);
  const invalidFields = providedFields.filter(
    (field) => !CATEGORY_FIELDS.includes(field),
  );

  if (invalidFields.length > 0) {
    throw validationError(
      `Unsupported category fields: ${invalidFields.join(", ")}`,
    );
  }

  if (providedFields.length === 0) {
    throw validationError("At least one category field is required");
  }

  if (!isUpdate && (!body.nameEn || !body.slug)) {
    throw validationError("nameEn and slug are required");
  }

  const payload = {};

  for (const field of ["nameEn", "nameSi", "slug", "icon"]) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      continue;
    }

    const value = body[field];
    if (value === null && ["nameSi", "icon"].includes(field)) {
      payload[field] = null;
      continue;
    }

    if (typeof value !== "string" || value.trim().length === 0) {
      throw validationError(`${field} must be a non-empty string`);
    }

    const normalized = value.trim();
    const maxLength = field === "slug" ? 100 : field === "icon" ? 100 : 100;
    if (normalized.length > maxLength) {
      throw validationError(`${field} must be at most ${maxLength} characters`);
    }

    if (field === "slug" && !SLUG_PATTERN.test(normalized)) {
      throw validationError(
        "slug must contain lowercase letters, numbers, and hyphens",
      );
    }

    payload[field] = normalized;
  }

  if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
    if (typeof body.isActive !== "boolean") {
      throw validationError("isActive must be a boolean");
    }
    payload.isActive = body.isActive;
  }

  return payload;
};

const validateAdminEntityId = (id, field = "id") => {
  if (!UUID_PATTERN.test(String(id || ""))) {
    throw validationError(`${field} must be a valid UUID`);
  }
  return id;
};

const validateApprovalPayload = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }
  const allowedFields = ["decision", "reason"];
  const invalidFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  );
  if (invalidFields.length > 0) {
    throw validationError(`Unsupported fields: ${invalidFields.join(", ")}`);
  }
  const decision = String(body.decision || "").toUpperCase();
  if (!["APPROVE", "REJECT"].includes(decision)) {
    throw validationError("decision must be APPROVE or REJECT");
  }
  if (
    body.reason !== undefined &&
    (typeof body.reason !== "string" || body.reason.trim().length > 1000)
  ) {
    throw validationError("reason must be a string up to 1000 characters");
  }
  return { decision, reason: body.reason?.trim() || null };
};

module.exports = {
  validateCategoryId,
  validateCategoryPayload,
  validateAdminEntityId,
  validateApprovalPayload,
};
