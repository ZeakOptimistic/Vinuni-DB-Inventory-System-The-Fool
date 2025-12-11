// src/api/reportApi.js
import httpClient from "./httpClient";

/**
 * Wrapper for /api/reports/* endpoints.
 */
export const reportApi = {
  // GET /api/reports/overview/
  async getOverview() {
    const res = await httpClient.get("/api/reports/overview/");
    return res.data;
  },

  // GET /api/reports/low-stock/
  async getLowStock() {
    const res = await httpClient.get("/api/reports/low-stock/");
    return res.data;
  },

  // GET /api/reports/top-selling/
  // Optional params (for future date filters), currently ignored by backend.
  async getTopSelling(params = {}) {
    const res = await httpClient.get("/api/reports/top-selling/", {
      params,
    });
    return res.data;
  },

  // GET /api/reports/stock-per-location/
  async getStockPerLocation(params = {}) {
    const res = await httpClient.get("/api/reports/stock-per-location/", {
      params,
    });
    return res.data;
  },
};