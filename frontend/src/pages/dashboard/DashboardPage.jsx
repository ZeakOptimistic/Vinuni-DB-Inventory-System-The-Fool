// src/pages/dashboard/DashboardPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { reportApi } from "../../api/reportApi";
import { purchaseOrderApi } from "../../api/purchaseOrderApi";
import { salesOrderApi } from "../../api/salesOrderApi";

const PREVIEW_LIMIT = 6;
const RANGE_OPTIONS = [7, 14, 30];

const getRoleBannerStyle = (role) => {
  const base = {
    marginBottom: 12,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid",
    fontSize: 13,
  };

  const r = String(role || "").toUpperCase();
  if (r === "ADMIN") {
    return { ...base, background: "#e0f2fe", borderColor: "#bae6fd", color: "#0369a1" };
  }
  if (r === "MANAGER") {
    return { ...base, background: "#eef2ff", borderColor: "#c7d2fe", color: "#3730a3" };
  }
  if (r === "CLERK") {
    return { ...base, background: "#fef3c7", borderColor: "#fde68a", color: "#92400e" };
  }
  return { ...base, background: "#f3f4f6", borderColor: "#e5e7eb", color: "#374151" };
};

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

  const [rangeDays, setRangeDays] = useState(30);

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

  // Low stock from backend is per product-per-location (view_stock_per_location).
  // For dashboard highlights, group by product to avoid showing 6 rows of "0" for the same SKU.
  const lowStockGrouped = useMemo(() => {
    return groupLowStockByProduct(lowStockRows);
  }, [lowStockRows]);

  const lowStockStats = useMemo(() => {
    const grouped = lowStockGrouped || [];
    const outCount = grouped.filter((r) => Number(r.worst_qty) <= 0).length;
    const lowCount = grouped.filter((r) => Number(r.worst_qty) > 0).length;
    return { outCount, lowCount, total: grouped.length };
  }, [lowStockGrouped]);

  const lowStockPreview = useMemo(() => {
    const grouped = lowStockGrouped || [];
    const out = grouped.filter((r) => Number(r.worst_qty) <= 0);
    const low = grouped.filter((r) => Number(r.worst_qty) > 0);

    // Avoid showing 6 rows of "0": prefer non-zero lows first; if everything is 0, show only top 3.
    if (low.length > 0) {
      const takeLow = Math.min(3, low.length);
      const takeOut = Math.min(PREVIEW_LIMIT - takeLow, out.length);
      return [...low.slice(0, takeLow), ...out.slice(0, takeOut)];
    }
    return out.slice(0, Math.min(3, out.length));
  }, [lowStockGrouped]);

  const topSellingPreview = useMemo(() => {
    const rows = topSellingRows || [];

    const getQty = (r) =>
      Number(r.total_quantity ?? r.total_qty_sold ?? r.qty_sold ?? 0) || 0;

    const getRevenue = (r) => Number(r.total_revenue ?? r.revenue ?? 0) || 0;

    const sorted = [...rows].sort((a, b) => {
      const revDiff = getRevenue(b) - getRevenue(a);
      if (revDiff !== 0) return revDiff;
      return getQty(b) - getQty(a);
    });

    return sorted.slice(0, PREVIEW_LIMIT);
  }, [topSellingRows]);

  if (loading && !overview && !poMetrics && !soMetrics) {
    return <div>Loading dashboard...</div>;
  }

  const panelStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
  };

  const mutedStyle = { fontSize: 13, color: "#6b7280" };

  const bannerStyle = getRoleBannerStyle(role);

  return (
    <div>
      {/* Header (match list pages) */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <RangeSelect value={rangeDays} onChange={setRangeDays} />

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
              className="btn btn-outline"
              onClick={() => navigate("/reports")}
            >
              Reports
            </button>
          )}
        </div>
      </div>

      {/* Role banner (same vibe as other pages: simple, not gradient-heavy) */}
      {role && (
        <div style={bannerStyle}>
          You are signed in as{" "}
          <strong>
            {role === "ADMIN" ? "Admin" : role === "MANAGER" ? "Manager" : "Clerk"}
          </strong>
          .
        </div>
      )}

      {error && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <div style={panelStyle}>
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
            📦 Products
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginTop: 6 }}>
            {overview ? overview.total_products : "—"}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
            Active: {overview ? overview.active_products : "—"} · Inactive: {overview ? overview.inactive_products : "—"}
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
            🧾 Purchase Orders
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginTop: 6 }}>
            {poMetrics ? poMetrics.total_purchase_orders : "—"}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
            Open: {poMetrics ? poMetrics.open_purchase_orders : "—"} · Closed: {poMetrics ? poMetrics.closed_purchase_orders : "—"}
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
            🛒 Sales Orders
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginTop: 6 }}>
            {soMetrics ? soMetrics.total_sales_orders : "—"}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
            Confirmed: {soMetrics ? soMetrics.confirmed_sales_orders : "—"} · Cancelled: {soMetrics ? soMetrics.cancelled_sales_orders : "—"}
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
            💰 Estimated stock value
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginTop: 6 }}>
            {overview && overview.total_stock_value != null
              ? formatCurrency(overview.total_stock_value)
              : "N/A"}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
            {overview && overview.stock_value_note
              ? overview.stock_value_note
              : "Based on unit_price × quantity from product overview."}
          </div>
        </div>
      </div>

      {/* Trends */}
      <div className="dashboard-grid-two" style={{ marginTop: 16 }}>
        <div style={panelStyle}>
          <CardHeader title="Orders trend" meta={`Last ${rangeDays} days`} />
          <OrdersMiniChart series={ordersSeries} />
        </div>

        <div style={panelStyle}>
          <CardHeader title="Sales revenue trend" meta={`Last ${rangeDays} days`} />
          <MiniLineChart
            series={revenueSeries}
            valueLabel="Revenue"
            formatValue={formatCurrency}
          />
        </div>
      </div>

      {/* Highlights */}
      <div className="dashboard-grid-two" style={{ marginTop: 16 }}>
        <div style={panelStyle}>
          <CardHeader
            title="Low stock highlights"
            meta={`OUT ${lowStockStats.outCount} · LOW ${lowStockStats.lowCount} · ${lowStockStats.total} products affected`}
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
          <LowStockHighlights rows={lowStockPreview} />
        </div>

        <div style={panelStyle}>
          <CardHeader
            title="Top selling highlights"
            meta={`Showing ${Math.min(PREVIEW_LIMIT, topSellingRows.length)} of ${topSellingRows.length}`}
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
          <TopSellingHighlights rows={topSellingPreview} />
        </div>
      </div>

      {user && (
        <div className="dashboard-footnote">
          Signed in as <strong>{user.full_name || user.username}</strong> ({user.role})
        </div>
      )}
    </div>
  );
};

