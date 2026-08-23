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

    // WebRTC Signaling
    socket.on("callUser", ({ userToCall, offer, from, isVideo }) => {
      const receiverSocketId = OnlineUsers[userToCall];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("callUser", { offer, from, isVideo });
      }
    });

    socket.on("answerCall", ({ to, answer }) => {
      const callerSocketId = OnlineUsers[to];
      if (callerSocketId) {
        io.to(callerSocketId).emit("callAccepted", { answer });
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
