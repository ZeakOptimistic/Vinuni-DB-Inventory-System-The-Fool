// src/api/userApi.js
import httpClient from "./httpClient";

export const userApi = {
  async list({ page = 1, pageSize = 10, search = "", ordering = "-user_id" } = {}) {
    const params = { page, page_size: pageSize, search, ordering };
    const res = await httpClient.get("/api/auth/users/", { params });
    return res.data; // DRF pagination: {count, results, next, previous}
  },

  // Fetch all pages (works even if backend ignores page_size)
  async listAll({ search = "", ordering = "-user_id", pageSize = 200 } = {}) {
    let page = 1;
    let out = [];

    while (true) {
      const data = await this.list({ page, pageSize, search, ordering });
      const results = Array.isArray(data) ? data : (data?.results || []);
      out = out.concat(results);

      if (Array.isArray(data) || !data?.next) break;
      page += 1;
    }

    return out;
  },

  async listRoles() {
    const res = await httpClient.get("/api/auth/roles/");
    return res.data;
  },

  async create(payload) {
    const res = await httpClient.post("/api/auth/users/", payload);
    return res.data;
  },

  async update(id, payload) {
    const res = await httpClient.put(`/api/auth/users/${id}/`, payload);
    return res.data;
  },

  async remove(id) {
    await httpClient.delete(`/api/auth/users/${id}/`);
  },

  async setStatus(id, status) {
    const res = await httpClient.post(`/api/auth/users/${id}/set-status/`, { status });
    return res.data;
  },

  async impersonate(id) {
    const res = await httpClient.post(`/api/auth/users/${id}/impersonate/`);
    return res.data;
  },
};
