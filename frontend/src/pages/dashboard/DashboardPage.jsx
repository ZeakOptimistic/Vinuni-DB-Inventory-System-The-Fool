// src/pages/dashboard/DashboardPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { reportApi } from "../../api/reportApi";
import { purchaseOrderApi } from "../../api/purchaseOrderApi";
import { salesOrderApi } from "../../api/salesOrderApi";

const PREVIEW_LIMIT = 6;
const RANGE_OPTIONS = [7, 14, 30];

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = user?.role;
  const canViewReports = role === "ADMIN" || role === "MANAGER";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [lowStockRows, setLowStockRows] = useState([]);
  const [topSellingRows, setTopSellingRows] = useState([]);

  const [purchaseOrdersAll, setPurchaseOrdersAll] = useState([]);
  const [salesOrdersAll, setSalesOrdersAll] = useState([]);

  const [poMetrics, setPoMetrics] = useState(null);
  const [soMetrics, setSoMetrics] = useState(null);

  const [rangeDays, setRangeDays] = useState(14);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [overviewData, lowStockData, topSellingData, poListRaw, soListRaw] =
          await Promise.all([
            reportApi.getOverview(),
            reportApi.getLowStock(),
            reportApi.getTopSelling(),
            purchaseOrderApi.list(),
            salesOrderApi.list(),
          ]);

        setOverview(overviewData || null);

        // Be robust: accept array or {results: []}
        setLowStockRows(normalizeList(lowStockData));
        setTopSellingRows(normalizeList(topSellingData));

        const purchaseOrders = normalizeList(poListRaw);
        const salesOrders = normalizeList(soListRaw);

        setPurchaseOrdersAll(purchaseOrders);
        setSalesOrdersAll(salesOrders);

        setPoMetrics(computePurchaseOrderMetrics(purchaseOrders));
        setSoMetrics(computeSalesOrderMetrics(salesOrders));
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const ordersSeries = useMemo(() => {
    return buildOrdersSeries(purchaseOrdersAll, salesOrdersAll, rangeDays);
  }, [purchaseOrdersAll, salesOrdersAll, rangeDays]);

  const revenueSeries = useMemo(() => {
    return buildSalesRevenueSeries(salesOrdersAll, rangeDays);
  }, [salesOrdersAll, rangeDays]);

  const lowStockPreview = useMemo(() => {
    return (lowStockRows || []).slice(0, PREVIEW_LIMIT);
  }, [lowStockRows]);

  const topSellingPreview = useMemo(() => {
    return (topSellingRows || []).slice(0, PREVIEW_LIMIT);
  }, [topSellingRows]);

  if (loading && !overview && !poMetrics && !soMetrics) {
    return <div>Loading dashboard...</div>;
  }

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
        <h2 style={{ margin: 0 }}>Dashboard</h2>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/sales-orders")}
          >
            Sales Orders
          </button>

          {role !== "CLERK" && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate("/purchase-orders")}
            >
              Purchase Orders
            </button>
          )}

          {canViewReports && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/reports")}
            >
              Reports
            </button>
          )}
        </div>
      </div>

      {/* Role banner */}
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
              You are signed in as <strong>Admin</strong>. You have full access
              to master data, purchase flows, stock transfers, and reports.
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
              You are signed in as <strong>Clerk</strong>. You can create sales
              orders and view data, but master data, purchase orders, and
              transfers are read-only for your account.
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
            Confirmed: {soMetrics ? soMetrics.confirmed_sales_orders : "—"} ·
            Cancelled: {soMetrics ? soMetrics.cancelled_sales_orders : "—"}
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

      {/* Trends (visual, not history) */}
      <div className="dashboard-grid-two" style={{ marginTop: 16 }}>
        <div className="dashboard-card">
          <CardHeader
            title={`Orders trend (last ${rangeDays} days)`}
            right={
              <RangeSelect value={rangeDays} onChange={setRangeDays} />
            }
          />
          <OrdersMiniChart series={ordersSeries} />
        </div>

        <div className="dashboard-card">
          <CardHeader
            title={`Sales revenue trend (last ${rangeDays} days)`}
            right={
              <RangeSelect value={rangeDays} onChange={setRangeDays} />
            }
          />
          <MiniLineChart
            series={revenueSeries}
            valueLabel="Revenue"
            formatValue={formatCurrency}
          />
        </div>
      </div>

      {/* Highlights (short, actionable) */}
      <div className="dashboard-grid-two" style={{ marginTop: 16 }}>
        <div className="dashboard-card">
          <CardHeader
            title={`Low stock highlights`}
            right={
              canViewReports ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate("/reports")}
                >
                  View reports
                </button>
              ) : null
            }
          />
          <LowStockHighlights
            rows={lowStockPreview}
            totalCount={(lowStockRows || []).length}
          />
        </div>

        <div className="dashboard-card">
          <CardHeader
            title={`Top selling highlights`}
            right={
              canViewReports ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate("/reports")}
                >
                  View reports
                </button>
              ) : null
            }
          />
          <TopSellingHighlights
            rows={topSellingPreview}
            totalCount={(topSellingRows || []).length}
          />
        </div>
      </div>

      {user && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
          Signed in as <strong>{user.username}</strong> ({user.role})
        </div>
      )}
    </div>
  );
};

