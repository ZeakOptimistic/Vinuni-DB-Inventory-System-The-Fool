// src/api/salesOrderApi.js
import httpClient from "./httpClient";

/**
 * Sales Order API: list & create.
 *
 * Backend endpoints (from test cases):
 * - POST /api/sales-orders/  : create & confirm sales order
 * - GET  /api/sales-orders/  : list sales orders (with items)
 */
export const salesOrderApi = {
  /**
   * Get all sales orders.
   * If later you add filters on backend, you can extend this method with params.
   */
  async list() {
    const res = await httpClient.get("/api/sales-orders/");
    return res.data; // Expected to be an array of sales orders
  },

  /**
   * Create a new sales order.
   *
   * Example payload:
   * {
   *   location_id: number,
   *   order_date: "YYYY-MM-DD",
   *   customer_name: string | null,
   *   items: [
   *     { product_id: number, quantity: number }
   *   ]
   * }
   */
  async create(payload) {
    const res = await httpClient.post("/api/sales-orders/", payload);
    return res.data;
  },

  async cancel(soId) {
    const res = await httpClient.post(`/api/sales-orders/${soId}/cancel/`);
    return res.data;
  },
};
