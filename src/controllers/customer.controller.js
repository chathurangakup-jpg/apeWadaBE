const {
  createJob,
  updateJob,
  removeJob,
  listJobRequests,
  createBookingRequest,
  cancelCustomerBooking,
  createWorkerReview,
} = require("../services/customer.services");
const {
  validateJobId,
  validateJobPayload,
  validateBookingPayload,
  validateReviewPayload,
} = require("../validators/customer.validator");
const { validateBookingId } = require("../validators/worker.validator");
const {
  validateCancellationPayload,
} = require("../validators/cancellation.validator");

const postJob = async (req, res) => {
  try {
    const payload = validateJobPayload(req.body);
    const job = await createJob(req.user.sub, payload);
    return res.status(201).json({
      success: true,
      message: "Job created and submitted for approval",
      data: { job },
    });
  } catch (error) {
    return handleJobError(error, res, "Failed to create job");
  }
};

const patchJob = async (req, res) => {
  try {
    const jobId = validateJobId(req.params.id);
    const payload = validateJobPayload(req.body, true);
    const job = await updateJob(req.user.sub, jobId, payload);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: { job },
    });
  } catch (error) {
    return handleJobError(error, res, "Failed to update job");
  }
};

const deleteJob = async (req, res) => {
  try {
    const jobId = validateJobId(req.params.id);
    const result = await removeJob(req.user.sub, jobId);

    if (!result) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Pending job removed successfully",
    });
  } catch (error) {
    return handleJobError(error, res, "Failed to remove job");
  }
};

const getJobRequests = async (req, res) => {
  try {
    const jobId = validateJobId(req.params.id);
    const requests = await listJobRequests(req.user.sub, jobId);
    if (!requests) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    return res.status(200).json({ success: true, data: { requests } });
  } catch (error) {
    return handleJobError(error, res, "Failed to load job requests");
  }
};

const postBookingRequest = async (req, res) => {
  try {
    const payload = validateBookingPayload(req.body);
    const booking = await createBookingRequest(req.user.sub, payload);
    return res.status(201).json({
      success: true,
      message: "Booking request sent to worker",
      data: { booking },
    });
  } catch (error) {
    const statuses = {
      WORKER_NOT_AVAILABLE: 422,
      INVALID_BOOKING_PARTIES: 400,
      JOB_NOT_FOUND: 404,
      JOB_NOT_OPEN: 409,
      JOB_REQUEST_REQUIRED: 409,
      BOOKING_ALREADY_EXISTS: 409,
    };
    if (statuses[error.code]) {
      return res.status(statuses[error.code]).json({
        success: false,
        message: error.message,
      });
    }
    return handleJobError(error, res, "Failed to create booking request");
  }
};

const cancelCustomerBookingRequest = async (req, res) => {
  try {
    const bookingId = validateBookingId(req.params.bookingId);
    const { reason } = validateCancellationPayload(req.body);
    const cancellation = await cancelCustomerBooking(
      req.user.sub,
      bookingId,
      reason,
    );
    if (!cancellation) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: { cancellation },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === "BOOKING_NOT_CANCELLABLE") {
      return res.status(409).json({ success: false, message: error.message });
    }
    console.error("Cancel customer booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
    });
  }
};

const postWorkerReview = async (req, res) => {
  try {
    const bookingId = validateBookingId(req.params.bookingId);
    const payload = validateReviewPayload(req.body);
    const review = await createWorkerReview(req.user.sub, bookingId, payload);
    return res.status(201).json({
      success: true,
      message: "Worker review submitted successfully",
      data: { review },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    const statuses = {
      BOOKING_NOT_FOUND: 404,
      BOOKING_NOT_COMPLETED: 409,
      REVIEW_ALREADY_EXISTS: 409,
    };
    if (statuses[error.code]) {
      return res.status(statuses[error.code]).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Create worker review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit worker review",
    });
  }
};

const handleJobError = (error, res, fallbackMessage) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: error.message });
  }

  if (error.code === "INVALID_CATEGORY") {
    return res.status(422).json({ success: false, message: error.message });
  }

  if (error.code === "JOB_NOT_EDITABLE" || error.code === "JOB_NOT_REMOVABLE") {
    return res.status(409).json({ success: false, message: error.message });
  }

  if (error.code === "CUSTOMER_ACCOUNT_REQUIRED") {
    return res.status(403).json({ success: false, message: error.message });
  }

  console.error(`${fallbackMessage}:`, error);
  return res.status(500).json({ success: false, message: fallbackMessage });
};

module.exports = {
  postJob,
  patchJob,
  deleteJob,
  getJobRequests,
  postBookingRequest,
  cancelCustomerBookingRequest,
  postWorkerReview,
};
