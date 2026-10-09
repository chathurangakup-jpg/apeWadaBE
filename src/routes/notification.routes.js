const express = require("express");
const { auth } = require("../middleware/auth");
const {
  getNotifications,
  patchNotificationRead,
  patchAllNotificationsRead,
  postPushToken,
  deletePushToken,
} = require("../controllers/notification.controller");

const router = express.Router();

router.use(auth);
router.get("/", getNotifications);
router.patch("/read-all", patchAllNotificationsRead);
router.patch("/:notificationId/read", patchNotificationRead);
router.post("/push-tokens", postPushToken);
router.delete("/push-tokens", deletePushToken);

module.exports = router;
