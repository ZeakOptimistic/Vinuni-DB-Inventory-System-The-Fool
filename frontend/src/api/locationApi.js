// src/api/locationApi.js
import httpClient from "./httpClient";

/**
 * Location API: CRUD for /api/locations/
 */
export const locationApi = {
  /**
   * Get paginated locations with optional search and ordering.
   *
   * Backend fields: location_id, name, type, address, status, created_at
   */
  async list({ page = 1, pageSize = 10, search = "", ordering = "name", status = "" } = {}) {
    const params = {
      page,
      page_size: pageSize,
    };
    if (search) params.search = search;
    if (ordering) params.ordering = ordering;
    if (status) params.status = status;

    const res = await httpClient.get("/api/locations/", { params });
    return res.data; // { count, next, previous, results }
  },

  async listAll({ search = "", ordering = "name", status = "", pageSize = 200 } = {}) {
    let page = 1;
    let out = [];

    while (true) {
      const data = await this.list({ page, pageSize, search, ordering, status });
      const results = Array.isArray(data) ? data : (data?.results || []);
      out = out.concat(results);

      if (Array.isArray(data) || !data?.next) break;
      page += 1;
    }
    return out;
  },

  async get(id) {
    const res = await httpClient.get(`/api/locations/${id}/`);
    return res.data;
  },

  async create(payload) {
    const res = await httpClient.post("/api/locations/", payload);
    return res.data;
  },

  async update(id, payload) {
    const res = await httpClient.put(`/api/locations/${id}/`, payload);
    return res.data;
  },

  async setStatus(id, status) {
    const res = await httpClient.post(`/api/locations/${id}/set-status/`, {
      status,
    });
    return res.data;
  },

  async remove(id) {
    await httpClient.delete(`/api/locations/${id}/`);
  },
};
