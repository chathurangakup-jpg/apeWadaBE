const normalizeString = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();

  return trimmed === "" ? undefined : trimmed;
};

const validateUuid = (value) => {
  if (!value) {
    throw new Error("INVALID_USER_ID");
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(value)) {
    throw new Error("INVALID_USER_ID");
  }

  return value;
};

const validateGetDataQuery = (query = {}) => {
  if (Object.keys(query).length > 0) {
    throw new Error("getData does not accept query parameters");
  }
};

/**
 * Validate PATCH /api/users/me
 *
 * Only these fields can be updated:
 * - name
 * - phone
 * - preferredLanguage
 */
const validateUpdateUserPayload = (body = {}) => {
  const allowedFields = ["name", "phone", "preferredLanguage"];

  const providedFields = Object.keys(body);

  if (providedFields.length === 0) {
    throw new Error("At least one field is required");
  }

  const invalidFields = providedFields.filter(
    (field) => !allowedFields.includes(field),
  );

  if (invalidFields.length > 0) {
    throw new Error(
      `The following fields cannot be updated: ${invalidFields.join(", ")}`,
    );
  }

  const payload = {};

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = normalizeString(body.name);

    if (!name) {
      throw new Error("name is required");
    }

    if (name.length < 2 || name.length > 100) {
      throw new Error("name must be between 2 and 100 characters");
    }

    payload.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    const phone = normalizeString(body.phone);

    if (!phone) {
      throw new Error("phone is required");
    }

    payload.phone = normalizePhone(phone);
  }

  if (Object.prototype.hasOwnProperty.call(body, "preferredLanguage")) {
    payload.preferredLanguage = normalizePreferredLanguage(
      body.preferredLanguage,
    );
  }

  return payload;
};

/**
 * Customer profile
 */
const validateCustomerProfilePayload = (body = {}) => {
  const allowedFields = ["address", "district", "city", "venue"];

  const providedFields = Object.keys(body);

  if (providedFields.length === 0) {
    throw new Error("At least one field is required");
  }

  const invalidFields = providedFields.filter(
    (field) => !allowedFields.includes(field),
  );

  if (invalidFields.length > 0) {
    throw new Error(
      `The following fields cannot be updated: ${invalidFields.join(", ")}`,
    );
  }

  const payload = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      const value = normalizeString(body[field]);

      if (!value) {
        throw new Error(`${field} is required`);
      }

      if (value.length > 255) {
        throw new Error(`${field} must be less than 255 characters`);
      }

      payload[field] = value;
    }
  }

  return payload;
};

/**
 * Worker profile
 */
