const {
  submitJobRequest,
  getBookingRequestsForWorker,
  respondToBookingRequest,
  listWorkerAvailability,
  updateWorkerAvailabilityStatus,
  saveWorkerAvailability,
  cancelBooking,
  updateBookingWorkStatus,
} = require("../services/worker.services");
const {
  validateJobId,
  validateBookingId,
  validateJobRequestPayload,
  validateBookingDecisionPayload,
  validateBookingWorkStatusPayload,
  validateAvailabilityPayload,
  validateAvailabilityStatusPayload,
} = require("../validators/worker.validator");
const {
  validateCancellationPayload,
} = require("../validators/cancellation.validator");

const postJobRequest = async (req, res) => {
  try {
    const jobId = validateJobId(req.params.jobId);
    const payload = validateJobRequestPayload(req.body);
    const result = await submitJobRequest(req.user.sub, jobId, payload);
    if (result.error) {
      const responses = {
        JOB_NOT_FOUND: [404, "Job not found"],
        WORKER_NOT_APPROVED: [403, "Only approved workers can request jobs"],
        OWN_JOB: [403, "Workers cannot request their own jobs"],
        JOB_NOT_OPEN: [409, "Only open jobs can receive requests"],
        REQUEST_ALREADY_EXISTS: [
          409,
          "You already have an active request for this job",
        ],
      };
      const [status, message] = responses[result.error] || [
        500,
        "Could not submit job request",
      ];
      return res.status(status).json({ success: false, message });
    }
    return res.status(201).json({
      success: true,
      message: "Job request submitted successfully",
      data: { request: result },
    });
  } catch (error) {
    return handleWorkerError(error, res, "Failed to submit job request");
  }
};

const getBookingRequests = async (req, res) => {
  try {
    const requests = await getBookingRequestsForWorker(req.user.sub);
    return res.status(200).json({ success: true, data: { requests } });
  } catch (error) {
    return handleWorkerError(error, res, "Failed to load booking requests");
  }
};

const getAvailability = async (req, res) => {
  try {
    const availability = await listWorkerAvailability(req.user.sub);
    return res.status(200).json({ success: true, data: { availability } });
  } catch (error) {
    return handleWorkerError(error, res, "Failed to load worker availability");
  }
};

const postAvailability = async (req, res) => {
  try {
    const entries = validateAvailabilityPayload(req.body);
    const availability = await saveWorkerAvailability(req.user.sub, entries);
    return res.status(201).json({
      success: true,
      message: "Availability saved successfully",
      data: { availability },
    });
  } catch (error) {
    return handleWorkerError(error, res, "Failed to save worker availability");
  }
};

const patchAvailabilityStatus = async (req, res) => {
  try {
    const { availabilityStatus } = validateAvailabilityStatusPayload(req.body);
    const profile = await updateWorkerAvailabilityStatus(
      req.user.sub,
      availabilityStatus,
    );
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Availability status updated successfully",
      data: { availabilityStatus: profile.availabilityStatus },
    });
  } catch (error) {
    return handleWorkerError(
      error,
      res,
      "Failed to update availability status",
    );
  }
};

const patchBookingRequest = async (req, res) => {
  try {
    const bookingId = validateBookingId(req.params.bookingId);
    const payload = validateBookingDecisionPayload(req.body);
    const booking = await respondToBookingRequest(
      req.user.sub,
      bookingId,
      payload,
    );
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking request not found" });
    }
    return res.status(200).json({
      success: true,
      message:
        payload.decision === "ACCEPT"
          ? "Booking request accepted"
          : "Booking request rejected",
      data: { booking },
    });
  } catch (error) {
    return handleWorkerError(
      error,
      res,
      "Failed to respond to booking request",
    );
  }
};

const cancelWorkerBooking = async (req, res) => {
  try {
    const bookingId = validateBookingId(req.params.bookingId);
    const { reason } = validateCancellationPayload(req.body);
    const cancellation = await cancelBooking(req.user.sub, bookingId, reason);
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
    return handleWorkerError(error, res, "Failed to cancel booking");
  }
};

const patchBookingWorkStatus = async (req, res) => {
  try {
    const bookingId = validateBookingId(req.params.bookingId);
    const { status } = validateBookingWorkStatusPayload(req.body);
    const booking = await updateBookingWorkStatus(
      req.user.sub,
      bookingId,
      status,
    );
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: `Booking marked ${status.toLowerCase()}`,
      data: { booking },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === "INVALID_BOOKING_STATUS_TRANSITION") {
      return res.status(409).json({ success: false, message: error.message });
    }
    return handleWorkerError(error, res, "Failed to update booking status");
  }
};

const handleWorkerError = (error, res, fallbackMessage) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (error.code === "BOOKING_NOT_PENDING") {
    return res.status(409).json({ success: false, message: error.message });
  }
  if (error.code === "SCHEDULE_CONFLICT") {
    return res.status(409).json({ success: false, message: error.message });
  }
  if (error.code === "WORKER_UNAVAILABLE") {
    return res.status(409).json({ success: false, message: error.message });
  }
  if (error.code === "BOOKING_NOT_CANCELLABLE") {
    return res.status(409).json({ success: false, message: error.message });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error(`${fallbackMessage}:`, error);
  return res.status(500).json({ success: false, message: fallbackMessage });
};

module.exports = {
  postJobRequest,
  getBookingRequests,
  patchBookingRequest,
  getAvailability,
  postAvailability,
  patchAvailabilityStatus,
  cancelWorkerBooking,
  patchBookingWorkStatus,
};
