// src/api/transferApi.js
import httpClient from "./httpClient";

/**
 * API client for stock transfers between locations.
 * Backend endpoint: POST /api/transfers/
 */
export const transferApi = {
  /**
   * Perform a stock transfer.
   *
   * payload: {
   *   product_id: number,
   *   from_location_id: number,
   *   to_location_id: number,
   *   quantity: number
   * }
   */
  async create(payload) {
    const res = await httpClient.post("/api/transfers/", payload);
    return res.data;
  },

  async list({ limit = 50 } = {}) {
    const res = await httpClient.get("/api/transfers/", {
      params: { limit },
    });
    return res.data; // backend return array
  },
};
