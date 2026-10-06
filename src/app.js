const express = require("express");
const cors = require("cors");

require("dotenv").config();
const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/users.routes");
const adminRoutes = require("./routes/admin.routes");

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);

module.exports = app;