/** ---------- Small UI helpers ---------- */

const CardHeader = ({ title, right }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 8,
      }}
    >
      <div className="dashboard-card-header" style={{ marginBottom: 0 }}>
        {title}
      </div>
      {right}
    </div>
  );
};

const RangeSelect = ({ value, onChange }) => {
  return (
    <select
      className="form-input"
      style={{ height: 34, fontSize: 12, padding: "6px 8px" }}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {RANGE_OPTIONS.map((d) => (
        <option key={d} value={d}>
          Last {d}d
        </option>
      ))}
    </select>
  );
};

/** ---------- Data helpers ---------- */

const normalizeList = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.results)) return raw.results;
  return [];
};

const pickOrderDateIso = (order) => {
  const v = order?.order_date || order?.created_at;
  if (!v) return null;
  return String(v).slice(0, 10);
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

const buildOrdersSeries = (purchaseOrders, salesOrders, daysBack) => {
  const today = new Date();
  const days = [];

  for (let i = daysBack - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push(iso);
  }

  const map = {};
  days.forEach((iso) => {
    map[iso] = { dateIso: iso, poCount: 0, soCount: 0 };
  });

  purchaseOrders.forEach((po) => {
    const iso = pickOrderDateIso(po);
    if (!iso || !map[iso]) return;
    map[iso].poCount += 1;
  });

  salesOrders.forEach((so) => {
    const iso = pickOrderDateIso(so);
    if (!iso || !map[iso]) return;
    map[iso].soCount += 1;
  });

  return days.map((iso) => {
    const row = map[iso];
    const d = new Date(`${iso}T00:00:00`);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const total = row.poCount + row.soCount;
    return { ...row, label, total };
  });
};

const buildSalesRevenueSeries = (salesOrders, daysBack) => {
  const today = new Date();
  const days = [];

  for (let i = daysBack - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push(iso);
  }

  const map = {};
  days.forEach((iso) => {
    map[iso] = { dateIso: iso, value: 0 };
  });

  (salesOrders || []).forEach((so) => {
    const iso = pickOrderDateIso(so);
    if (!iso || !map[iso]) return;
    const amount = Number(so.total_amount);
    if (!Number.isFinite(amount)) return;
    map[iso].value += amount;
  });

  return days.map((iso) => {
    const d = new Date(`${iso}T00:00:00`);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    return { dateIso: iso, label, value: map[iso].value };
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
  } catch {
    const num = Number(value) || 0;
    return `${num.toFixed(0)} ₫`;
  }
};

/** ---------- Charts (simple, lightweight) ---------- */

const OrdersMiniChart = ({ series }) => {
  if (!series || series.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        No orders in the selected range.
      </div>
    );
  }

  const maxTotal = series.reduce((m, s) => Math.max(m, s.total), 0) || 1;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
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
                fontSize: 10,
                color: "#6b7280",
                minWidth: 6,
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
                title={`${s.label} | PO ${s.poCount} | SO ${s.soCount}`}
              >
                <div
                  style={{
                    flex: 1,
                    height: `${poHeight || 0}%`,
                    background: "#2563eb",
                    borderRadius: "999px 999px 0 0",
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    height: `${soHeight || 0}%`,
                    background: "#10b981",
                    borderRadius: "999px 999px 0 0",
                  }}
                />
              </div>
              <div style={{ marginTop: 4 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 4, fontSize: 11, color: "#6b7280" }}>
        <span style={{ display: "inline-flex", alignItems: "center", marginRight: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "#2563eb", marginRight: 4 }} />
          PO
        </span>
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "#10b981", marginRight: 4 }} />
          SO
        </span>
      </div>
    </div>
  );
};

