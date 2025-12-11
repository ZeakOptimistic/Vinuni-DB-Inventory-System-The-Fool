// src/pages/salesOrders/SalesOrdersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { salesOrderApi } from "../../api/salesOrderApi";
import { useAuth } from "../../hooks/useAuth";
import SalesOrderFormModal from "../../components/salesOrders/SalesOrderFormModal";

/**
 * SalesOrdersPage:
 * - Shows list of sales orders from backend
 * - Allows filtering by customer, status, and location (client-side)
 * - Allows expanding each SO to see line items
 * - Allows any authenticated user (ADMIN / MANAGER / CLERK) to create
 *   new sales orders via modal.
 *
 * Confirm & stock deduction are handled on the backend when creating
 * the sales order.
 */
const SalesOrdersPage = () => {
  const { user } = useAuth();

  // All signed-in users can create sales orders
  const canCreateSalesOrders = !!user;

  const canCancelSalesOrders =
    user && (user.role === "ADMIN" || user.role === "MANAGER");



  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  const [expandedIds, setExpandedIds] = useState(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);


  // ---------------- Data loading ----------------

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesOrderApi.list();
      // API returns a plain array of sales orders
      setOrders(data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load sales orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ---------------- Derived data ----------------

  const filteredOrders = useMemo(() => {
    const customerFilter = filterCustomer.trim().toLowerCase();
    const statusFilter = filterStatus.trim().toUpperCase();
    const locationFilter = filterLocation.trim().toLowerCase();

    return (orders || []).filter((o) => {
      const customerName = (o.customer_name || "").toLowerCase();
      const status = (o.status || "").toUpperCase();
      const locationName = (o.location_name || "").toLowerCase();

      const matchCustomer =
        !customerFilter || customerName.includes(customerFilter);
      const matchStatus = !statusFilter || status === statusFilter;
      const matchLocation =
        !locationFilter || locationName.includes(locationFilter);

      return matchCustomer && matchStatus && matchLocation;
    });
  }, [orders, filterCustomer, filterStatus, filterLocation]);

  // ---------------- Handlers ----------------

  const toggleExpand = (soId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(soId)) {
        next.delete(soId);
      } else {
        next.add(soId);
      }
      return next;
    });
  };

  const handleCancel = async (order) => {
    if (!canCancelSalesOrders) {
      alert("You do not have permission to cancel sales orders.");
      return;
    }

    const confirmed = window.confirm(
      `Cancel sales order #${order.so_id}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setCancellingId(order.so_id);
      const updated = await salesOrderApi.cancel(order.so_id);

      setOrders((prev) =>
        prev.map((o) => (o.so_id === updated.so_id ? updated : o))
      );
    } catch (err) {
      console.error(err);
      alert("Failed to cancel sales order. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };


  const handleOpenCreateModal = () => {
    if (!canCreateSalesOrders) return;
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleSalesOrderCreated = (created) => {
    if (!created) return;
    // Prepend new SO for quick feedback
    setOrders((prev) => [created, ...(prev || [])]);
  };

  // ---------------- Render ----------------

  return (
    <div>
      {/* Header */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Sales Orders</h2>

        {canCreateSalesOrders && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateModal}
          >
            New Sales Order
          </button>
        )}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Filter by customer..."
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(e.target.value)}
          className="form-input"
          style={{ minWidth: 180 }}
        />
        <input
          type="text"
          placeholder="Filter by location..."
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="form-input"
          style={{ minWidth: 180 }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="form-input"
          style={{ minWidth: 200 }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="PARTIALLY_SHIPPED">PARTIALLY_SHIPPED</option>
          <option value="CLOSED">CLOSED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {/* Error / loading / empty states */}
      {error && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading && <div>Loading sales orders...</div>}

      {!loading && filteredOrders.length === 0 && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#f3f4f6",
          }}
        >
          No sales orders found with the current filters.
        </div>
      )}

      {/* Table */}
      {!loading && filteredOrders.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <thead style={{ background: "#f9fafb" }}>
              <tr>
                <th style={thStyle}>SO #</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Order date</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Created at</th>
                <th style={thStyle}>Items</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => {
                const isExpanded = expandedIds.has(o.so_id);
                const normalizedStatus = (o.status || "").toUpperCase();
                const isCancelledOrClosed =
                  normalizedStatus === "CANCELLED" || normalizedStatus === "CLOSED";

                return (
                  <React.Fragment key={o.so_id}>
                    <tr
                      style={
                        isCancelledOrClosed
                          ? { opacity: 0.6, background: "#f9fafb" }
                          : undefined
                      }
                    >
                      <td style={tdStyle}>{o.so_id}</td>
                      <td style={tdStyle}>{o.customer_name || "-"}</td>
                      <td style={tdStyle}>{o.location_name || "-"}</td>
                      <td style={tdStyle}>{renderStatusBadge(o.status)}</td>
                      <td style={tdStyle}>{o.order_date || "-"}</td>
                      <td style={tdStyle}>
                        {o.total_amount != null ? o.total_amount : "-"}
                      </td>
                      <td style={tdStyle}>
                        {o.created_at
                          ? new Date(o.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td style={tdStyle}>
                        {o.items && o.items.length > 0 ? (
                          <button
                            type="button"
                            className="btn btn-xs btn-outline"
                            onClick={() => toggleExpand(o.so_id)}
                          >
                            {isExpanded
                              ? "Hide items"
                              : `View items (${o.items.length})`}
                          </button>
                        ) : (
                          <span style={{ color: "#6b7280" }}>No items</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {canCancelSalesOrders && o.status === "CONFIRMED" ? (
                          <button
                            type="button"
                            className="btn btn-xs btn-danger"
                            onClick={() => handleCancel(o)}
                            disabled={cancellingId === o.so_id}
                          >
                            {cancellingId === o.so_id ? "Cancelling..." : "Cancel"}
                          </button>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "10px 10px",
                              borderRadius: 999,
                              border: "1px dashed #d1d5db",
                              background: "#f9fafb",
                              color: "#9ca3af",
                              fontSize: 13,
                              fontWeight: 500,
                              letterSpacing: 0.3,
                            }}>Cancelled</span>
                          )}
                      </td>
                    </tr>

                    {isExpanded && o.items && o.items.length > 0 && (
                      <tr>
                        <td style={tdStyle} colSpan={8}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: 13,
                            }}
                          >
                            <thead>
                              <tr>
                                <th style={subThStyle}>Product</th>
                                <th style={subThStyle}>SKU</th>
                                <th style={subThStyle}>Quantity</th>
                                <th style={subThStyle}>Unit price</th>
                                <th style={subThStyle}>Discount</th>
                                <th style={subThStyle}>Line total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.items.map((item) => (
                                <tr key={item.item_id}>
                                  <td style={subTdStyle}>
                                    {item.product_name || "-"}
                                  </td>
                                  <td style={subTdStyle}>
                                    {item.product_sku || "-"}
                                  </td>
                                  <td style={subTdStyle}>
                                    {item.quantity}
                                  </td>
                                  <td style={subTdStyle}>
                                    {item.unit_price}
                                  </td>
                                  <td style={subTdStyle}>
                                    {item.discount_amount ?? "-"}
                                  </td>
                                  <td style={subTdStyle}>
                                    {item.line_total}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create SO modal */}
      <SalesOrderFormModal
        open={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onCreated={handleSalesOrderCreated}
      />
    </div>
  );
};

const thStyle = {
  textAlign: "left",
  padding: "8px 10px",
  fontWeight: 600,
  color: "#4b5563",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle = {
  padding: "6px 10px",
  color: "#374151",
  borderBottom: "1px solid #f3f4f6",
};

const subThStyle = {
  textAlign: "left",
  padding: "4px 6px",
  fontWeight: 600,
  color: "#4b5563",
};

const subTdStyle = {
  padding: "4px 6px",
  color: "#374151",
};

const renderStatusBadge = (statusRaw) => {
  const status = (statusRaw || "").toUpperCase();

  let bg = "#e5e7eb";
  let color = "#374151";
  let label = status || "-";

  if (status === "DRAFT") {
    bg = "#e5e7eb";
    color = "#6b7280";
  } else if (status === "CONFIRMED") {
    bg = "#dcfce7";
    color = "#166534";
  } else if (status === "PARTIALLY_SHIPPED") {
    bg = "#dbeafe";
    color = "#1d4ed8";
  } else if (status === "CLOSED") {
    bg = "#e5e7eb";
    color = "#111827";
  } else if (status === "CANCELLED") {
    bg = "#fee2e2";
    color = "#b91c1c";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
};

export default SalesOrdersPage;
