// src/api/productApi.js
import httpClient from "./httpClient";

/**
 * Product API: CRUD for /api/products/
 */
export const productApi = {
  /**
   * Get paginated product list with optional search and ordering.
   */
  async list({ page = 1, pageSize = 10, search = "", ordering = "name" } = {}) {
    const params = {
      page,
      page_size: pageSize,
    };
    if (search) params.search = search;
    if (ordering) params.ordering = ordering;

    const res = await httpClient.get("/api/products/", { params });
    return res.data; // { count, next, previous, results }
  },

  async get(id) {
    const res = await httpClient.get(`/api/products/${id}/`);
    return res.data;
  },

  async create(payload) {
    const res = await httpClient.post("/api/products/", payload);
    return res.data;
  },

  async update(id, payload) {
    const res = await httpClient.put(`/api/products/${id}/`, payload);
    return res.data;
  },

  async remove(id) {
    await httpClient.delete(`/api/products/${id}/`);
  },
};
