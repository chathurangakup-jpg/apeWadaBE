// scripts/socket-client.js
const { io } = require("socket.io-client");
//const jwt = require("jsonwebtoken");

const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjN2EwNWExNy0xMGYyLTQwNDUtYWUxMy1kODYyODkwMmNmMTgiLCJyb2xlIjoiV09SS0VSIiwiaWF0IjoxNzkxNDYyOTcxLCJleHAiOjE3OTIwNjc3NzF9.YETgZsRsIp_OJ07JnMWqSZfxPUWWUPU9BqjvCVFaooA"; // paste a valid JWT
const conversationId = "c7a05a17-10f2-4045-ae13-d8628902cf18"; // a conversation the user belongs to

const socket = io("http://localhost:4000", {
  auth: { token },
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("✅ connected:", socket.id);
  socket.emit("conversation:join", { conversationId });
});

socket.on("conversation:joined", (p) => console.log("joined:", p));
socket.on("message:new", (p) => console.log("📩 message:new", p));
socket.on("conversation:read", (p) => console.log("👁 conversation:read", p));
socket.on("conversation:created", (p) =>
  console.log("🆕 conversation:created", p),
);
socket.on("connect_error", (e) => console.error("connect_error:", e.message));
