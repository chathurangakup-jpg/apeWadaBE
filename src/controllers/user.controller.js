const {
  getPublicData,
  getCurrentUser,
  updateCurrentUser,
  updateCustomerProfile,
  updateWorkerProfile,
  getPasswordHash,
  changePassword,
  deactivateUser,
} = require("../services/user.services");

const {
  validateGetDataQuery,
  validateUpdateUserPayload,
  validateCustomerProfilePayload,
  validateWorkerProfilePayload,
  validateChangePasswordPayload,
} = require("../validators/user.validator");

const { comparePassword } = require("../middleware/password");

/**
 * Public dashboard data
 *
 * GET /api/user/getData
 */
const getData = async (req, res) => {
  try {
    validateGetDataQuery(req.query);
    const data = await getPublicData();
    return res.status(200).json({
      success: true,
      message: "Public data retrieved successfully",
      data,
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.message === "getData does not accept query parameters"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Get public data error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load public data",
    });
  }
};

/**
 * Get authenticated user
 *
 * GET /api/users/me
 */
const getMe = async (req, res) => {
  try {
    console.log("Authenticated user ID:", req.user?.sub); // Log the authenticated user ID for debugging
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required1",
      });
    }

    const result = await getCurrentUser(userId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get current user",
    });
  }
};

/**
 * Update authenticated user
 *
 * PATCH /api/users/me
 */
const updateMe = async (req, res) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const payload = validateUpdateUserPayload(req.body);

    const user = await updateCurrentUser(userId, payload);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          preferredLanguage: user.preferred_language,
          avatarPath: user.avatar_path,
          isActive: user.is_active,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this phone number already exists",
      });
    }

    if (
      error.message === "INVALID_PHONE" ||
      error.message === "INVALID_LANGUAGE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          error.message === "INVALID_PHONE"
            ? "phone must be a valid phone number"
            : "preferredLanguage must be either EN or SI",
      });
    }

    if (typeof error.message === "string") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Update user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};

/**
 * Update customer profile
 *
 * PATCH /api/users/me/customer-profile
 */
const updateMyCustomerProfile = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (role !== "CUSTOMER") {
      return res.status(403).json({
        success: false,
        message: "Only customers can update customer profile",
      });
    }

    const payload = validateCustomerProfilePayload(req.body);

    const profile = await updateCustomerProfile(userId, payload);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Customer profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer profile updated successfully",
      data: {
        profile,
      },
    });
  } catch (error) {
    console.error("Update customer profile error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Invalid customer profile",
    });
  }
};

/**
 * Update worker profile
 *
 * PATCH /api/users/me/worker-profile
 */
const updateMyWorkerProfile = async (req, res) => {
  try {
    const userId = req.user?.sub;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (role !== "WORKER") {
      return res.status(403).json({
        success: false,
        message: "Only workers can update worker profile",
      });
    }

    const payload = validateWorkerProfilePayload(req.body);

    const profile = await updateWorkerProfile(userId, payload);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Worker profile updated successfully",
      data: {
        profile: {
          bio: profile.bio,
          experienceYears: profile.experience_years,
          educationSummary: profile.education_summary,
          district: profile.district,
          city: profile.city,
          venue: profile.venue,
          approvalStatus: profile.approval_status,
          availabilityStatus: profile.availability_status,
          averageRating: profile.average_rating,
          reviewCount: profile.review_count,
          categories: profile.categories,
          experiences: profile.experiences,
          education: profile.education,
          portfolio: profile.portfolio,
        },
      },
    });
  } catch (error) {
    console.error("Update worker profile error:", error);

    if (error.code === "INVALID_CATEGORY_IDS") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Invalid worker profile",
    });
  }
};

/**
 * Change password
 *
 * PATCH /api/users/me/password
 */
const changeMyPassword = async (req, res) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { currentPassword, newPassword } = validateChangePasswordPayload(
      req.body,
    );

    const passwordHash = await getPasswordHash(userId);

    if (!passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid account credentials",
      });
    }

    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      passwordHash,
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    await changePassword(userId, newPassword);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to change password",
    });
  }
};

/**
 * Deactivate account
 *
 * PATCH /api/users/me/deactivate
 */
const deactivateMyAccount = async (req, res) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = await deactivateUser(userId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate account error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate account",
    });
  }
};

module.exports = {
  getData,
  getMe,
  updateMe,
  updateMyCustomerProfile,
  updateMyWorkerProfile,
  changeMyPassword,
  deactivateMyAccount,
};