const MiniLineChart = ({ series, valueLabel, formatValue }) => {
  if (!series || series.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        No data in the selected range.
      </div>
    );
  }

  const values = series.map((s) => Number(s.value) || 0);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  const points = series
    .map((s, idx) => {
      const x = (idx / Math.max(series.length - 1, 1)) * 100;
      const y = 28 - ((Number(s.value) - min) / span) * 24;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const last = series[series.length - 1]?.value || 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {valueLabel}: <strong style={{ color: "#111827" }}>{formatValue(last)}</strong>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Max: {formatValue(max)}
        </div>
      </div>

      <svg viewBox="0 0 100 30" width="100%" height="110" style={{ marginTop: 8 }}>
        <polyline
          fill="none"
          stroke="#2563eb"
          strokeWidth="1.6"
          points={points}
        />
      </svg>

      <div style={{ fontSize: 11, color: "#6b7280" }}>
        Hover on chart bars (orders) for tooltip. Revenue is the polyline trend.
      </div>
    </div>
  );
};

/** ---------- Highlights (short lists, not full tables) ---------- */

const LowStockHighlights = ({ rows, totalCount }) => {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        No products below reorder level.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        Showing {rows.length} of {totalCount} low-stock items
      </div>

      {rows.map((r) => {
        const stock = Number(r.stock_quantity) || 0;
        const reorder = Number(r.reorder_level) || 0;
        const pct =
          reorder > 0 ? Math.max(0, Math.min(100, (stock / reorder) * 100)) : 100;
        const deficit = reorder - stock;

        return (
          <div key={r.product_id} style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 600, color: "#111827", fontSize: 13 }}>
                {r.name}
              </div>
              <div style={{ fontSize: 12, color: deficit > 0 ? "#b91c1c" : "#6b7280" }}>
                Stock {stock} / RL {reorder}
              </div>
            </div>

            <div style={{ marginTop: 6, height: 8, background: "#e5e7eb", borderRadius: 999 }}>
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: deficit > 0 ? "#ef4444" : "#10b981",
                  borderRadius: 999,
                }}
              />
            </div>

            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
              SKU: {r.sku}
              {deficit > 0 ? ` · Need +${deficit}` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TopSellingHighlights = ({ rows, totalCount }) => {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        Not enough sales data to calculate top-selling products.
      </div>
    );
  }

  const maxRevenue =
    rows.reduce((m, r) => Math.max(m, Number(r.total_revenue) || 0), 0) || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        Showing {rows.length} of {totalCount} top-selling items
      </div>

      {rows.map((r) => {
        const revenue = Number(r.total_revenue) || 0;
        const pct = Math.max(0, Math.min(100, (revenue / maxRevenue) * 100));

        return (
          <div key={r.product_id} style={{ padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 600, color: "#111827", fontSize: 13 }}>
                {r.product_name}
              </div>
              <div style={{ fontSize: 12, color: "#111827" }}>
                {formatCurrency(revenue)}
              </div>
            </div>

            <div style={{ marginTop: 6, height: 8, background: "#e5e7eb", borderRadius: 999 }}>
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "#2563eb",
                  borderRadius: 999,
                }}
              />
            </div>

            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
              SKU: {r.product_sku} · Qty sold: {r.total_quantity}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardPage;
