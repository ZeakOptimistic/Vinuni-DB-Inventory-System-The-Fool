// src/api/categoryApi.js
import httpClient from "./httpClient";

/**
 * Category API: used mainly for dropdowns when editing products.
 */
export const categoryApi = {
  /**
   * Get a list of categories (all, or first N).
   * For now we just request a big page_size, assuming number of categories is small.
   */
  async listAll() {
    const res = await httpClient.get("/api/categories/", {
      params: { page_size: 1000 },
    });
    return res.data.results || [];
  },
};
