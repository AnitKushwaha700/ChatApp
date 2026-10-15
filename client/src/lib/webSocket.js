import { io } from "socket.io-client";

const getSocketURL = () => {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.")
    ) {
      return `${protocol}//${hostname}:4500`;
    }
  }
  return (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "https://chatapp-buku.onrender.com"
  );
};

const socketAPI = io(getSocketURL(), {
  withCredentials: true,
  autoConnect: false,
});

export default socketAPI;
