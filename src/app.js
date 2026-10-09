const express = require("express");
const cors = require("cors");

require("dotenv").config();
const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/users.routes");
const adminRoutes = require("./routes/admin.routes");
const customerRoutes = require("./routes/customer.routes");
const workerRoutes = require("./routes/worker.routes");
const conversationRoutes = require("./routes/conversation.routes");
const notificationRoutes = require("./routes/notification.routes");
const internalRoutes = require("./routes/internal.routes");

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/worker", workerRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/notifications", notificationRoutes);

app.use("/internal/socket", internalRoutes);

module.exports = app;
