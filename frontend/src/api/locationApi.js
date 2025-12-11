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
  async list({ page = 1, pageSize = 10, search = "", ordering = "name" } = {}) {
    const params = {
      page,
      page_size: pageSize,
    };
    if (search) params.search = search;
    if (ordering) params.ordering = ordering;

    const res = await httpClient.get("/api/locations/", { params });
    return res.data; // { count, next, previous, results }
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

  async remove(id) {
    await httpClient.delete(`/api/locations/${id}/`);
  },
};
