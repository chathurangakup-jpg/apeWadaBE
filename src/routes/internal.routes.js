const express = require("express");
const {
  emitNewMessage,
  emitConversationRead,
  emitConversationCreated,
} = require("../socket");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Only enable in non-production for testing
if (process.env.NODE_ENV !== "production") {
  router.use(auth);

  // POST /internal/socket/emit-message
  // body: { conversationId, message, participantIds: [] }
  router.post("/emit-message", (req, res) => {
    const { conversationId, message, participantIds = [] } = req.body;
    if (!conversationId || !message) {
      return res
        .status(400)
        .json({
          success: false,
          message: "conversationId and message required",
        });
    }
    emitNewMessage(conversationId, message, participantIds);
    res.json({ success: true, message: "message:new emitted" });
  });

  // POST /internal/socket/emit-read
  router.post("/emit-read", (req, res) => {
    const { conversationId, readerId, participantIds = [] } = req.body;
    if (!conversationId || !readerId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "conversationId and readerId required",
        });
    }
    emitConversationRead(conversationId, readerId, participantIds);
    res.json({ success: true, message: "conversation:read emitted" });
  });

  // POST /internal/socket/emit-created
  router.post("/emit-created", (req, res) => {
    const { conversation, participantIds = [] } = req.body;
    if (!conversation) {
      return res
        .status(400)
        .json({ success: false, message: "conversation required" });
    }
    emitConversationCreated(conversation, participantIds);
    res.json({ success: true, message: "conversation:created emitted" });
  });
}

module.exports = router;
