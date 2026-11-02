import jwt from "jsonwebtoken";
import User from "../../modules/user/userModel.js";

export const OnlineUsers = {};
let ioInstance = null;

export const getIo = () => ioInstance;

const WebSocket = (io) => {
  ioInstance = io;
  console.log("Socket Connected");

  // Authentication Middleware
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) return next(new Error("Authentication error"));

      const tokenCookie = cookieHeader
        .split(";")
        .find((c) => c.trim().startsWith("token="));

      if (!tokenCookie) return next(new Error("Authentication error"));

      const token = tokenCookie.split("=")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userID = decoded._id;
      next();
    } catch {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    // Authenticated socket.userID or passed userId
    socket.on("createPath", async (userId) => {
      const currentId = socket.userID || userId;
      if (currentId) {
        socket.userID = currentId;
        OnlineUsers[currentId] = socket.id;
        io.emit("onlineUsers", OnlineUsers);
        try {
          await User.findByIdAndUpdate(currentId, {
            isOnline: true,
            lastSeen: new Date(),
          });
        } catch (e) {
          console.error("Failed to update user online status", e.message);
        }
      }
    });

    socket.on("destroyPath", async (userId) => {
      const currentId = socket.userID || userId;
      if (currentId) {
        delete OnlineUsers[currentId];
        io.emit("onlineUsers", OnlineUsers);
        try {
          await User.findByIdAndUpdate(currentId, {
            isOnline: false,
            lastSeen: new Date(),
          });
        } catch (e) {
          console.error("Failed to update user offline status", e.message);
        }
      }
    });

    socket.on("disconnect", async () => {
      if (socket.userID) {
        delete OnlineUsers[socket.userID];
        console.log("Online Users:", OnlineUsers);
        io.emit("onlineUsers", OnlineUsers);
        try {
          await User.findByIdAndUpdate(socket.userID, {
            isOnline: false,
            lastSeen: new Date(),
          });
        } catch (e) {
          console.error("Failed to update user offline status", e.message);
        }
      }
    });

    // Chat Rooms for 1-to-1 & Groups
    socket.on("join-chat", (chatId) => {
      if (chatId) socket.join(chatId.toString());
    });

    socket.on("leave-chat", (chatId) => {
      if (chatId) socket.leave(chatId.toString());
    });

    // Real-Time Typing Indicators
    socket.on("typing", ({ to }) => {
      if (!to) return;
      const receiverSocketId = OnlineUsers[to];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { from: socket.userID });
      }
    });

    socket.on("stop-typing", ({ to }) => {
      if (!to) return;
      const receiverSocketId = OnlineUsers[to];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stop-typing", { from: socket.userID });
      }
    });

    // Real-Time Read Receipts Trigger
    socket.on("mark-read", ({ from }) => {
      if (!from) return;
      const senderSocketId = OnlineUsers[from];
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesRead", {
          friendId: socket.userID,
          readBy: socket.userID,
        });
      }
    });

    // WebRTC Signaling Flow
    // 1. Caller sends a call request (ringing)
    socket.on("requestCall", ({ userToCall, name, isVideo }) => {
      const receiverSocketId = OnlineUsers[userToCall];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("incomingCall", { from: socket.userID, name, isVideo });
      }
    });

    // 2. Receiver accepts the call request
    socket.on("acceptCall", ({ to }) => {
      const callerSocketId = OnlineUsers[to];
      if (callerSocketId) {
        io.to(callerSocketId).emit("callAccepted");
      }
    });

    // 3. Caller generates WebRTC offer and sends it
    socket.on("webrtcOffer", ({ to, offer }) => {
      const receiverSocketId = OnlineUsers[to];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("webrtcOffer", { offer });
      }
    });

    // 4. Receiver generates WebRTC answer and sends it
    socket.on("webrtcAnswer", ({ to, answer }) => {
      const callerSocketId = OnlineUsers[to];
      if (callerSocketId) {
        io.to(callerSocketId).emit("webrtcAnswer", { answer });
      }
    });

    socket.on("iceCandidate", ({ to, candidate }) => {
      const peerSocketId = OnlineUsers[to];
      if (peerSocketId) {
        io.to(peerSocketId).emit("iceCandidate", { candidate });
      }
    });

    socket.on("rejectCall", ({ to }) => {
      const callerSocketId = OnlineUsers[to];
      if (callerSocketId) {
        io.to(callerSocketId).emit("callRejected");
      }
    });

    socket.on("endCall", ({ to }) => {
      const peerSocketId = OnlineUsers[to];
      if (peerSocketId) {
        io.to(peerSocketId).emit("callEnded");
      }
    });
  });
};

export default WebSocket;
