import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:4500`,
  withCredentials: true,
});

export default api;