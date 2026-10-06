const {
  createUserWithProfile,
  findUserByEmail,
  updateLastLogin,
} = require("../services/auth.services");

const {
  validateRegistrationPayload,
  normalizeEmail,
  serializeUser,
} = require("../validators/auth.validator");

const { comparePassword } = require("../middleware/password");
const { signToken } = require("../middleware/jwt");

/**
 * Register a new CUSTOMER or WORKER
 */
const registerUser = async (req, res) => {
  try {
    const payload = validateRegistrationPayload(req.body);

    const user = await createUserWithProfile(payload);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: serializeUser(user),
      },
    });
  } catch (error) {
    // Duplicate email / phone
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email or phone number already exists",
      });
    }

    // Validation errors
    const validationErrors = {
      INVALID_ROLE: "role must be either CUSTOMER or WORKER",
      INVALID_LANGUAGE: "preferredLanguage must be either EN or SI",
      INVALID_PHONE: "phone must be a valid phone number",
    };

    if (validationErrors[error.message]) {
      return res.status(400).json({
        success: false,
        message: validationErrors[error.message],
      });
    }

    // Other validation errors
    if (
      typeof error.message === "string" &&
      (error.message.includes("required") ||
        error.message.includes("must be") ||
        error.message.includes("valid"))
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

/**
 * Login user
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await findUserByEmail(normalizedEmail);

    // Do not reveal whether the email exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account is inactive",
      });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = signToken({
      sub: user.id,
      role: user.role,
    });

    await updateLastLogin(user.id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: serializeUser(user),
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
