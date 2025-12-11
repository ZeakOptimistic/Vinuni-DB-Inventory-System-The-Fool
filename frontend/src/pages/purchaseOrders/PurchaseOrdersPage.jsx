// src/pages/purchaseOrders/PurchaseOrdersPage.jsx
import React, { useEffect, useState } from "react";
import { purchaseOrderApi } from "../../api/purchaseOrderApi";
import { useAuth } from "../../hooks/useAuth";
import PurchaseOrderFormModal from "../../components/purchaseOrders/PurchaseOrderFormModal";

/**
 * PurchaseOrdersPage:
 * - Shows a list of purchase orders from the backend
 * - Allows filtering by supplier name, status, and location name (client-side)
 * - Allows staff users to trigger "Receive all"
 * - Allows staff users to create a new PO via modal
 */
const PurchaseOrdersPage = () => {
  const { user } = useAuth();
  const isStaff =
    user && ["ADMIN", "MANAGER", "CLERK"].includes(user.role);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [receiveLoadingId, setReceiveLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [receiveError, setReceiveError] = useState(null);

  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await purchaseOrderApi.list();
      setOrders(data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load purchase orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toggleExpand = (poId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(poId)) next.delete(poId);
      else next.add(poId);
      return next;
    });
  };

  const handleReceiveAll = async (order) => {
    setReceiveError(null);

    const hasRemaining =
      order.items &&
      order.items.some(
        (item) => Number(item.ordered_qty) > Number(item.received_qty || 0)
      );

    if (!hasRemaining) {
      setReceiveError("This purchase order has nothing left to receive.");
      return;
    }

    const confirmMsg = `Receive all remaining items for PO #${order.po_id} from ${order.supplier_name}?`;
    const ok = window.confirm(confirmMsg);
    if (!ok) return;

    setReceiveLoadingId(order.po_id);
    try {
      const updated = await purchaseOrderApi.receiveAll(order.po_id);
      setOrders((prev) =>
        prev.map((o) => (o.po_id === order.po_id ? updated : o))
      );
    } catch (err) {
      console.error(err);
      const msg =
        (err.response &&
          err.response.data &&
          err.response.data.detail) ||
        "Failed to receive items for this purchase order.";
      setReceiveError(msg);
    } finally {
      setReceiveLoadingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const supplierMatch = filterSupplier
      ? (o.supplier_name || "")
          .toLowerCase()
          .includes(filterSupplier.toLowerCase())
      : true;
    const statusMatch = filterStatus ? o.status === filterStatus : true;
    const locationMatch = filterLocation
      ? (o.location_name || "")
          .toLowerCase()
          .includes(filterLocation.toLowerCase())
      : true;
    return supplierMatch && statusMatch && locationMatch;
  });

  const handlePoCreated = (created) => {
    // Prepend new PO to the list
    setOrders((prev) => [created, ...prev]);
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Purchase Orders</h2>

        {isStaff && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            New Purchase Order
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
          placeholder="Filter by supplier name..."
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
          className="form-input"
          style={{ maxWidth: 220 }}
        />

        <input
          type="text"
          placeholder="Filter by location..."
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="form-input"
          style={{ maxWidth: 220 }}
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="form-input"
          style={{ maxWidth: 180 }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="APPROVED">APPROVED</option>
          <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>

      {/* Status messages */}
      {loading && <div>Loading purchase orders...</div>}
      {error && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      {receiveError && (
        <div
          className="form-error"
          style={{ marginBottom: 12, background: "#fffbeb", color: "#92400e" }}
        >
          {receiveError}
        </div>
      )}

      {!loading && filteredOrders.length === 0 && (
        <div style={{ padding: 12, borderRadius: 8, background: "#f3f4f6" }}>
          No purchase orders found.
        </div>
      )}

      {/* Table */}
      {filteredOrders.length > 0 && (
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
                <th style={thStyle}>PO #</th>
                <th style={thStyle}>Supplier</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Order Date</th>
                <th style={thStyle}>Expected Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Created By</th>
                <th style={thStyle}>Created At</th>
                <th style={thStyle}>Items</th>
                {isStaff && <th style={thStyle}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => {
                const isExpanded = expandedIds.has(o.po_id);

                const hasRemaining =
                  o.items &&
                  o.items.some(
                    (item) =>
                      Number(item.ordered_qty) >
                      Number(item.received_qty || 0)
                  );

                return (
                  <React.Fragment key={o.po_id}>
                    <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                      <td style={tdStyle}>{o.po_id}</td>
                      <td style={tdStyle}>{o.supplier_name}</td>
                      <td style={tdStyle}>{o.location_name}</td>
                      <td style={tdStyle}>{o.order_date}</td>
                      <td style={tdStyle}>{o.expected_date || "-"}</td>
                      <td style={tdStyle}>
                        <StatusBadge status={o.status} />
                      </td>
                      <td style={tdStyle}>
                        {o.total_amount != null ? `${o.total_amount} ₫` : "-"}
                      </td>
                      <td style={tdStyle}>{o.created_by_id}</td>
                      <td style={tdStyle}>
                        {o.created_at
                          ? new Date(o.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                          }}
                          onClick={() => toggleExpand(o.po_id)}
                        >
                          {isExpanded ? "Hide items" : "Show items"}
                        </button>
                      </td>
                      {isStaff && (
                        <td style={tdStyle}>
                          {o.status === "CLOSED" || !hasRemaining ? (
                            <span
                              style={{
                                fontSize: 12,
                                color: "#6b7280",
                              }}
                            >
                              Fully received
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{
                                fontSize: 12,
                                padding: "4px 10px",
                              }}
                              onClick={() => handleReceiveAll(o)}
                              disabled={receiveLoadingId === o.po_id}
                            >
                              {receiveLoadingId === o.po_id
                                ? "Receiving..."
                                : "Receive all"}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>

                    {/* Expanded row for items */}
                    {isExpanded && (
                      <tr>
                        <td
                          style={{
                            padding: 0,
                            borderTop: "1px solid #e5e7eb",
                            background: "#f9fafb",
                          }}
                          colSpan={isStaff ? 11 : 10}
                        >
                          <div style={{ padding: "8px 12px" }}>
                            {o.items && o.items.length > 0 ? (
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
                                    <th style={subThStyle}>Ordered</th>
                                    <th style={subThStyle}>Received</th>
                                    <th style={subThStyle}>Unit price</th>
                                    <th style={subThStyle}>Line total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {o.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td style={subTdStyle}>
                                        {item.product_name}
                                      </td>
                                      <td style={subTdStyle}>{item.sku}</td>
                                      <td style={subTdStyle}>
                                        {item.ordered_qty}
                                      </td>
                                      <td style={subTdStyle}>
                                        {item.received_qty}
                                      </td>
                                      <td style={subTdStyle}>
                                        {item.unit_price != null
                                          ? `${item.unit_price} ₫`
                                          : "-"}
                                      </td>
                                      <td style={subTdStyle}>
                                        {item.line_total != null
                                          ? `${item.line_total} ₫`
                                          : "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "#6b7280",
                                }}
                              >
                                No items found for this purchase order.
                              </div>
                            )}
                          </div>
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

      {/* Modal: create PO */}
      {isStaff && (
        <PurchaseOrderFormModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handlePoCreated}
        />
      )}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  let bg = "#e5e7eb";
  let color = "#374151";

  if (status === "APPROVED") {
    bg = "#dbeafe";
    color = "#1d4ed8";
  } else if (status === "PARTIALLY_RECEIVED") {
    bg = "#fef3c7";
    color = "#92400e";
  } else if (status === "CLOSED") {
    bg = "#dcfce7";
    color = "#15803d";
  } else if (status === "DRAFT") {
    bg = "#e5e7eb";
    color = "#4b5563";
  }

  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        background: bg,
        color,
      }}
    >
      {status}
    </span>
  );
};

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 600,
  color: "#4b5563",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle = {
  padding: "8px 12px",
  color: "#374151",
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

export default PurchaseOrdersPage;
