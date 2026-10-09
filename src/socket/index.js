const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

/**
 * Attach Socket.IO to the existing HTTP server.
 * Call this once from your main entry (server.js / app.js).
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "*",
      methods: ["GET", "POST", "PATCH"],
      credentials: true,
    },
    path: "/socket.io",
  });

  // ---- Auth middleware ----
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) return next(new Error("AUTH_TOKEN_MISSING"));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      // Adjust to match your JWT payload — you use req.user.sub elsewhere
      socket.user = { sub: payload.sub || payload.id, role: payload.role };
      next();
    } catch (error) {
      next(new Error("AUTH_TOKEN_INVALID"), error);
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.sub;
    console.log(`[socket] connected user=${userId} socket=${socket.id}`);

    // Personal room (for "conversation list updated" notifications)
    socket.join(`user:${userId}`);

    // Join a conversation room
    socket.on("conversation:join", ({ conversationId }) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
      socket.emit("conversation:joined", { conversationId });
    });

    socket.on("conversation:leave", ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    // Optional: typing indicators
    socket.on("message:typing", ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("message:typing", {
        conversationId,
        userId,
        isTyping: !!isTyping,
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected user=${userId} reason=${reason}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.IO has not been initialised yet");
  return io;
};

/* ---------------- Emitters (called from services/controllers) ---------------- */

const emitNewMessage = (conversationId, message, participantIds = []) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit("message:new", {
    conversationId,
    message,
  });
  // Also ping each participant's personal room (for unread badge updates)
  participantIds.forEach((uid) =>
    io.to(`user:${uid}`).emit("conversation:updated", {
      conversationId,
      lastMessage: message,
    }),
  );
};

const emitConversationRead = (
  conversationId,
  readerId,
  participantIds = [],
) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit("conversation:read", {
    conversationId,
    readerId,
    readAt: new Date().toISOString(),
  });
  participantIds.forEach((uid) =>
    io.to(`user:${uid}`).emit("conversation:read", {
      conversationId,
      readerId,
      readAt: new Date().toISOString(),
    }),
  );
};

const emitConversationCreated = (conversation, participantIds = []) => {
  if (!io) return;
  participantIds.forEach((uid) =>
    io.to(`user:${uid}`).emit("conversation:created", { conversation }),
  );
};

module.exports = {
  initSocket,
  getIO,
  emitNewMessage,
  emitConversationRead,
  emitConversationCreated,
};
