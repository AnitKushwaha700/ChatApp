import { io } from "socket.io-client";

const socketAPI = io(import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? `http://${window.location.hostname}:4500` : "https://chatapp-buku.onrender.com"), {
  withCredentials: true,
  autoConnect: false,
});

export default socketAPI;
