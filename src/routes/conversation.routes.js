const express = require("express");
const { auth } = require("../middleware/auth");
const {
  postConversation,
  getConversations,
  getMessages,
  postMessage,
  patchRead,
} = require("../controllers/conversation.controller");

const router = express.Router();

router.use(auth);
router.post("/", postConversation);
router.get("/", getConversations);
router.get("/:conversationId/messages", getMessages);
router.post("/:conversationId/messages", postMessage);
router.patch("/:conversationId/read", patchRead);

module.exports = router;
