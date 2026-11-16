import jwt from "jsonwebtoken";
import User from "../../modules/user/userModel.js";

export const OnlineUsers = {};
export const ActiveCalls = {};
let ioInstance = null;

export const getIo = () => ioInstance;

const WebSocket = (io) => {
  ioInstance = io;
  console.log("Socket Connected");

  // Authentication Middleware
  io.use((socket, next) => {
    try {
      let token = null;
      const cookieHeader = socket.handshake.headers.cookie;
      if (cookieHeader) {
        const tokenCookie = cookieHeader
          .split(";")
          .find((c) => c.trim().startsWith("token="));
        if (tokenCookie) {
          token = tokenCookie.split("=")[1];
        }
      }
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }
      if (!token && socket.handshake.headers?.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
      }

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userID = decoded._id;
      }
      next();
    } catch {
      // Allow connection; specific handlers verify authentication
      next();
    }
  });

  io.on("connection", (socket) => {
    // Authenticated socket.userID or passed userId
    socket.on("createPath", async (userId) => {
      const currentId = (socket.userID || userId)?.toString();
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
      const currentId = (socket.userID || userId)?.toString();
      if (currentId) {
        delete OnlineUsers[currentId];
        delete ActiveCalls[currentId];
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
        const userIdStr = socket.userID.toString();
        // If this user was in an active call, notify peer
        const peerId = ActiveCalls[userIdStr];
        if (peerId) {
          const peerSocketId = OnlineUsers[peerId];
          if (peerSocketId) {
            io.to(peerSocketId).emit("callEnded", { reason: "Peer disconnected" });
          }
          delete ActiveCalls[peerId];
          delete ActiveCalls[userIdStr];
        }

        delete OnlineUsers[userIdStr];
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
      const receiverSocketId = OnlineUsers[to.toString()];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { from: socket.userID });
      }
    });

    socket.on("stop-typing", ({ to }) => {
      if (!to) return;
      const receiverSocketId = OnlineUsers[to.toString()];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stop-typing", { from: socket.userID });
      }
    });

    // Real-Time Read Receipts Trigger
    socket.on("mark-read", ({ from }) => {
      if (!from) return;
      const senderSocketId = OnlineUsers[from.toString()];
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesRead", {
          friendId: socket.userID,
          readBy: socket.userID,
        });
      }
    });

    // WebRTC Signaling Flow
    // 1. Caller sends a call request (ringing)
    socket.on("requestCall", ({ userToCall, from, name, isVideo, avatar }) => {
      const callerId = (socket.userID || from)?.toString();
      const targetId = userToCall?.toString();

      if (!targetId || !callerId) {
        socket.emit("callError", { message: "Invalid caller or recipient ID." });
        return;
      }

      if (ActiveCalls[targetId]) {
        socket.emit("callBusy", { message: "Contact is currently on another call." });
        return;
      }

      const receiverSocketId = OnlineUsers[targetId];
      if (!receiverSocketId) {
        socket.emit("callUnavailable", { message: "Contact is currently offline." });
        return;
      }

      io.to(receiverSocketId).emit("incomingCall", {
        from: callerId,
        name: name || "Contact",
        isVideo: Boolean(isVideo),
        avatar: avatar || "",
      });
    });

    // 2. Receiver accepts the call request
    socket.on("acceptCall", ({ to, from }) => {
      const callerId = to?.toString();
      const receiverId = (socket.userID || from)?.toString();
      if (callerId && receiverId) {
        ActiveCalls[callerId] = receiverId;
        ActiveCalls[receiverId] = callerId;
      }

      const callerSocketId = OnlineUsers[callerId];
      if (callerSocketId) {
        io.to(callerSocketId).emit("callAccepted", { from: receiverId });
      }
    });

    // 3. Caller generates WebRTC offer and sends it
    socket.on("webrtcOffer", ({ to, offer }) => {
      const receiverSocketId = OnlineUsers[to?.toString()];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("webrtcOffer", {
          offer,
          from: socket.userID?.toString(),
        });
      }
    });

    // 4. Receiver generates WebRTC answer and sends it
    socket.on("webrtcAnswer", ({ to, answer }) => {
      const callerSocketId = OnlineUsers[to?.toString()];
      if (callerSocketId) {
        io.to(callerSocketId).emit("webrtcAnswer", {
          answer,
          from: socket.userID?.toString(),
        });
      }
    });

    socket.on("iceCandidate", ({ to, candidate }) => {
      const peerSocketId = OnlineUsers[to?.toString()];
      if (peerSocketId) {
        io.to(peerSocketId).emit("iceCandidate", {
          candidate,
          from: socket.userID?.toString(),
        });
      }
    });

    socket.on("rejectCall", ({ to }) => {
      const callerId = to?.toString();
      const receiverId = socket.userID?.toString();
      if (callerId) delete ActiveCalls[callerId];
      if (receiverId) delete ActiveCalls[receiverId];

      const callerSocketId = OnlineUsers[callerId];
      if (callerSocketId) {
        io.to(callerSocketId).emit("callRejected");
      }
    });

    socket.on("endCall", ({ to }) => {
      const targetId = to?.toString();
      const currentId = socket.userID?.toString();
      if (targetId) delete ActiveCalls[targetId];
      if (currentId) delete ActiveCalls[currentId];

      const peerSocketId = OnlineUsers[targetId];
      if (peerSocketId) {
        io.to(peerSocketId).emit("callEnded");
      }
    });
  });
};

export default WebSocket;
