const express = require("express");
const { auth } = require("../middleware/auth");
const {
  getAllWorkers,
  postJobRequest,
  getBookingRequests,
  patchBookingRequest,
  getAvailability,
  postAvailability,
  patchAvailabilityStatus,
  cancelWorkerBooking,
  patchBookingWorkStatus,
} = require("../controllers/worker.controller");

const router = express.Router();

const requireWorker = (req, res, next) => {
  if (req.user?.role !== "WORKER") {
    return res.status(403).json({
      success: false,
      message: "Worker access is required",
    });
  }
  return next();
};

router.use(auth);
router.get("/getAllWorkers", getAllWorkers);
router.use(requireWorker);
router.post("/jobs/:jobId/requests", postJobRequest);
router.get("/booking-requests", getBookingRequests);
router.patch("/bookings/:bookingId/respond", patchBookingRequest);
router.patch("/bookings/:bookingId/status", patchBookingWorkStatus);
router.patch("/bookings/:bookingId/cancel", cancelWorkerBooking);
router.get("/availability", getAvailability);
router.post("/availability", postAvailability);
router.patch("/availability-status", patchAvailabilityStatus);

module.exports = router;
