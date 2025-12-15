// src/api/supplierApi.js
import httpClient from "./httpClient";

/**
 * Supplier API: CRUD for /api/suppliers/
 */
export const supplierApi = {
  /**
   * Get paginated suppliers with optional search and ordering.
   *
   * Backend supports search on: name, contact_name, email, phone
   * and ordering on: name, created_at
   */
  async list({ page = 1, pageSize = 10, search = "", ordering = "name", status = "" } = {}) {
    const params = {
      page,
      page_size: pageSize,
    };
    if (search) params.search = search;
    if (ordering) params.ordering = ordering;
    if (status) params.status = status;

    const res = await httpClient.get("/api/suppliers/", { params });
    return res.data; // { count, next, previous, results }
  },

  async get(id) {
    const res = await httpClient.get(`/api/suppliers/${id}/`);
    return res.data;
  },

  async create(payload) {
    const res = await httpClient.post("/api/suppliers/", payload);
    return res.data;
  },

  async update(id, payload) {
    const res = await httpClient.put(`/api/suppliers/${id}/`, payload);
    return res.data;
  },

  async setStatus(id, status) {
    const res = await httpClient.post(`/api/suppliers/${id}/set-status/`, {
      status,
    });
    return res.data;
  },

  async remove(id) {
    await httpClient.delete(`/api/suppliers/${id}/`);
  },
};
