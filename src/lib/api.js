import axios from "axios";

const API_BASE = "https://qw-back.onrender.com";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");

      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
