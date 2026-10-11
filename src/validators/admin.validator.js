const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORY_FIELDS = ["nameEn", "nameSi", "slug", "icon", "isActive"];
const ADMIN_USER_FIELDS = [
  "name",
  "email",
  "phone",
  "preferredLanguage",
  "isActive",
  "address",
  "district",
  "city",
  "venue",
  "bio",
  "experienceYears",
  "educationSummary",
];

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

const validateAdminUsersQuery = (query = {}) => {
  const invalidFields = Object.keys(query).filter((field) => field !== "role");
  if (invalidFields.length > 0) {
    throw validationError(
      `Unsupported query parameters: ${invalidFields.join(", ")}`,
    );
  }
  if (query.role === undefined) return null;
  if (
    typeof query.role !== "string" ||
    !["CUSTOMER", "WORKER"].includes(query.role.toUpperCase())
  ) {
    throw validationError("role must be CUSTOMER or WORKER");
  }
  return query.role.toUpperCase();
};

const validateAdminUserPayload = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }
  const providedFields = Object.keys(body);
  if (providedFields.length === 0) {
    throw validationError("At least one user field is required");
  }
  const invalidFields = providedFields.filter(
    (field) => !ADMIN_USER_FIELDS.includes(field),
  );
  if (invalidFields.length > 0) {
    throw validationError(
      `Unsupported user fields: ${invalidFields.join(", ")}`,
    );
  }

  const payload = {};
  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    if (
      typeof body.name !== "string" ||
      body.name.trim().length < 2 ||
      body.name.trim().length > 100
    ) {
      throw validationError("name must be between 2 and 100 characters");
    }
    payload.name = body.name.trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, "email")) {
    if (
      typeof body.email !== "string" ||
      body.email.trim().length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    ) {
      throw validationError("email must be a valid email address");
    }
    payload.email = body.email.trim().toLowerCase();
  }
  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    if (
      body.phone !== null &&
      (typeof body.phone !== "string" ||
        body.phone.trim().length === 0 ||
        body.phone.trim().length > 20)
    ) {
      throw validationError(
        "phone must be a non-empty string up to 20 characters or null",
      );
    }
    payload.phone = body.phone === null ? null : body.phone.trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, "preferredLanguage")) {
    if (!["EN", "SI"].includes(body.preferredLanguage)) {
      throw validationError("preferredLanguage must be EN or SI");
    }
    payload.preferredLanguage = body.preferredLanguage;
  }
  if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
    if (typeof body.isActive !== "boolean") {
      throw validationError("isActive must be a boolean");
    }
    payload.isActive = body.isActive;
  }

  const stringFields = {
    address: 2000,
    district: 100,
    city: 100,
    venue: 2000,
    bio: 5000,
    educationSummary: 3000,
  };
  for (const [field, maxLength] of Object.entries(stringFields)) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
    const value = body[field];
    if (
      value !== null &&
      (typeof value !== "string" || value.trim().length > maxLength)
    ) {
      throw validationError(
        `${field} must be a string up to ${maxLength} characters or null`,
      );
    }
    payload[field] = value === null ? null : value.trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, "experienceYears")) {
    const value = body.experienceYears;
    if (
      value !== null &&
      (!Number.isInteger(value) || value < 0 || value > 100)
    ) {
      throw validationError(
        "experienceYears must be an integer from 0 to 100 or null",
      );
    }
    payload.experienceYears = value;
  }
  return payload;
};

module.exports = {
  validateCategoryId,
  validateCategoryPayload,
  validateAdminEntityId,
  validateApprovalPayload,
  validateAdminUsersQuery,
  validateAdminUserPayload,
};
