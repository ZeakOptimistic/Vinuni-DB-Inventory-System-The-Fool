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

  // Role-based flags used only for contextual messaging on the dashboard
  const role = user?.role;

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

        const computedPoMetrics = computePurchaseOrderMetrics(purchaseOrders);
        const computedSoMetrics = computeSalesOrderMetrics(salesOrders);
        const {
          recentPurchaseOrders,
          recentSalesOrders,
          ordersSeries,
        } = computeRecentOrdersAndSeries(purchaseOrders, salesOrders);

        setPoMetrics(computedPoMetrics);
        setSoMetrics(computedSoMetrics);
        setRecentPurchaseOrders(recentPurchaseOrders);
        setRecentSalesOrders(recentSalesOrders);
        setOrdersSeries(ordersSeries);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const [ordersSeries, setOrdersSeries] = useState([]);

  if (loading && !overview && !poMetrics && !soMetrics) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>DashBoard</h2>

      </div>

      {role && (
        <div
          style={{
            marginBottom: 12,
            padding: "6px 10px",
            borderRadius: 8,
            background:
              role === "CLERK"
                ? "#FEF3C7"
                : role === "MANAGER"
                ? "#DBEAFE"
                : "#E0F2FE",
            color:
              role === "CLERK"
                ? "#92400E"
                : role === "MANAGER"
                ? "#1D4ED8"
                : "#0369A1",
            fontSize: 13,
          }}
        >
          {role === "ADMIN" && (
            <>
              You are signed in as <strong>Admin</strong>. You have full
              access to master data, purchase flows, stock transfers, and
              reports.
            </>
          )}
          {role === "MANAGER" && (
            <>
              You are signed in as <strong>Manager</strong>. You can manage
              products, suppliers, locations, purchase orders, sales orders,
              stock transfers, and reports.
            </>
          )}
          {role === "CLERK" && (
            <>
              You are signed in as <strong>Clerk</strong>. You can create
              sales orders and view data, but master data, purchase orders,
              and transfers are read-only for your account.
            </>
          )}
        </div>
      )}

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
            Active: {overview ? overview.active_products : "—"}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-label">Purchase Orders</div>
          <div className="dashboard-card-value">
            {poMetrics ? poMetrics.total_purchase_orders : "—"}
          </div>
          <div className="dashboard-card-sub">
            Open: {poMetrics ? poMetrics.open_purchase_orders : "—"} · Closed:{" "}
            {poMetrics ? poMetrics.closed_purchase_orders : "—"}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-label">Sales Orders</div>
          <div className="dashboard-card-value">
            {soMetrics ? soMetrics.total_sales_orders : "—"}
          </div>
          <div className="dashboard-card-sub">
            Confirmed:{" "}
            {soMetrics ? soMetrics.confirmed_sales_orders : "—"} · Cancelled:{" "}
            {soMetrics ? soMetrics.cancelled_sales_orders : "—"}
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
            {overview && overview.stock_value_note
              ? overview.stock_value_note
              : "Based on unit_price × quantity from product overview."}
          </div>
        </div>
      </div>

      {/* Orders chart + low stock */}
      <div className="dashboard-grid-two">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            Orders in the last 7 days
          </div>
          <OrdersMiniChart series={ordersSeries} />
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">Low stock products</div>
          <LowStockTable rows={lowStockRows} />
        </div>
      </div>

      {/* Top selling products */}
      <div className="dashboard-card" style={{ marginTop: 16 }}>
        <div className="dashboard-card-header">Top selling products</div>
        <TopSellingTable rows={topSellingRows} />
      </div>

      {/* Recent orders */}
      <div className="dashboard-grid-two" style={{ marginTop: 16 }}>
        <div className="dashboard-card">
          <div className="dashboard-card-header">Recent purchase orders</div>
          <RecentPurchaseOrdersTable rows={recentPurchaseOrders} />
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">Recent sales orders</div>
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
 * Normalize list responses: handle both plain array
 * and paginated { results: [...] } shapes.
 */
const normalizeList = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.results)) return raw.results;
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

  return {
    total_purchase_orders: totalPurchaseOrders,
    open_purchase_orders: openPurchaseOrders,
    closed_purchase_orders: closedPurchaseOrders,
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

  return {
    total_sales_orders: totalSalesOrders,
    confirmed_sales_orders: confirmedSalesOrders,
    cancelled_sales_orders: cancelledSalesOrders,
  };
};

