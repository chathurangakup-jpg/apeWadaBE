/**
 * Normalize email
 */
const normalizeEmail = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

/**
 * Normalize Sri Lankan phone number
 *
 * Supported examples:
 *
 * 0771234567
 * +94771234567
 * 94771234567
 */
const normalizePhone = (value) => {
  if (!value) {
    return null;
  }

  const cleaned = String(value).trim();

  if (!cleaned) {
    return null;
  }

  // Allow:
  // 0771234567
  // +94771234567
  // 94771234567
  if (!/^(?:\+94|94|0)?[0-9]{9,10}$/.test(cleaned)) {
    throw new Error("INVALID_PHONE");
  }

  // 0771234567 -> +94771234567
  if (cleaned.startsWith("0")) {
    return `+94${cleaned.slice(1)}`;
  }

  // 94771234567 -> +94771234567
  if (cleaned.startsWith("94")) {
    return `+${cleaned}`;
  }

  // +94771234567
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  return `+${cleaned}`;
};

/**
 * Normalize role
 */
const normalizeRole = (value) => {
  const role = String(value || "")
    .trim()
    .toUpperCase();

  if (!["CUSTOMER", "WORKER"].includes(role)) {
    throw new Error("INVALID_ROLE");
  }

  return role;
};

/**
 * Normalize preferred language
 */
const normalizePreferredLanguage = (value) => {
  const language = String(value || "")
    .trim()
    .toUpperCase();

  if (!["EN", "SI"].includes(language)) {
    throw new Error("INVALID_LANGUAGE");
  }

  return language;
};

/**
 * Serialize user database object
 * into API response object.
 */
const serializeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,

  preferredLanguage: user.preferred_language || user.preferredLanguage || "EN",

  avatarPath: user.avatar_path || user.avatarPath || null,

  isActive: user.is_active ?? user.isActive ?? true,

  createdAt: user.created_at || user.createdAt,

  updatedAt: user.updated_at || user.updatedAt,

  lastLoginAt: user.last_login_at || user.lastLoginAt || null,
});

/**
 * Validate registration payload
 */
const validateRegistrationPayload = (body = {}) => {
  const { name, email, phone, password, role, preferredLanguage } = body;

  if (!name || !email || !phone || !password || !role || !preferredLanguage) {
    throw new Error(
      "name, email, phone, password, role, and preferredLanguage are required",
    );
  }

  // Name
  const trimmedName = String(name).trim();

  if (trimmedName.length < 2 || trimmedName.length > 100) {
    throw new Error("name must be between 2 and 100 characters");
  }

  // Email
  const normalizedEmail = normalizeEmail(email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("a valid email is required");
  }

  // Password
  const normalizedPassword = String(password);

  if (normalizedPassword.length < 8) {
    throw new Error("password must be at least 8 characters");
  }

  // Role
  const normalizedRole = normalizeRole(role);

  // Language
  const normalizedLanguage = normalizePreferredLanguage(preferredLanguage);

  // Phone
  const normalizedPhone = normalizePhone(phone);

  return {
    name: trimmedName,
    email: normalizedEmail,
    phone: normalizedPhone,
    password: normalizedPassword,
    role: normalizedRole,
    preferredLanguage: normalizedLanguage,
  };
};

module.exports = {
  validateRegistrationPayload,
  serializeUser,
  normalizeEmail,
  normalizePhone,
  normalizeRole,
  normalizePreferredLanguage,
};
