export const OnlineUsers = {};
let ioInstance = null;

export const getIo = () => ioInstance;

const WebSocket = (io) => {
  ioInstance = io;
  console.log("Socket Connected");

  io.on("connection", (socket) => {
    // We attach userID to the socket object so we can use it on disconnect
    socket.on("createPath", (userID) => {
      socket.userID = userID;
      OnlineUsers[userID] = socket.id;
      console.log("Online Users:", OnlineUsers);
      io.emit("onlineUsers", OnlineUsers);
    });

    socket.on("destroyPath", (userID) => {
      delete OnlineUsers[userID];
      console.log("Online Users: ", OnlineUsers);
      io.emit("onlineUsers", OnlineUsers);
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
    socket.on("requestCall", ({ userToCall, from, name, isVideo }) => {
      const receiverSocketId = OnlineUsers[userToCall];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("incomingCall", { from, name, isVideo });
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