/**
 * Build:
 * - list of recent purchase orders
 * - list of recent sales orders
 * - 7-day orders series for the mini chart
 */
const computeRecentOrdersAndSeries = (purchaseOrders, salesOrders) => {
  const recentPurchaseOrders = sortByDateDesc(purchaseOrders, [
    "order_date",
    "created_at",
  ]).slice(0, 5);

  const recentSalesOrders = sortByDateDesc(salesOrders, [
    "order_date",
    "created_at",
  ]).slice(0, 5);

  const ordersSeries = buildOrdersSeries(purchaseOrders, salesOrders);

  return {
    recentPurchaseOrders,
    recentSalesOrders,
    ordersSeries,
  };
};

const buildOrdersSeries = (purchaseOrders, salesOrders) => {
  const today = new Date();
  const days = [];

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push(iso);
  }

  const map = {};
  days.forEach((iso) => {
    map[iso] = {
      dateIso: iso,
      poCount: 0,
      soCount: 0,
    };
  });

  const addOrder = (order, type) => {
    if (!order.order_date) return;
    const dateStr = String(order.order_date).slice(0, 10);
    if (!map[dateStr]) return;
    if (type === "PO") map[dateStr].poCount += 1;
    else map[dateStr].soCount += 1;
  };

  purchaseOrders.forEach((po) => addOrder(po, "PO"));
  salesOrders.forEach((so) => addOrder(so, "SO"));

  return days.map((iso) => {
    const row = map[iso];
    const d = new Date(iso);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const total = row.poCount + row.soCount;
    return {
      ...row,
      label,
      total,
    };
  });
};

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
 * Simple stacked bar chart for PO/SO counts in the last 7 days.
 */
const OrdersMiniChart = ({ series }) => {
  if (!series || series.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        No orders in the last 7 days.
      </div>
    );
  }

  const maxTotal =
    series.reduce((max, s) => Math.max(max, s.total), 0) || 1;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          height: 130,
          marginTop: 4,
        }}
      >
        {series.map((s) => {
          const poHeight = (s.poCount / maxTotal) * 100;
          const soHeight = (s.soCount / maxTotal) * 100;

          return (
            <div
              key={s.dateIso}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                fontSize: 11,
                color: "#6b7280",
              }}
            >
              <div
                style={{
                  height: 105,
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 2,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: `${poHeight || 0}%`,
                    background: "#2563eb",
                    borderRadius: "999px 999px 0 0",
                    transition: "height 0.2s",
                  }}
                  title={`PO: ${s.poCount}`}
                />
                <div
                  style={{
                    flex: 1,
                    height: `${soHeight || 0}%`,
                    background: "#10b981",
                    borderRadius: "999px 999px 0 0",
                    transition: "height 0.2s",
                  }}
                  title={`SO: ${s.soCount}`}
                />
              </div>
              <div style={{ marginTop: 4 }}>{s.label}</div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 11,
          color: "#6b7280",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginRight: 8,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#2563eb",
              marginRight: 4,
            }}
          />
          PO
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#10b981",
              marginRight: 4,
            }}
          />
          SO
        </span>
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
            <th style={thStyle}>Stock</th>
            <th style={thStyle}>Reorder level</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.product_id} style={{ borderTop: "1px solid #e5e7eb" }}>
              <td style={tdStyle}>{r.name}</td>
              <td style={tdStyle}>{r.sku}</td>
              <td style={tdStyle}>{r.stock_quantity}</td>
              <td style={tdStyle}>{r.reorder_level}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TopSellingTable = ({ rows }) => {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        Not enough sales data to calculate top-selling products.
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
            <th style={thStyle}>Quantity sold</th>
            <th style={thStyle}>Total revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.product_id} style={{ borderTop: "1px solid #e5e7eb" }}>
              <td style={tdStyle}>{r.product_name}</td>
              <td style={tdStyle}>{r.product_sku}</td>
              <td style={tdStyle}>{r.total_quantity}</td>
              <td style={tdStyle}>{formatCurrency(r.total_revenue)}</td>
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
