// src/pages/dashboard/DashboardPage.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { reportApi } from "../../api/reportApi";
import { purchaseOrderApi } from "../../api/purchaseOrderApi";
import { salesOrderApi } from "../../api/salesOrderApi";

/**
 * DashboardPage
 *
 * Data sources:
 * - /api/reports/overview/      → product & stock cards
 * - /api/reports/low-stock/     → low-stock table
 * - /api/reports/top-selling/   → top-selling chart
 * - /api/purchase-orders/       → purchase order metrics + recent PO
 * - /api/sales-orders/          → sales order metrics + recent SO
 */
const DashboardPage = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [lowStockRows, setLowStockRows] = useState([]);
  const [topSellingRows, setTopSellingRows] = useState([]);

  const [poMetrics, setPoMetrics] = useState(null);
  const [soMetrics, setSoMetrics] = useState(null);
  const [recentPurchaseOrders, setRecentPurchaseOrders] = useState([]);
  const [recentSalesOrders, setRecentSalesOrders] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          overviewData,
          lowStockData,
          topSellingData,
          poListRaw,
          soListRaw,
        ] = await Promise.all([
          reportApi.getOverview(),
          reportApi.getLowStock(),
          reportApi.getTopSelling(),
          purchaseOrderApi.list(),
          salesOrderApi.list(),
        ]);

        setOverview(overviewData || null);
        setLowStockRows(Array.isArray(lowStockData) ? lowStockData : []);
        setTopSellingRows(Array.isArray(topSellingData) ? topSellingData : []);

        const purchaseOrders = normalizeList(poListRaw);
        const salesOrders = normalizeList(soListRaw);

        const {
          totalPurchaseOrders,
          openPurchaseOrders,
          closedPurchaseOrders,
          recentPO,
        } = computePurchaseOrderMetrics(purchaseOrders);

        const {
          totalSalesOrders,
          confirmedSalesOrders,
          cancelledSalesOrders,
          recentSO,
        } = computeSalesOrderMetrics(salesOrders);

        setPoMetrics({
          totalPurchaseOrders,
          openPurchaseOrders,
          closedPurchaseOrders,
        });

        setSoMetrics({
          totalSalesOrders,
          confirmedSalesOrders,
          cancelledSalesOrders,
        });

        setRecentPurchaseOrders(recentPO);
        setRecentSalesOrders(recentSO);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading && !overview && !poMetrics && !soMetrics) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Dashboard</h2>

      {error && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card-label">Products</div>
          <div className="dashboard-card-value">
            {overview ? overview.total_products : "—"}
          </div>
          <div className="dashboard-card-sub">
            Low-stock products:{" "}
            {overview ? overview.low_stock_count : "—"}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-label">Purchase Orders</div>
          <div className="dashboard-card-value">
            {poMetrics ? poMetrics.totalPurchaseOrders : "—"}
          </div>
          <div className="dashboard-card-sub">
            Open: {poMetrics ? poMetrics.openPurchaseOrders : "—"} · Closed:{" "}
            {poMetrics ? poMetrics.closedPurchaseOrders : "—"}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-label">Sales Orders</div>
          <div className="dashboard-card-value">
            {soMetrics ? soMetrics.totalSalesOrders : "—"}
          </div>
          <div className="dashboard-card-sub">
            Confirmed: {soMetrics ? soMetrics.confirmedSalesOrders : "—"} ·
            Cancelled: {soMetrics ? soMetrics.cancelledSalesOrders : "—"}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-label">Estimated stock value</div>
          <div className="dashboard-card-value">
            {overview && overview.total_stock_value != null
              ? formatCurrency(overview.total_stock_value)
              : "N/A"}
          </div>
          <div className="dashboard-card-sub">
            Snapshot from SQL inventory views.
          </div>
        </div>
      </div>

      {/* Top-selling chart + low stock table */}
      <div className="dashboard-grid-two">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            Top selling products (last 30 days)
          </div>
          <TopSellingChart rows={topSellingRows} />
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">Low stock products</div>
          <LowStockTable rows={lowStockRows} />
        </div>
      </div>

      {/* Recent orders */}
      <div className="dashboard-grid-two">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            Recent purchase orders
          </div>
          <RecentPurchaseOrdersTable rows={recentPurchaseOrders} />
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            Recent sales orders
          </div>
          <RecentSalesOrdersTable rows={recentSalesOrders} />
        </div>
      </div>

      {user && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          Signed in as <strong>{user.username}</strong> ({user.role})
        </div>
      )}
    </div>
  );
};

/**
 * Normalize list responses: handle both plain array and DRF pagination.
 */
const normalizeList = (maybeList) => {
  if (!maybeList) return [];
  if (Array.isArray(maybeList)) return maybeList;
  if (Array.isArray(maybeList.results)) return maybeList.results;
  return [];
};

