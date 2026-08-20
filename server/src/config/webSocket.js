import Message from "../models/messageModel.js";

const OnlineUsers = {};

const WebSocket = (io) => {
  console.log("Socket Connected");

  io.on("connection", (socket) => {
    socket.on("createPath", (userID) => {
      OnlineUsers[userID] = socket.id;
      console.log("Online User:", OnlineUsers);
      io.emit("onlineUsers", OnlineUsers);
    });

    socket.on("destroyPath", (userID) => {
      delete OnlineUsers[userID];
      console.log("Online User: ", OnlineUsers);
      io.emit("onlineUsers", OnlineUsers);
    });
  });
};

export default WebSocket;