const validateWorkerProfilePayload = (body = {}) => {
  const allowedFields = [
    "bio",
    "experienceYears",
    "educationSummary",
    "district",
    "city",
    "venue",
    "categoryIds",
    "experiences",
    "education",
    "portfolio",
  ];

  const providedFields = Object.keys(body);

  if (providedFields.length === 0) {
    throw new Error("At least one field is required");
  }

  const invalidFields = providedFields.filter(
    (field) => !allowedFields.includes(field),
  );

  if (invalidFields.length > 0) {
    throw new Error(
      `The following fields cannot be updated: ${invalidFields.join(", ")}`,
    );
  }

  const payload = {};

  if (Object.prototype.hasOwnProperty.call(body, "categoryIds")) {
    if (
      !Array.isArray(body.categoryIds) ||
      body.categoryIds.some(
        (id) =>
          typeof id !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            id,
          ),
      )
    ) {
      throw new Error("categoryIds must be an array of valid category UUIDs");
    }

    payload.categoryIds = [...new Set(body.categoryIds)];
  }

  const validateRecords = (key, allowedFields, requiredFields = []) => {
    if (!Object.prototype.hasOwnProperty.call(body, key)) {
      return;
    }

    if (!Array.isArray(body[key]) || body[key].length > 100) {
      throw new Error(`${key} must be an array with no more than 100 entries`);
    }

    payload[key] = body[key].map((record, index) => {
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        throw new Error(`${key}[${index}] must be an object`);
      }

      const invalidRecordFields = Object.keys(record).filter(
        (field) => !allowedFields.includes(field),
      );
      if (invalidRecordFields.length > 0) {
        throw new Error(
          `${key}[${index}] contains unsupported fields: ${invalidRecordFields.join(", ")}`,
        );
      }

      const normalizedRecord = {};
      for (const field of allowedFields) {
        if (!Object.prototype.hasOwnProperty.call(record, field)) {
          if (requiredFields.includes(field)) {
            throw new Error(`${key}[${index}].${field} is required`);
          }
          normalizedRecord[field] = null;
          continue;
        }

        if (["startDate", "endDate", "completedAt"].includes(field)) {
          normalizedRecord[field] = normalizeDate(
            record[field],
            `${key}[${index}].${field}`,
          );
        } else if (field === "isCurrent") {
          if (typeof record[field] !== "boolean") {
            throw new Error(`${key}[${index}].isCurrent must be a boolean`);
          }
          normalizedRecord[field] = record[field];
        } else {
          const value = record[field];
          if (value === null && !requiredFields.includes(field)) {
            normalizedRecord[field] = null;
            continue;
          }
          if (typeof value !== "string") {
            throw new Error(`${key}[${index}].${field} must be a string`);
          }
          const normalized = value.trim();
          if (!normalized && requiredFields.includes(field)) {
            throw new Error(`${key}[${index}].${field} is required`);
          }
          const maxLength =
            field === "companyName" || field === "jobTitle" || field === "title"
              ? 150
              : field === "institution" || field === "qualification"
                ? 200
                : null;
          if (maxLength && normalized.length > maxLength) {
            throw new Error(
              `${key}[${index}].${field} must be at most ${maxLength} characters`,
            );
          }
          normalizedRecord[field] = normalized || null;
        }
      }

      return normalizedRecord;
    });
  };

  validateRecords("experiences", [
    "companyName",
    "jobTitle",
    "description",
    "startDate",
    "endDate",
    "isCurrent",
  ]);
  validateRecords("education", [
    "institution",
    "qualification",
    "description",
    "startDate",
    "endDate",
  ]);
  validateRecords(
    "portfolio",
    ["title", "description", "completedAt"],
    ["title"],
  );

  if (Object.prototype.hasOwnProperty.call(body, "bio")) {
    const bio = normalizeString(body.bio);

    if (!bio) {
      throw new Error("bio is required");
    }

    if (bio.length > 2000) {
      throw new Error("bio must be less than 2000 characters");
    }

    payload.bio = bio;
  }

  if (Object.prototype.hasOwnProperty.call(body, "experienceYears")) {
    const experienceYears = Number(body.experienceYears);

    if (
      !Number.isInteger(experienceYears) ||
      experienceYears < 0 ||
      experienceYears > 70
    ) {
      throw new Error(
        "experienceYears must be a whole number between 0 and 70",
      );
    }

    payload.experienceYears = experienceYears;
  }

  if (Object.prototype.hasOwnProperty.call(body, "educationSummary")) {
    const educationSummary = normalizeString(body.educationSummary);

    if (!educationSummary) {
      throw new Error("educationSummary is required");
    }

    if (educationSummary.length > 1000) {
      throw new Error("educationSummary must be less than 1000 characters");
    }

    payload.educationSummary = educationSummary;
  }

  for (const field of ["district", "city", "venue"]) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      const value = normalizeString(body[field]);

      if (!value) {
        throw new Error(`${field} is required`);
      }

      if (value.length > 255) {
        throw new Error(`${field} must be less than 255 characters`);
      }

      payload[field] = value;
    }
  }

  return payload;
};

const normalizeDate = (value, field) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must use YYYY-MM-DD format`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${field} must be a valid date`);
  }

  return value;
};

/**
 * Change password
 */
const validateChangePasswordPayload = (body = {}) => {
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    throw new Error("currentPassword and newPassword are required");
  }

  if (String(newPassword).length < 8) {
    throw new Error("newPassword must be at least 8 characters");
  }

  if (String(newPassword).length > 100) {
    throw new Error("newPassword must be less than 100 characters");
  }

  if (currentPassword === newPassword) {
    throw new Error("newPassword must be different from currentPassword");
  }

  return {
    currentPassword: String(currentPassword),
    newPassword: String(newPassword),
  };
};

/**
 * Normalize phone
 */
const normalizePhone = (value) => {
  const cleaned = String(value).trim();

  if (!/^(?:\+94|94|0)[0-9]{9}$/.test(cleaned)) {
    throw new Error("INVALID_PHONE");
  }

  if (cleaned.startsWith("0")) {
    return `+94${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith("94")) {
    return `+${cleaned}`;
  }

  return cleaned;
};

/**
 * Normalize language
 */
const normalizePreferredLanguage = (value) => {
  const language = String(value || "")
    .trim()
    .toUpperCase();

  if (!["EN", "SI"].includes(language)) {
    throw new Error("INVALID_LANGUAGE");
  }

  return language;
};

module.exports = {
  validateGetDataQuery,
  validateUuid,
  validateUpdateUserPayload,
  validateCustomerProfilePayload,
  validateWorkerProfilePayload,
  validateChangePasswordPayload,
  normalizePhone,
  normalizePreferredLanguage,
};
