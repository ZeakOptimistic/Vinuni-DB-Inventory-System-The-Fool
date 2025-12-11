// src/api/categoryApi.js
import httpClient from "./httpClient";

/**
 * Category API: CRUD for /api/categories/
 */
export const categoryApi = {
  /**
   * Get paginated list of categories with optional search and ordering.
   *
   * Expected backend fields: category_id, name, description
   */
  async list({ page = 1, pageSize = 10, search = "", ordering = "name" } = {}) {
    const params = {
      page,
      page_size: pageSize,
    };
    if (search) params.search = search;
    if (ordering) params.ordering = ordering;

    const res = await httpClient.get("/api/categories/", { params });
    return res.data; // DRF style: { count, next, previous, results }
  },

  async get(id) {
    const res = await httpClient.get(`/api/categories/${id}/`);
    return res.data;
  },

  async create(payload) {
    const res = await httpClient.post("/api/categories/", payload);
    return res.data;
  },

  async update(id, payload) {
    const res = await httpClient.put(`/api/categories/${id}/`, payload);
    return res.data;
  },

  async setStatus(id, status) {
    const res = await httpClient.post(`/api/categories/${id}/set-status/`, {
      status,
    });
    return res.data;
  },

  async remove(id) {
    await httpClient.delete(`/api/categories/${id}/`);
  },
};