const computePurchaseOrderMetrics = (purchaseOrders) => {
  const totalPurchaseOrders = purchaseOrders.length;
  const openStatuses = ["DRAFT", "APPROVED", "PARTIALLY_RECEIVED"];

  const openPurchaseOrders = purchaseOrders.filter((po) =>
    openStatuses.includes(po.status)
  ).length;

  const closedPurchaseOrders = purchaseOrders.filter(
    (po) => po.status === "CLOSED"
  ).length;

  const recentPO = sortByDateDesc(purchaseOrders, [
    "order_date",
    "created_at",
  ]).slice(0, 5);

  return {
    totalPurchaseOrders,
    openPurchaseOrders,
    closedPurchaseOrders,
    recentPO,
  };
};

const computeSalesOrderMetrics = (salesOrders) => {
  const totalSalesOrders = salesOrders.length;

  const confirmedSalesOrders = salesOrders.filter(
    (so) => so.status === "CONFIRMED"
  ).length;

  const cancelledSalesOrders = salesOrders.filter(
    (so) => so.status === "CANCELLED"
  ).length;

  const recentSO = sortByDateDesc(salesOrders, [
    "order_date",
    "created_at",
  ]).slice(0, 5);

  return {
    totalSalesOrders,
    confirmedSalesOrders,
    cancelledSalesOrders,
    recentSO,
  };
};

/**
 * Sort items descending by any of the provided date fields.
 */
const sortByDateDesc = (items, fields) => {
  const getDate = (obj) => {
    for (const f of fields) {
      if (obj[f]) return new Date(obj[f]);
    }
    return null;
  };

  return [...items].sort((a, b) => {
    const da = getDate(a);
    const db = getDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db - da;
  });
};

const formatCurrency = (value) => {
  if (value == null || Number.isNaN(value)) return "N/A";
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  } catch (e) {
    const num = Number(value) || 0;
    return `${num.toFixed(0)} ₫`;
  }
};

/**
 * Simple horizontal bar chart for top-selling products.
 * Data comes from view_top_selling_products_last_30_days.
 */
const TopSellingChart = ({ rows }) => {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        No sales data in the last 30 days.
      </div>
    );
  }

  const topRows = rows.slice(0, 5);
  const maxQty =
    topRows.reduce(
      (max, r) => Math.max(max, Number(r.total_qty_sold || 0)),
      0
    ) || 1;

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 8,
        }}
      >
        {topRows.map((r) => {
          const qty = Number(r.total_qty_sold || 0);
          const width = Math.max(5, (qty / maxQty) * 100);

          return (
            <div key={r.product_id} style={{ fontSize: 13 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <span>
                  {r.product_name}{" "}
                  <span style={{ color: "#9ca3af" }}>({r.sku})</span>
                </span>
                <span style={{ color: "#6b7280" }}>{qty}</span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: "#e5e7eb",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${width}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "#2563eb",
                    transition: "width 0.2s",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: "#6b7280",
        }}
      >
        Showing top {Math.min(topRows.length, 5)} products by quantity sold.
      </div>
    </div>
  );
};

const LowStockTable = ({ rows }) => {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        No products below reorder level.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>Product</th>
            <th style={thStyle}>SKU</th>
            <th style={thStyle}>Location</th>
            <th style={thStyle}>On hand</th>
            <th style={thStyle}>Reorder level</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.product_id}-${r.location_id}`}
              style={{ borderTop: "1px solid #e5e7eb" }}
            >
              <td style={tdStyle}>{r.product_name}</td>
              <td style={tdStyle}>{r.sku}</td>
              <td style={tdStyle}>{r.location_name}</td>
              <td style={tdStyle}>{r.quantity_on_hand}</td>
              <td style={tdStyle}>{r.reorder_level}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RecentPurchaseOrdersTable = ({ rows }) => {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        No recent purchase orders.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>PO #</th>
            <th style={thStyle}>Supplier</th>
            <th style={thStyle}>Location</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Order date</th>
            <th style={thStyle}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.po_id} style={{ borderTop: "1px solid #e5e7eb" }}>
              <td style={tdStyle}>{o.po_id}</td>
              <td style={tdStyle}>{o.supplier_name}</td>
              <td style={tdStyle}>{o.location_name}</td>
              <td style={tdStyle}>{o.status}</td>
              <td style={tdStyle}>{o.order_date}</td>
              <td style={tdStyle}>
                {o.total_amount != null
                  ? formatCurrency(o.total_amount)
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RecentSalesOrdersTable = ({ rows }) => {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        No recent sales orders.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>SO #</th>
            <th style={thStyle}>Customer</th>
            <th style={thStyle}>Location</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Order date</th>
            <th style={thStyle}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.so_id} style={{ borderTop: "1px solid #e5e7eb" }}>
              <td style={tdStyle}>{o.so_id}</td>
              <td style={tdStyle}>{o.customer_name || "-"}</td>
              <td style={tdStyle}>{o.location_name}</td>
              <td style={tdStyle}>{o.status}</td>
              <td style={tdStyle}>{o.order_date}</td>
              <td style={tdStyle}>
                {o.total_amount != null
                  ? formatCurrency(o.total_amount)
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const thStyle = {
  textAlign: "left",
  padding: "8px 10px",
  fontWeight: 600,
  color: "#4b5563",
};

const tdStyle = {
  padding: "6px 10px",
  color: "#374151",
};

export default DashboardPage;
