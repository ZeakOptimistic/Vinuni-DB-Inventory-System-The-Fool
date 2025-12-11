// src/api/authApi.js
import httpClient from "./httpClient";

export const authApi = {
  async login(data) {
    const res = await httpClient.post("/api/auth/login/", data);
    return res.data; // { access, user }
  },
};
