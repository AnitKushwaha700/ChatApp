import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://172.168.7.164:4500",
  withCredentials: true,
});

export default api;