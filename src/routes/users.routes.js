const express = require("express");

const {
  getData,
  getMe,
  updateMe,
  updateMyCustomerProfile,
  updateMyWorkerProfile,
  changeMyPassword,
  deactivateMyAccount,
} = require("../controllers/user.controller");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Public dashboard data must be registered before authentication middleware.
router.get("/getData", getData);

/**
 * All user routes require authentication
 */
router.use(auth);
/**
 * Current user
 */
router.get("/me", getMe);

/**
 * Update account information
 */
router.patch("/me", updateMe);

/**
 * Update customer profile
 */
router.patch("/me/customer-profile", updateMyCustomerProfile);

/**
 * Update worker profile
 */
router.patch("/me/worker-profile", updateMyWorkerProfile);

/**
 * Change password
 */
router.patch("/me/password", changeMyPassword);

/**
 * Deactivate account
 */
router.patch("/me/deactivate", deactivateMyAccount);

module.exports = router;
