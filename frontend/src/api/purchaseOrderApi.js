// src/api/purchaseOrderApi.js
import httpClient from "./httpClient";

/**
 * Purchase Order API: list, create, receive-all.
 *
 * Note: backend GET /api/purchase-orders/ returns an array, not paginated.
 */
export const purchaseOrderApi = {
  /**
   * Get all purchase orders.
   * If later you want server-side filters, you can extend this method with params.
   */
  async list() {
    const res = await httpClient.get("/api/purchase-orders/");
    return res.data; // Array of purchase orders
  },

  /**
   * Create a new purchase order.
   * Payload shape:
   * {
   *   supplier_id: number,
   *   location_id: number,
   *   order_date?: "YYYY-MM-DD",
   *   expected_date?: "YYYY-MM-DD" | null,
   *   items: [
   *     { product_id: number, ordered_qty: number, unit_price?: string }
   *   ]
   * }
   */
  async create(payload) {
    const res = await httpClient.post("/api/purchase-orders/", payload);
    return res.data;
  },

  /**
   * Receive all remaining items for a given purchase order.
   */
  async receiveAll(poId) {
    const res = await httpClient.post(
      `/api/purchase-orders/${poId}/receive-all/`
    );
    return res.data; // Updated purchase order with items
  },
};
