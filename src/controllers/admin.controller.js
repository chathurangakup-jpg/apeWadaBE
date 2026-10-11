const {
  listCategories,
  createCategory,
  updateCategory,
  listAdminUsers,
  updateAdminUser,
} = require("../services/admin.services");
const {
  validateCategoryId,
  validateCategoryPayload,
  validateAdminEntityId,
  validateApprovalPayload,
  validateAdminUsersQuery,
  validateAdminUserPayload,
} = require("../validators/admin.validator");
const {
  approveJobAndNotify,
  approveWorkerAndNotify,
} = require("../services/admin.services");

const getCategories = async (req, res) => {
  try {
    const categories = await listCategories();
    return res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    console.error("List categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load categories",
    });
  }
};

const postCategory = async (req, res) => {
  try {
    const payload = validateCategoryPayload(req.body);
    const category = await createCategory(payload);
    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: { category },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A category with this English name or slug already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    console.error("Create category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

const patchCategory = async (req, res) => {
  try {
    const id = validateCategoryId(req.params.id);
    const payload = validateCategoryPayload(req.body, true);
    const category = await updateCategory(id, payload);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: { category },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A category with this English name or slug already exists",
      });
    }

    if (error.message === "INVALID_CATEGORY_ID") {
      return res.status(400).json({
        success: false,
        message: "A valid category ID is required",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    console.error("Update category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

const patchJobApproval = async (req, res) => {
  try {
    const jobId = validateAdminEntityId(req.params.jobId, "jobId");
    const payload = validateApprovalPayload(req.body);
    const result = await approveJobAndNotify(jobId, req.user.sub, payload);
    if (!result) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (result.error === "JOB_NOT_PENDING") {
      return res.status(409).json({
        success: false,
        message: `Job is already ${result.status}`,
      });
    }
    return res.status(200).json({
      success: true,
      message: payload.decision === "APPROVE" ? "Job approved" : "Job rejected",
      data: { job: result },
    });
  } catch (error) {
    return handleApprovalError(error, res, "Failed to update job approval");
  }
};

const patchWorkerApproval = async (req, res) => {
  try {
    const workerId = validateAdminEntityId(req.params.workerId, "workerId");
    const payload = validateApprovalPayload(req.body);
    const result = await approveWorkerAndNotify(
      workerId,
      req.user.sub,
      payload,
    );
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Worker not found" });
    }
    if (result.error === "WORKER_NOT_PENDING") {
      return res.status(409).json({
        success: false,
        message: `Worker profile is already ${result.approvalStatus}`,
      });
    }
    return res.status(200).json({
      success: true,
      message:
        payload.decision === "APPROVE"
          ? "Worker profile approved"
          : "Worker profile rejected",
      data: { worker: result },
    });
  } catch (error) {
    return handleApprovalError(error, res, "Failed to update worker approval");
  }
};

const getUsers = async (req, res) => {
  try {
    const role = validateAdminUsersQuery(req.query);
    const users = await listAdminUsers(role);
    return res.status(200).json({ success: true, data: { users } });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("List admin users error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load users",
    });
  }
};

const patchUser = async (req, res) => {
  try {
    const userId = validateAdminEntityId(req.params.userId, "userId");
    const payload = validateAdminUserPayload(req.body);
    const user = await updateAdminUser(userId, payload);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    return res.status(200).json({
      success: true,
      message: "User details updated successfully",
      data: { user },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === "PROFILE_FIELDS_NOT_ALLOWED") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email or phone number is already in use",
      });
    }
    console.error("Update admin user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user details",
    });
  }
};

const handleApprovalError = (error, res, fallbackMessage) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error(`${fallbackMessage}:`, error);
  return res.status(500).json({ success: false, message: fallbackMessage });
};

module.exports = {
  getCategories,
  postCategory,
  patchCategory,
  patchJobApproval,
  patchWorkerApproval,
  getUsers,
  patchUser,
};
