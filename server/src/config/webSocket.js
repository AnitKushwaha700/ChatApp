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
  });
};

export default WebSocket;
