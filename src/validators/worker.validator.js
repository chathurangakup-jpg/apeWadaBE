const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const validateBookingId = (id) => {
  if (!UUID_PATTERN.test(String(id || ""))) {
    throw validationError("A valid booking ID is required");
  }
  return id;
};

const validateDate = (value, field) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw validationError(`${field} must use YYYY-MM-DD format`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw validationError(`${field} must be a valid date`);
  }
  return value;
};

const validateJobRequestPayload = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }
  const allowedFields = ["proposedBudget", "message", "proposedDate"];
  const invalidFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  );
  if (invalidFields.length > 0) {
    throw validationError(`Unsupported fields: ${invalidFields.join(", ")}`);
  }

  const proposedBudget = Number(body.proposedBudget);
  if (
    body.proposedBudget === undefined ||
    !Number.isFinite(proposedBudget) ||
    proposedBudget <= 0 ||
    Math.round(proposedBudget * 100) !== proposedBudget * 100
  ) {
    throw validationError(
      "proposedBudget must be a positive amount with up to 2 decimals",
    );
  }

  if (
    body.message !== undefined &&
    body.message !== null &&
    (typeof body.message !== "string" || body.message.length > 3000)
  ) {
    throw validationError("message must be a string up to 3000 characters");
  }

  return {
    proposedBudget,
    message:
      typeof body.message === "string" ? body.message.trim() || null : null,
    proposedDate:
      body.proposedDate === undefined || body.proposedDate === null
        ? null
        : validateDate(body.proposedDate, "proposedDate"),
  };
};

const validateBookingDecisionPayload = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }
  const allowedFields = ["decision", "scheduledDate", "startTime", "endTime"];
  const invalidFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  );
  if (invalidFields.length > 0) {
    throw validationError(`Unsupported fields: ${invalidFields.join(", ")}`);
  }
  if (!["ACCEPT", "REJECT"].includes(body.decision)) {
    throw validationError("decision must be ACCEPT or REJECT");
  }

  if (body.decision === "REJECT") {
    if (Object.keys(body).some((field) => field !== "decision")) {
      throw validationError(
        "Only decision is allowed when rejecting a request",
      );
    }
    return { decision: body.decision };
  }

  const payload = { decision: body.decision };
  if (body.scheduledDate !== undefined) {
    payload.scheduledDate = validateDate(body.scheduledDate, "scheduledDate");
  }
  for (const field of ["startTime", "endTime"]) {
    if (body[field] !== undefined && body[field] !== null) {
      if (
        typeof body[field] !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(body[field])
      ) {
        throw validationError(`${field} must use HH:MM or HH:MM:SS format`);
      }
      payload[field] = body[field];
    } else if (body[field] === null) {
      payload[field] = null;
    }
  }
  if ((payload.startTime === undefined) !== (payload.endTime === undefined)) {
    throw validationError("startTime and endTime must be provided together");
  }
  return payload;
};

const validateBookingWorkStatusPayload = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }
  if (
    Object.keys(body).length !== 1 ||
    !["IN_PROGRESS", "COMPLETED"].includes(body.status)
  ) {
    throw validationError("status must be IN_PROGRESS or COMPLETED");
  }
  return { status: body.status };
};

const validateAvailabilityPayload = (body = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }
  if (Object.keys(body).length !== 1 || !Array.isArray(body.availability)) {
    throw validationError("availability must be an array");
  }
  if (body.availability.length === 0 || body.availability.length > 100) {
    throw validationError("availability must contain between 1 and 100 dates");
  }

  return body.availability.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw validationError(`availability[${index}] must be an object`);
    }
    const allowedFields = [
      "availabilityDate",
      "startTime",
      "endTime",
      "status",
    ];
    const unknownFields = Object.keys(entry).filter(
      (field) => !allowedFields.includes(field),
    );
    if (unknownFields.length > 0) {
      throw validationError(
        `availability[${index}] contains unsupported fields: ${unknownFields.join(", ")}`,
      );
    }

    const normalized = {
      availabilityDate: validateDate(
        entry.availabilityDate,
        `availability[${index}].availabilityDate`,
      ),
      status: String(entry.status || "").toUpperCase(),
    };
    if (!["AVAILABLE", "UNAVAILABLE"].includes(normalized.status)) {
      throw validationError(
        `availability[${index}].status must be AVAILABLE or UNAVAILABLE`,
      );
    }

    for (const field of ["startTime", "endTime"]) {
      if (entry[field] !== undefined && entry[field] !== null) {
        if (
          typeof entry[field] !== "string" ||
          !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(entry[field])
        ) {
          throw validationError(
            `availability[${index}].${field} must use HH:MM or HH:MM:SS format`,
          );
        }
        normalized[field] = entry[field];
      } else {
        normalized[field] = null;
      }
    }
    if ((normalized.startTime === null) !== (normalized.endTime === null)) {
      throw validationError(
        `availability[${index}] must provide both startTime and endTime`,
      );
    }
    if (
      normalized.startTime &&
      normalized.endTime &&
      normalized.startTime >= normalized.endTime
    ) {
      throw validationError(
        `availability[${index}].endTime must be later than startTime`,
      );
    }
    return normalized;
  });
};

module.exports = {
  validateJobId,
  validateBookingId,
  validateJobRequestPayload,
  validateBookingDecisionPayload,
  validateBookingWorkStatusPayload,
  validateAvailabilityPayload,
};
