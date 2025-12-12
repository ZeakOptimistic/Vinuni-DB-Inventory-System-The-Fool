// src/pages/purchaseOrders/PurchaseOrdersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { purchaseOrderApi } from "../../api/purchaseOrderApi";
import { useAuth } from "../../hooks/useAuth";
import PurchaseOrderFormModal from "../../components/purchaseOrders/PurchaseOrderFormModal";

/**
 * PurchaseOrdersPage:
 * - Shows a list of purchase orders from the backend
 * - Supports client-side filtering by supplier, status, and location
 * - Allows ADMIN / MANAGER to create purchase orders and trigger "Receive all"
 * - CLERK users can only view the list in read-only mode
 */
const PurchaseOrdersPage = () => {
  const { user } = useAuth();

  // Permission flags derived from the authenticated user role
  const canManagePurchaseOrders =
    user && (user.role === "ADMIN" || user.role === "MANAGER");
  const isClerk = user && user.role === "CLERK";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  const [expandedIds, setExpandedIds] = useState(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [receivingId, setReceivingId] = useState(null);

  // ------------- Data loading -------------

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await purchaseOrderApi.list();
      // API returns a simple array of purchase orders
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

  // ------------- Derived data -------------

  const filteredOrders = useMemo(() => {
    const supplierFilter = filterSupplier.trim().toLowerCase();
    const statusFilter = filterStatus.trim().toUpperCase();
    const locationFilter = filterLocation.trim().toLowerCase();

    return (orders || []).filter((o) => {
      const supplierName = (o.supplier_name || "").toLowerCase();
      const status = (o.status || "").toUpperCase();
      const locationName = (o.location_name || "").toLowerCase();

      const matchSupplier =
        !supplierFilter || supplierName.includes(supplierFilter);
      const matchStatus = !statusFilter || status === statusFilter;
      const matchLocation =
        !locationFilter || locationName.includes(locationFilter);

      return matchSupplier && matchStatus && matchLocation;
    });
  }, [orders, filterSupplier, filterStatus, filterLocation]);

  // ------------- Handlers -------------

  const toggleExpand = (poId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(poId)) {
        next.delete(poId);
      } else {
        next.add(poId);
      }
      return next;
    });
  };

  const handleOpenCreateModal = () => {
    if (!canManagePurchaseOrders) return;
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handlePurchaseOrderCreated = (created) => {
    if (!created) return;
    // Prepend new PO to the list for instant feedback
    setOrders((prev) => [created, ...(prev || [])]);
  };

  const handleReceiveAll = async (order) => {
    if (!canManagePurchaseOrders) {
      alert("You do not have permission to receive purchase orders.");
      return;
    }

    if (!order || !order.po_id) return;

    const hasRemaining =
      order.items &&
      order.items.some(
        (item) =>
          Number(item.ordered_qty) > Number(item.received_qty || 0)
      );

    if (!hasRemaining) {
      alert("All items in this purchase order have already been received.");
      return;
    }

    const confirmed = window.confirm(
      `Receive all remaining items for PO #${order.po_id}?`
    );
    if (!confirmed) return;

    setReceivingId(order.po_id);
    try {
      const updated = await purchaseOrderApi.receiveAll(order.po_id);
      // Replace the updated PO in the list
      setOrders((prev) =>
        (prev || []).map((o) =>
          o.po_id === updated.po_id ? updated : o
        )
      );
    } catch (err) {
      console.error(err);
      alert(
        "Failed to receive all items for this purchase order. Please try again."
      );
    } finally {
      setReceivingId(null);
    }
  };

  // ------------- Render -------------

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
        <h2 style={{ margin: 0 }}>Purchase Orders</h2>

        {canManagePurchaseOrders && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateModal}
          >
            New Purchase Order
          </button>
        )}
      </div>

      {/* Read-only notice for Clerk */}
      {isClerk && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 10px",
            borderRadius: 8,
            background: "#FEF3C7",
            color: "#92400E",
            fontSize: 13,
          }}
        >
          You are signed in as <strong>Clerk</strong>. This page is read-only:
          you can search and view purchase orders, but only managers and
          admins can create new orders or perform receipt operations.
        </div>
      )}

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
          placeholder="Filter by supplier..."
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
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
          style={{ minWidth: 160 }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="APPROVED">Approved</option>
          <option value="PARTIALLY_RECEIVED">Partially received</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Error / loading / empty states */}
      {error && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading && <div>Loading purchase orders...</div>}

      {!loading && filteredOrders.length === 0 && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#f3f4f6",
          }}
        >
          No purchase orders found with the current filters.
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
                <th style={thStyle}>PO #</th>
                <th style={thStyle}>Supplier</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Order Date</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Created At</th>
                <th style={thStyle}>Items</th>
                {canManagePurchaseOrders && <th style={thStyle}>Actions</th>}
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
                    <tr>
                      <td style={tdStyle}>{o.po_id}</td>
                      <td style={tdStyle}>{o.supplier_name}</td>
                      <td style={tdStyle}>{o.location_name || "-"}</td>
                      <td style={tdStyle}>
                        {(() => {
                          const { bg, fg, label } = getPoStatusStyles(o.status);
                          return (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: 14,
                                fontWeight: 500,
                                background: bg,
                                color: fg,
                              }}
                            >
                              {label}
                            </span>
                          );
                        })()}
                      </td>
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
                            style={{
                              fontSize: 13,
                              padding: "4px 8px",
                            }}
                            type="button"
                            className="btn btn-xs btn-outline"
                            onClick={() => toggleExpand(o.po_id)}
                          >
                            {isExpanded
                              ? "Hide items"
                              : `View items (${o.items.length})`}
                          </button>
                        ) : (
                          <span style={{ color: "#6b7280" }}>No items</span>
                        )}
                      </td>
                      {canManagePurchaseOrders && (
                        <td style={tdStyle}>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              style={{
                                fontSize: 13,
                                padding: "4px 8px",
                              }}
                              type="button"
                              className="btn btn-xs btn-outline"
                              disabled={!hasRemaining || receivingId === o.po_id}
                              onClick={() => handleReceiveAll(o)}
                              title={
                                hasRemaining
                                  ? "Receive all remaining items"
                                  : "All items have already been received"
                              }
                              >
                              {receivingId === o.po_id
                                ? "Receiving..."
                                : "Receive all"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Expanded row for line items */}
                    {isExpanded && o.items && o.items.length > 0 && (
                      <tr>
                        <td
                          style={tdStyle}
                          colSpan={canManagePurchaseOrders ? 9 : 8}
                        >
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
                              {o.items.map((item) => (
                                <tr key={item.item_id}>
                                  <td style={subTdStyle}>
                                    {item.product_name || "-"}
                                  </td>
                                  <td style={subTdStyle}>
                                    {item.product_sku || "-"}
                                  </td>
                                  <td style={subTdStyle}>
                                    {item.ordered_qty}
                                  </td>
                                  <td style={subTdStyle}>
                                    {item.received_qty}
                                  </td>
                                  <td style={subTdStyle}>
                                    {item.unit_price}
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

      {/* Create PO modal (only used by ADMIN / MANAGER) */}
      <PurchaseOrderFormModal
        open={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onCreated={handlePurchaseOrderCreated}
      />
    </div>
  );
};

const getPoStatusStyles = (status) => {
  const value = (status || "").toUpperCase();

  // Default styling
  let bg = "#e5e7eb";  // gray-200
  let fg = "#374151";  // gray-700
  let label = status || "UNKNOWN";

  if (value === "DRAFT") {
    bg = "#e5e7eb"; // gray
    fg = "#374151";
    label = "Draft";
  } else if (value === "APPROVED") {
    bg = "#dbeafe"; // blue-100
    fg = "#1d4ed8"; // blue-700
    label = "Approved";
  } else if (value === "PARTIALLY_RECEIVED") {
    bg = "#fef3c7"; // amber-100
    fg = "#92400e"; // amber-800
    label = "Partially received";
  } else if (value === "CLOSED") {
    bg = "#dcfce7"; // green-100
    fg = "#166534"; // green-700
    label = "Closed";
  } else if (value === "CANCELLED") {
    bg = "#fee2e2"; // red-100
    fg = "#b91c1c"; // red-700
    label = "Cancelled";
  }

  return { bg, fg, label };
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
  borderBottom: "1px solid #e5e7eb",
};

const subTdStyle = {
  padding: "4px 6px",
  color: "#374151",
};

export default PurchaseOrdersPage;
