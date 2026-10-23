import jwt from "jsonwebtoken";
import User from "../../modules/user/userModel.js";
import Group from "../../modules/group/groupModel.js";
import Message from "../../modules/chat/messageModel.js";
import CallLog from "../../modules/call/callLogModel.js";

export const OnlineUsers = {};
let ioInstance = null;

export const getIo = () => ioInstance;

const USER_ROOM = (userId) => `user:${userId}`;
const GROUP_ROOM = (groupId) => `group:${groupId}`;

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
    // ───────────────────────── Presence ─────────────────────────
    socket.on("createPath", async () => {
      if (!socket.userID) return;
      OnlineUsers[socket.userID] = socket.id;

      // Personal room for targeted DMs/notifications
      socket.join(USER_ROOM(socket.userID));

      // Auto-join every group the user belongs to
      try {
        const groups = await Group.find({
          "members.user": socket.userID,
        }).select("_id");
        groups.forEach((g) => socket.join(GROUP_ROOM(g._id)));
      } catch (err) {
        console.error("Group room join failed:", err.message);
      }

      // Back-compat broadcast + rich presence event
      io.emit("onlineUsers", OnlineUsers);
      io.emit("presence:update", {
        userId: socket.userID,
        isOnline: true,
        lastSeen: null,
      });
    });

    socket.on("destroyPath", async () => {
      if (!socket.userID) return;
      delete OnlineUsers[socket.userID];
      try {
        await User.findByIdAndUpdate(socket.userID, {
          lastSeen: new Date(),
        });
      } catch (err) {
        console.error("lastSeen update failed:", err.message);
      }
      io.emit("onlineUsers", OnlineUsers);
      io.emit("presence:update", {
        userId: socket.userID,
        isOnline: false,
        lastSeen: new Date(),
      });
    });

    socket.on("disconnect", async () => {
      if (!socket.userID) return;
      // Only treat as offline when no other socket/tab remains for this user
      if (OnlineUsers[socket.userID] === socket.id) {
        delete OnlineUsers[socket.userID];
        try {
          await User.findByIdAndUpdate(socket.userID, {
            lastSeen: new Date(),
          });
        } catch (err) {
          console.error("lastSeen update failed:", err.message);
        }
        io.emit("onlineUsers", OnlineUsers);
        io.emit("presence:update", {
          userId: socket.userID,
          isOnline: false,
          lastSeen: new Date(),
        });
      }
    });

    // ───────────────────────── Typing indicators ─────────────────────────
    socket.on("typing:start", ({ to, groupId, name }) => {
      if (groupId) {
        socket.to(GROUP_ROOM(groupId)).emit("typing", {
          groupId: String(groupId),
          userId: socket.userID,
          name: name || "Someone",
          isTyping: true,
        });
      } else if (to) {
        io.to(USER_ROOM(to)).emit("typing", {
          from: socket.userID,
          isTyping: true,
        });
      }
    });

    socket.on("typing:stop", ({ to, groupId }) => {
      if (groupId) {
        socket.to(GROUP_ROOM(groupId)).emit("typing", {
          groupId: String(groupId),
          userId: socket.userID,
          isTyping: false,
        });
      } else if (to) {
        io.to(USER_ROOM(to)).emit("typing", {
          from: socket.userID,
          isTyping: false,
        });
      }
    });

    // ───────────────────────── Delivery receipts ─────────────────────────
    socket.on("message:delivered", async ({ messageId }) => {
      try {
        const msg = await Message.findByIdAndUpdate(
          messageId,
          { $addToSet: { deliveredTo: socket.userID } },
          { new: true },
        );
        if (!msg || !msg.senderId) return;
        io.to(USER_ROOM(msg.senderId)).emit("message:status", {
          messageId: msg._id,
          chatType: msg.groupId ? "group" : "dm",
          chatId: msg.groupId ? String(msg.groupId) : String(msg.receiverId),
          userId: socket.userID,
          status: "delivered",
        });
      } catch (err) {
        console.error("delivered receipt failed:", err.message);
      }
    });

    // Read receipts (chat-level, mirrors the REST mark-read endpoint)
    socket.on("message:read", async ({ friendId, groupId }) => {
      try {
        if (friendId) {
          const reader = await User.findById(socket.userID).select(
            "privacy.readReceipts",
          );
          if (reader?.privacy?.readReceipts === false) return;

          await Message.updateMany(
            {
              senderId: friendId,
              receiverId: socket.userID,
              groupId: null,
              isDeletedForEveryone: false,
            },
            {
              $set: { isRead: true },
              $addToSet: { readBy: { user: socket.userID } },
            },
          );
          io.to(USER_ROOM(friendId)).emit("message:status", {
            chatType: "dm",
            chatId: String(socket.userID),
            userId: socket.userID,
            status: "read",
          });
        } else if (groupId) {
          await Message.updateMany(
            { groupId, "readBy.user": { $ne: socket.userID } },
            { $addToSet: { readBy: { user: socket.userID } } },
          );
          io.to(GROUP_ROOM(groupId)).emit("message:status", {
            chatType: "group",
            chatId: String(groupId),
            userId: socket.userID,
            status: "read",
          });
        }
      } catch (err) {
        console.error("read receipt failed:", err.message);
      }
    });

    // Manual group room join (e.g. right after creating a group)
    socket.on("group:join", ({ groupId }) => {
      if (groupId) socket.join(GROUP_ROOM(groupId));
    });

    // ───────────────────────── WebRTC Signaling Flow ─────────────────────────
    // 1. Caller sends a call request (ringing)
    socket.on("requestCall", async ({ userToCall, name, isVideo }) => {
      const receiverSocketId = OnlineUsers[userToCall];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("incomingCall", {
          from: socket.userID,
          name,
          isVideo,
        });
      } else {
        // Receiver is offline -> persist a missed call for their history
        try {
          await CallLog.create({
            caller: socket.userID,
            callee: userToCall,
            type: isVideo ? "video" : "audio",
            status: "missed",
          });
          io.to(USER_ROOM(userToCall)).emit("call:missed", {
            from: socket.userID,
            isVideo,
            at: new Date(),
          });
        } catch (err) {
          console.error("missed call log failed:", err.message);
        }
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

    socket.on("rejectCall", async ({ to, isVideo }) => {
      const callerSocketId = OnlineUsers[to];
      if (callerSocketId) {
        io.to(callerSocketId).emit("callRejected");
      }
      try {
        await CallLog.create({
          caller: to,
          callee: socket.userID,
          type: isVideo ? "video" : "audio",
          status: "declined",
        });
      } catch (err) {
        console.error("declined call log failed:", err.message);
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
