import axios from "axios";

const defaultApiUrl = "https://greenmarket-api-2x85.onrender.com/api";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiUrl,
  timeout: 12000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("green-market-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
