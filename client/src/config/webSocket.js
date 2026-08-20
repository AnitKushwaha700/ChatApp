import { io } from "socket.io-client";

const socketAPI = io(import.meta.env.VITE_BACKEND_URL || "http://172.168.7.164:4500", {
  withCredentials: true,
});

export default socketAPI;
