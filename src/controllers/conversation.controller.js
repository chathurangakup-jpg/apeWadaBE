const {
  createConversation,
  listConversations,
  getConversationMessages,
  sendTextMessage,
  markConversationRead,
} = require("../services/conversation.services");
const {
  validateCreateConversationPayload,
  validateConversationId,
  validateMessagePayload,
  validateMessageQuery,
} = require("../validators/conversation.validator");

const {
  emitNewMessage,
  emitConversationRead,
  emitConversationCreated,
} = require("../socket");

const postConversation = async (req, res) => {
  try {
    const payload = validateCreateConversationPayload(req.body);
    const conversation = await createConversation(req.user.sub, payload);

    // Notify both participants so the list refreshes live
    emitConversationCreated(conversation, [
      conversation.customerId,
      conversation.workerId,
    ]);

    return res.status(201).json({
      success: true,
      message: "Conversation created",
      data: { conversation },
    });
  } catch (error) {
    return handleConversationError(error, res, "Failed to create conversation");
  }
};

const getConversations = async (req, res) => {
  try {
    const conversations = await listConversations(req.user.sub);
    return res.status(200).json({ success: true, data: { conversations } });
  } catch (error) {
    return handleConversationError(error, res, "Failed to load conversations");
  }
};

const getMessages = async (req, res) => {
  try {
    const conversationId = validateConversationId(req.params.conversationId);
    const query = validateMessageQuery(req.query);
    const messages = await getConversationMessages(
      req.user.sub,
      conversationId,
      query,
    );

    if (!messages) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }
    return res.status(200).json({ success: true, data: { messages } });
  } catch (error) {
    return handleConversationError(error, res, "Failed to load messages");
  }
};

const postMessage = async (req, res) => {
  try {
    const conversationId = validateConversationId(req.params.conversationId);
    const { content } = validateMessagePayload(req.body);
    const message = await sendTextMessage(
      req.user.sub,
      conversationId,
      content,
    );
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Look up the other participant for real-time fan-out
    const conversation =
      await require("../services/conversation.services").getConversationParticipants(
        conversationId,
      );

    emitNewMessage(conversationId, message, conversation?.participantIds || []);

    return res.status(201).json({
      success: true,
      message: "Message sent",
      data: { message },
    });
  } catch (error) {
    return handleConversationError(error, res, "Failed to send message");
  }
};

const patchRead = async (req, res) => {
  try {
    const conversationId = validateConversationId(req.params.conversationId);
    const updated = await markConversationRead(req.user.sub, conversationId);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const conversation =
      await require("../services/conversation.services").getConversationParticipants(
        conversationId,
      );

    emitConversationRead(
      conversationId,
      req.user.sub,
      conversation?.participantIds || [],
    );

    return res.status(200).json({
      success: true,
      message: "Conversation marked as read",
    });
  } catch (error) {
    return handleConversationError(
      error,
      res,
      "Failed to mark conversation read",
    );
  }
};

const handleConversationError = (error, res, fallbackMessage) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (
    error.code === "CHAT_PARTICIPANTS_NOT_ELIGIBLE" ||
    error.code === "CHAT_ROLE_NOT_ALLOWED" ||
    error.code === "ACTIVE_ACCOUNT_REQUIRED"
  ) {
    return res.status(403).json({ success: false, message: error.message });
  }
  console.error(`${fallbackMessage}:`, error);
  return res.status(500).json({ success: false, message: fallbackMessage });
};

module.exports = {
  postConversation,
  getConversations,
  getMessages,
  postMessage,
  patchRead,
};