/** ---------- UI helpers ---------- */

const CardHeader = ({ title, meta, right }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
          {title}
        </div>
        {meta ? (
          <div style={{ marginTop: 2, fontSize: 12, color: "#6b7280" }}>
            {meta}
          </div>
        ) : null}
      </div>
      {right}
    </div>
  );
};

const RangeSelect = ({ value, onChange }) => {
  return (
    <select
      className="form-input"
      style={{ width: 120 }}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {RANGE_OPTIONS.map((d) => (
        <option key={d} value={d}>
          Last {d} days
        </option>
      ))}
    </select>
  );
};

/** ---------- Charts (simple + clean) ---------- */

const OrdersMiniChart = ({ series }) => {
  if (!series || series.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        No orders in the selected range.
      </div>
    );
  }

  const maxTotal = series.reduce((m, s) => Math.max(m, s.total), 0) || 1;
  const step = series.length >= 25 ? 3 : 2;
  const chartHeight = 112;

  const wrapRef = useRef(null);
  const [tip, setTip] = useState(null);

  const showTip = (e, text) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      text,
    });
  };

  const hideTip = () => setTip(null);

  return (
    <div>
      <div
        ref={wrapRef}
        onMouseLeave={hideTip}
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          height: 140,
          paddingTop: 4,
          position: "relative",
        }}
      >
        {series.map((s, idx) => {
          const poHeight = (s.poCount / maxTotal) * chartHeight;
          const soHeight = (s.soCount / maxTotal) * chartHeight;
          const showLabel = idx % step === 0 || idx === series.length - 1;

          return (
            <div
              key={s.dateIso}
              style={{
                flex: 1,
                minWidth: 12,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                title={`${s.label} | PO ${s.poCount} | SO ${s.soCount}`}
                style={{
                  width: "100%",
                  height: chartHeight,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 4,
                }}
              >
                <div
                  title={`${s.label} | PO: ${s.poCount}`}
                  onMouseMove={(e) => showTip(e, `${s.label} | PO: ${s.poCount}`)}
                  style={{
                    flex: 1,
                    height: `${poHeight || 0}px`,
                    background: "#2563eb",
                    borderRadius: 6,
                  }}
                />
                <div
                  title={`${s.label} | SO: ${s.soCount}`}
                  onMouseMove={(e) => showTip(e, `${s.label} | SO: ${s.soCount}`)}
                  style={{
                    flex: 1,
                    height: `${soHeight || 0}px`,
                    background: "#10b981",
                    borderRadius: 6,
                  }}
                />
              </div>
              <div
                style={{
                  height: 10,
                  fontSize: 10,
                  lineHeight: "10px",
                  color: "#9ca3af",
                  userSelect: "none",
                }}
              >
                {showLabel ? s.label : ""}
              </div>
            </div>
          );
        })}

        {tip && (
          <div
            style={{
              position: "absolute",
              left: tip.x,
              top: tip.y,
              transform: "translate(-50%, -120%)",
              background: "#111827",
              color: "#fff",
              padding: "6px 8px",
              borderRadius: 8,
              fontSize: 12,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            {tip.text}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 6,
          display: "flex",
          gap: 16,
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#2563eb",
            }}
          />
          PO
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#10b981",
            }}
          />
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

  const coords = series.map((s, idx) => {
    const x = (idx / Math.max(series.length - 1, 1)) * 100;
    const y = 28 - ((Number(s.value) - min) / span) * 24;
    return {
      key: s.dateIso || idx,
      x,
      y,
      label: s.label,
      value: Number(s.value) || 0,
    };
  });

  const points = coords.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  const wrapRef = useRef(null);
  const [tip, setTip] = useState(null);

  const handleMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const xPct = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(xPct * (coords.length - 1));
    const p = coords[Math.max(0, Math.min(coords.length - 1, idx))];

    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      text: `${p.label}: ${formatValue(p.value)}`,
    });
  };

  const hideTip = () => setTip(null);

  const last = series[series.length - 1]?.value || 0;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 6,
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        <div>
          {valueLabel}: <strong style={{ color: "#111827", fontWeight: 600 }}>{formatValue(last)}</strong>
        </div>
        <div>
          Max: {formatValue(max)}
        </div>
      </div>

      <div ref={wrapRef} style={{ position: "relative" }}>
          <svg
            viewBox="0 0 100 30"
            width="100%"
            height="120"
            onMouseMove={handleMove}
            onMouseLeave={hideTip}
          >
          <defs>
            <linearGradient id="hfFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(37, 99, 235, 0.35)" />
              <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
            </linearGradient>
          </defs>
          <polyline fill="none" stroke="#2563eb" strokeWidth="1.8" points={points} />
          <polygon
            fill="url(#hfFill)"
            points={`0,30 ${points} 100,30`}
          />
          {coords.map((p) => (
            <circle
              key={p.key}
              cx={p.x}
              cy={p.y}
              r="8"
              fill="transparent"
              stroke="transparent"
              pointerEvents="all"
            >
              <title>{`${p.label}: ${formatValue(p.value)}`}</title>
            </circle>
          ))}

        </svg>

          {tip && (
            <div
              style={{
                position: "absolute",
                left: tip.x,
                top: tip.y,
                transform: "translate(-50%, -120%)",
                background: "#111827",
                color: "#fff",
                padding: "6px 8px",
                borderRadius: 8,
                fontSize: 12,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              {tip.text}
            </div>
          )}
      </div>
    </div>
  );
};

