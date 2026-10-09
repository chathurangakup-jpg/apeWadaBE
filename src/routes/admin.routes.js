const express = require("express");
const { auth } = require("../middleware/auth");
const {
  getCategories,
  postCategory,
  patchCategory,
  patchJobApproval,
  patchWorkerApproval,
} = require("../controllers/admin.controller");

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Admin access is required",
    });
  }

  return next();
};

router.use(auth, requireAdmin);
router.get("/categories", getCategories);
router.post("/categories", postCategory);
router.patch("/categories/:id", patchCategory);
router.patch("/jobs/:jobId/approval", patchJobApproval);
router.patch("/workers/:workerId/approval", patchWorkerApproval);

module.exports = router;
