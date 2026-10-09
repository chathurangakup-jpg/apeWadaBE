const {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  registerPushToken,
  deactivatePushToken,
} = require("../services/notification.services");
const {
  validateNotificationId,
  validateNotificationQuery,
  validatePushTokenPayload,
  validatePushTokenRemovalPayload,
} = require("../validators/notification.validator");

const getNotifications = async (req, res) => {
  try {
    const query = validateNotificationQuery(req.query);
    const notifications = await listNotifications(req.user.sub, query);
    return res.status(200).json({ success: true, data: { notifications } });
  } catch (error) {
    return handleNotificationError(error, res, "Failed to load notifications");
  }
};

const patchNotificationRead = async (req, res) => {
  try {
    const notificationId = validateNotificationId(req.params.notificationId);
    const notification = await markNotificationRead(
      req.user.sub,
      notificationId,
    );
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: { notification },
    });
  } catch (error) {
    return handleNotificationError(error, res, "Failed to update notification");
  }
};

const patchAllNotificationsRead = async (req, res) => {
  try {
    const updatedCount = await markAllNotificationsRead(req.user.sub);
    return res.status(200).json({
      success: true,
      message: "Notifications marked as read",
      data: { updatedCount },
    });
  } catch (error) {
    return handleNotificationError(
      error,
      res,
      "Failed to update notifications",
    );
  }
};

const postPushToken = async (req, res) => {
  try {
    const payload = validatePushTokenPayload(req.body);
    const pushToken = await registerPushToken(req.user.sub, payload);
    return res.status(201).json({
      success: true,
      message: "Push token registered",
      data: { pushToken },
    });
  } catch (error) {
    return handleNotificationError(error, res, "Failed to register push token");
  }
};

const deletePushToken = async (req, res) => {
  try {
    const { token } = validatePushTokenRemovalPayload(req.body);
    const pushToken = await deactivatePushToken(req.user.sub, token);
    if (!pushToken) {
      return res.status(404).json({
        success: false,
        message: "Push token not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Push token deactivated",
    });
  } catch (error) {
    return handleNotificationError(
      error,
      res,
      "Failed to deactivate push token",
    );
  }
};

const handleNotificationError = (error, res, fallbackMessage) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error(`${fallbackMessage}:`, error);
  return res.status(500).json({ success: false, message: fallbackMessage });
};

module.exports = {
  getNotifications,
  patchNotificationRead,
  patchAllNotificationsRead,
  postPushToken,
  deletePushToken,
};
