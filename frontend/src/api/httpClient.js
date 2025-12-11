// src/api/httpClient.js
import axios from "axios";

/**
 * Axios instance used for all API calls.
 * Always attach Authorization: Bearer
 */
const httpClient = axios.create({
  baseURL: "http://localhost:8000", // modify if backend run in other port
  withCredentials: false,
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("sipms_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default httpClient;
