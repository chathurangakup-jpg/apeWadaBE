const express = require("express");
const { auth } = require("../middleware/auth");
const {
  getAllJobs,
  postJob,
  patchJob,
  deleteJob,
  getJobRequests,
  postBookingRequest,
  cancelCustomerBookingRequest,
  postWorkerReview,
} = require("../controllers/customer.controller");

const router = express.Router();

const requireCustomer = (req, res, next) => {
  if (req.user?.role !== "CUSTOMER") {
    return res.status(403).json({
      success: false,
      message: "Customer access is required",
    });
  }
  return next();
};

router.use(auth);
router.get("/getAllJobs", getAllJobs);
router.use(requireCustomer);
router.post("/jobs", postJob);
router.patch("/jobs/:id", patchJob);
router.delete("/jobs/:id", deleteJob);
router.get("/jobs/:id/requests", getJobRequests);
router.post("/bookings", postBookingRequest);
router.patch("/bookings/:bookingId/cancel", cancelCustomerBookingRequest);
router.post("/bookings/:bookingId/review", postWorkerReview);

module.exports = router;
