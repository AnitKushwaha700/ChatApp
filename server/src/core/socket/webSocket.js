import jwt from "jsonwebtoken";

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
      socket.userID = decoded.userId;
      next();
    } catch {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    // We use the authenticated socket.userID
    socket.on("createPath", () => {
      if (socket.userID) {
        OnlineUsers[socket.userID] = socket.id;
        io.emit("onlineUsers", OnlineUsers);
      }
    });

    socket.on("destroyPath", () => {
      if (socket.userID) {
        delete OnlineUsers[socket.userID];
        io.emit("onlineUsers", OnlineUsers);
      }
    });

    socket.on("disconnect", () => {
      if (socket.userID) {
        delete OnlineUsers[socket.userID];
        console.log("Online Users:", OnlineUsers);
        io.emit("onlineUsers", OnlineUsers);
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
