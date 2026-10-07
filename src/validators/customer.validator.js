const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JOB_FIELDS = [
  "title",
  "description",
  "categoryId",
  "district",
  "city",
  "venue",
  "preferredDate",
  "images",
];

const validationError = (message) => {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
};

const validateJobId = (id) => {
  if (!UUID_PATTERN.test(String(id || ""))) {
    throw validationError("A valid job ID is required");
  }
  return id;
};

const validateDate = (value, field) => {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw validationError(`${field} must use YYYY-MM-DD format`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw validationError(`${field} must be a valid date`);
  }

  return value;
};

const validateImages = (images) => {
  if (!Array.isArray(images)) {
    throw validationError("images must be an array");
  }

  return images.map((image, index) => {
    if (!image || typeof image !== "object" || Array.isArray(image)) {
      throw validationError(`images[${index}] must be an object`);
    }

    const allowedFields = [
      "storagePath",
      "originalFilename",
      "mimeType",
      "fileSize",
      "sortOrder",
    ];
    const invalidFields = Object.keys(image).filter(
      (field) => !allowedFields.includes(field),
    );
    if (invalidFields.length > 0) {
      throw validationError(
        `images[${index}] contains unsupported fields: ${invalidFields.join(", ")}`,
      );
    }

    if (
      typeof image.storagePath !== "string" ||
      image.storagePath.trim().length === 0 ||
      image.storagePath.length > 2000
    ) {
      throw validationError(
        `images[${index}].storagePath must be a non-empty string up to 2000 characters`,
      );
    }

    for (const field of ["originalFilename", "mimeType"]) {
      const maxLength = field === "mimeType" ? 100 : 255;
      if (
        image[field] !== undefined &&
        image[field] !== null &&
        (typeof image[field] !== "string" || image[field].length > maxLength)
      ) {
        throw validationError(
          `images[${index}].${field} must be a string up to ${maxLength} characters`,
        );
      }
    }

    const fileSize = image.fileSize ?? null;
    if (
      fileSize !== null &&
      (!Number.isInteger(Number(fileSize)) || Number(fileSize) < 0)
    ) {
      throw validationError(
        `images[${index}].fileSize must be a non-negative integer`,
      );
    }

    const sortOrder = image.sortOrder ?? 0;
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      throw validationError(
        `images[${index}].sortOrder must be a non-negative integer`,
      );
    }

    return {
      storagePath: image.storagePath.trim(),
      originalFilename: image.originalFilename?.trim() || null,
      mimeType: image.mimeType?.trim() || null,
      fileSize: fileSize === null ? null : Number(fileSize),
      sortOrder,
    };
  });
};

const validateJobPayload = (body = {}, isUpdate = false) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }

  const providedFields = Object.keys(body);
  const invalidFields = providedFields.filter(
    (field) => !JOB_FIELDS.includes(field),
  );
  if (invalidFields.length > 0) {
    throw validationError(
      `Unsupported job fields: ${invalidFields.join(", ")}`,
    );
  }
  if (providedFields.length === 0) {
    throw validationError("At least one job field is required");
  }

  if (!isUpdate) {
    for (const field of [
      "title",
      "description",
      "categoryId",
      "district",
      "venue",
    ]) {
      if (body[field] === undefined || body[field] === null) {
        throw validationError(`${field} is required`);
      }
    }
  }

  const payload = {};
  for (const field of ["title", "description", "district", "venue"]) {
    if (body[field] === undefined) {
      continue;
    }
    if (typeof body[field] !== "string" || body[field].trim().length === 0) {
      throw validationError(`${field} must be a non-empty string`);
    }
    const value = body[field].trim();
    const maxLength =
      field === "title" ? 200 : field === "district" ? 100 : null;
    if (maxLength && value.length > maxLength) {
      throw validationError(`${field} must be at most ${maxLength} characters`);
    }
    payload[field] = value;
  }

  if (body.categoryId !== undefined) {
    if (
      typeof body.categoryId !== "string" ||
      !UUID_PATTERN.test(body.categoryId)
    ) {
      throw validationError("categoryId must be a valid UUID");
    }
    payload.categoryId = body.categoryId;
  }

  if (Object.prototype.hasOwnProperty.call(body, "city")) {
    if (body.city !== null && typeof body.city !== "string") {
      throw validationError("city must be a string or null");
    }
    payload.city = body.city === null ? null : body.city.trim() || null;
    if (payload.city && payload.city.length > 100) {
      throw validationError("city must be at most 100 characters");
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "preferredDate")) {
    payload.preferredDate = validateDate(body.preferredDate, "preferredDate");
  }

  if (Object.prototype.hasOwnProperty.call(body, "images")) {
    payload.images = validateImages(body.images);
  }

  return payload;
};

const validateBookingPayload = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }

  const allowedFields = [
    "workerId",
    "jobId",
    "scheduledDate",
    "startTime",
    "endTime",
  ];
  const invalidFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  );
  if (invalidFields.length > 0) {
    throw validationError(`Unsupported fields: ${invalidFields.join(", ")}`);
  }

  if (typeof body.workerId !== "string" || !UUID_PATTERN.test(body.workerId)) {
    throw validationError("workerId must be a valid UUID");
  }
  if (
    body.jobId !== undefined &&
    body.jobId !== null &&
    (typeof body.jobId !== "string" || !UUID_PATTERN.test(body.jobId))
  ) {
    throw validationError("jobId must be a valid UUID or null");
  }

  const payload = {
    workerId: body.workerId,
    jobId: body.jobId ?? null,
    scheduledDate: validateDate(body.scheduledDate, "scheduledDate"),
  };
  for (const field of ["startTime", "endTime"]) {
    if (body[field] !== undefined && body[field] !== null) {
      if (
        typeof body[field] !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(body[field])
      ) {
        throw validationError(`${field} must use HH:MM or HH:MM:SS format`);
      }
      payload[field] = body[field];
    } else {
      payload[field] = null;
    }
  }
  if ((payload.startTime === null) !== (payload.endTime === null)) {
    throw validationError("startTime and endTime must be provided together");
  }
  if (
    payload.startTime &&
    payload.endTime &&
    payload.startTime >= payload.endTime
  ) {
    throw validationError("endTime must be later than startTime");
  }

  return payload;
};

module.exports = { validateJobId, validateJobPayload, validateBookingPayload };