/** ---------- Highlights ---------- */

const LowStockHighlights = ({ rows }) => {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        No products below reorder level.
      </div>
    );
  }

  return (
    <div className="highlight-list">
      {rows.map((r) => {
        const stock = Number(r.worst_qty) || 0;
        const reorder = Number(r.reorder_level) || 0;
        const deficit = Math.max(0, reorder - stock);
        const pct = reorder > 0 ? Math.max(0, Math.min(100, (stock / reorder) * 100)) : 100;
        const isOut = stock <= 0;

        const statusStyle = {
          fontSize: 11,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 999,
          border: "1px solid",
          background: isOut ? "#fee2e2" : "#fef3c7",
          borderColor: isOut ? "#fecaca" : "#fde68a",
          color: isOut ? "#b91c1c" : "#92400e",
        };

        const locPillStyle = {
          marginLeft: 8,
          fontSize: 11,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 999,
          background: "#f3f4f6",
          color: "#374151",
        };

        return (
          <div key={r.product_id || r.sku} className="highlight-item" style={{ borderRadius: 12 }}>
            <div className="highlight-row">
              <div className="highlight-name" style={{ fontWeight: 600 }}>
                {r.name}
                <span style={locPillStyle}>{r.low_locations} loc</span>
              </div>
              <div className="highlight-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={statusStyle}>{isOut ? "OUT" : "LOW"}</span>
                <span style={{ fontWeight: 600, color: "#111827" }}>Need +{deficit}</span>
              </div>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${pct}%`, background: isOut ? "#ef4444" : "#f59e0b" }}
              />
            </div>

            <div className="highlight-note">
              SKU: {r.sku || "—"} · Worst: {r.worst_location || "—"} · Stock {stock} / RL {reorder}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TopSellingHighlights = ({ rows }) => {
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
    <div className="highlight-list">
      {rows.map((r) => {
        const revenue = Number(r.total_revenue) || 0;
        const qty = Number(r.total_quantity ?? r.total_qty_sold ?? 0) || 0;
        const pct = Math.max(0, Math.min(100, (revenue / maxRevenue) * 100));

        return (
          <div key={r.product_id} className="highlight-item" style={{ borderRadius: 12 }}>
            <div className="highlight-row">
              <div className="highlight-name" style={{ fontWeight: 600 }}>
                {r.product_name || r.name}
              </div>
              <div className="highlight-right" style={{ fontWeight: 600, color: "#111827" }}>
                {formatCurrency(revenue)}
              </div>
            </div>

            <div className="progress-track">
              <div className="progress-fill brand" style={{ width: `${pct}%` }} />
            </div>

            <div className="highlight-note">
              SKU: {r.product_sku || r.sku || "—"} · Qty sold: {qty}
            </div>
          </div>
        );
      })}
    </div>
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

const normalizeLowStockRow = (r) => {
  const qty = Number(
    r.stock_quantity ?? r.quantity_on_hand ?? r.quantity ?? 0
  );
  const reorder = Number(r.reorder_level ?? 0);

  return {
    product_id: r.product_id ?? r.id ?? r.product ?? r.sku,
    name: r.name || r.product_name || r.product || "Unknown product",
    sku: r.sku || r.product_sku || r.product_code || "",
    location_name: r.location_name || r.location || "",
    qty,
    reorder_level: reorder,
  };
};

// group per product to avoid 6 duplicate "0" rows for same SKU (because low-stock is per location)
const groupLowStockByProduct = (rows) => {
  const map = new Map();

  (rows || []).forEach((raw) => {
    const r = normalizeLowStockRow(raw);
    const key = r.product_id ?? r.sku ?? r.name;

    if (!map.has(key)) {
      map.set(key, {
        product_id: r.product_id,
        name: r.name,
        sku: r.sku,
        reorder_level: r.reorder_level,
        worst_qty: r.qty,
        worst_location: r.location_name,
        low_locations: 1,
      });
      return;
    }

    const agg = map.get(key);
    agg.low_locations += 1;

    // keep max reorder_level just in case
    agg.reorder_level = Math.max(Number(agg.reorder_level) || 0, Number(r.reorder_level) || 0);

    // worst means minimum qty
    if ((Number(r.qty) || 0) < (Number(agg.worst_qty) || 0)) {
      agg.worst_qty = r.qty;
      agg.worst_location = r.location_name;
    }

    map.set(key, agg);
  });

  const arr = Array.from(map.values());

  // Sort: out-of-stock first, then by deficit desc
  arr.sort((a, b) => {
    const aStock = Number(a.worst_qty) || 0;
    const bStock = Number(b.worst_qty) || 0;
    const aOut = aStock <= 0 ? 1 : 0;
    const bOut = bStock <= 0 ? 1 : 0;
    if (aOut !== bOut) return bOut - aOut;

    const aDef = (Number(a.reorder_level) || 0) - aStock;
    const bDef = (Number(b.reorder_level) || 0) - bStock;
    return bDef - aDef;
  });

  return arr;
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

export default DashboardPage;
