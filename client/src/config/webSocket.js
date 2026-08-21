import { io } from "socket.io-client";

const socketAPI = io(import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:4500`, {
  withCredentials: true,
});

export default socketAPI;
