// src/pages/reports/ReportsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { locationApi } from "../../api/locationApi";
import { reportApi } from "../../api/reportApi";

const normText = (v) => String(v ?? "").trim().toLowerCase();

const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const TABS = [
  { id: "low-stock", label: "Low stock" },
  { id: "stock-per-location", label: "Stock per location" },
  { id: "top-selling", label: "Top selling (30 days)" },
];

/**
 * ReportsPage:
 * - Low stock report (with optional location filter)
 * - Stock per location snapshot
 * - Top selling products in the last 30 days
 *
 * All data comes from /api/reports/* endpoints.
 */
const ReportsPage = () => {
  const { user } = useAuth();
  const isStaff =
    user && ["ADMIN", "MANAGER", "CLERK"].includes(user.role);

  const [activeTab, setActiveTab] = useState("low-stock");

  const [locations, setLocations] = useState([]);
  const [filters, setFilters] = useState({
    locationId: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [lowStockRows, setLowStockRows] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [topSellingRows, setTopSellingRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Load location list for filters
  useEffect(() => {
    if (!isStaff) return;

    const loadLocations = async () => {
      try {
        const list = await locationApi.listAll({status: "ACTIVE", ordering: "name",});
        setLocations(list);
      } catch (err) {
        console.error(err);
        // Reports still usable without locations, so just log.
      }
    };

    loadLocations();
  }, [isStaff]);

  // Load data whenever tab or location filter changes
  useEffect(() => {
    if (!isStaff) return;
    const load = async () => {
      setLoading(true);
      setError(null);

      const locationId = filters.locationId
        ? Number(filters.locationId)
        : null;

      try {
        if (activeTab === "low-stock") {
          const rows = await reportApi.getLowStock();
          const list = Array.isArray(rows) ? rows : [];
          const filtered =
            locationId == null
              ? list
              : list.filter(
                  (r) => Number(r.location_id) === locationId
                );
          setLowStockRows(filtered);
        } else if (activeTab === "stock-per-location") {
          const rows = await reportApi.getStockPerLocation({
            location_id: locationId || undefined,
          });
          setStockRows(Array.isArray(rows) ? rows : []);
        } else if (activeTab === "top-selling") {
          const rows = await reportApi.getTopSelling();
          setTopSellingRows(Array.isArray(rows) ? rows : []);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load report data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [activeTab, filters.locationId, isStaff]);

  if (!isStaff) {
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
          <h2 style={{ margin: 0 }}>Reports</h2>

        </div>
        <div
          style={{
            padding: 12,
            background: "#fef2f2",
            borderRadius: 8,
            color: "#b91c1c",
            fontSize: 14,
          }}
        >
          Only staff users can access reports.
        </div>
      </div>
    );
  }

  const handleLocationChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      locationId: e.target.value,
    }));
  };

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
        <h2 style={{ margin: 0 }}>Reports</h2>

      </div>

      {/* Tabs */}
      <div
        style={{
          display: "inline-flex",
          borderRadius: 999,
          border: "1px solid #e5e7eb",
          padding: 2,
          marginBottom: 12,
          background: "#f9fafb",
        }}
      >
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: "none",
                outline: "none",
                cursor: "pointer",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 13,
                background: active ? "#2563eb" : "transparent",
                color: active ? "#ffffff" : "#4b5563",
                fontWeight: active ? 600 : 500,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Shared filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div className="form-group">
          <input
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name or SKU..."
          />
        </div>

        <label
          className="form-label"
          style={{ marginBottom: 0, minWidth: 220 }}
        >
          <select
            value={filters.locationId}
            onChange={handleLocationChange}
            className="form-input"
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc.location_id} value={loc.location_id}>
                {loc.name}
              </option>
            ))}
          </select>
        </label>

        {activeTab === "top-selling" && (
          <div style={{ fontSize: 12, }}>
          </div>
        )}
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: 8 }}>
          {error}
        </div>
      )}

      {/* Report content */}
      <div className="dashboard-card">
        {loading && (
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Loading report data...
          </div>
        )}

        {!loading && activeTab === "low-stock" && (
          <>
            <div className="dashboard-card-header">
              Low stock products
            </div>
            <LowStockReportTable rows={lowStockRows} searchTerm={searchTerm} />
          </>
        )}

        {!loading && activeTab === "stock-per-location" && (
          <>
            <div className="dashboard-card-header">
              Stock per location
            </div>
            <StockPerLocationTable rows={stockRows} searchTerm={searchTerm}/>
          </>
        )}

        {!loading && activeTab === "top-selling" && (
          <>
            <div className="dashboard-card-header">
              Top selling products (last 30 days)
            </div>
            <TopSellingReportTable rows={topSellingRows} searchTerm={searchTerm}/>
          </>
        )}
      </div>
    </div>
  );
};

const LowStockReportTable = ({ rows, searchTerm }) => {

  const filteredRows = useMemo(() => {
    const q = normText(searchTerm);
    const base = Array.isArray(rows) ? rows : [];

    const filtered = !q
      ? base
      : base.filter((r) => {
          const name = normText(r.product_name ?? r.name);
          const sku  = normText(r.sku ?? r.product_sku);
          return name.includes(q) || sku.includes(q);
        });

    // Sort: on hand ASC (lowest first), then product name, sku
    return [...filtered].sort((a, b) => {
      const aOnHand = toNumber(a.quantity_on_hand ?? a.stock_quantity, Number.POSITIVE_INFINITY);
      const bOnHand = toNumber(b.quantity_on_hand ?? b.stock_quantity, Number.POSITIVE_INFINITY);
      if (aOnHand !== bOnHand) return aOnHand - bOnHand;

      // tie-break: product name, sku
      const an = normText(a.product_name ?? a.name);
      const bn = normText(b.product_name ?? b.name);
      if (an !== bn) return an.localeCompare(bn);

      const asku = normText(a.sku ?? a.product_sku);
      const bsku = normText(b.sku ?? b.product_sku);
      return asku.localeCompare(bsku);
    });
  }, [rows, searchTerm]);


  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1); // change searchTerm back page 1
  }, [searchTerm, pageSize]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  if (!rows || rows.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        No low stock products for the selected filter.
      </div>
    );
  }

  return (
    <>
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
              <th style={thStyle}>Stock value</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r) => (
              <tr
                key={`${r.product_id}-${r.location_id}`}
                style={{ borderTop: "1px solid #e5e7eb" }}
              >
                <td style={tdStyle}>{r.product_name}</td>
                <td style={tdStyle}>{r.sku}</td>
                <td style={tdStyle}>{r.location_name}</td>
                <td style={tdStyle}>{r.quantity_on_hand}</td>
                <td style={tdStyle}>{r.reorder_level}</td>
                <td style={tdStyle}>
                  {r.stock_value != null
                    ? formatCurrency(r.stock_value)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Left info – giống sample */}
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            Page {page} of {totalPages} · {filteredRows.length} products
          </span>

          {/* Right controls – giống sample */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              className="form-input"
              style={{ width: 100 }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>

            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>

            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const StockPerLocationTable = ({ rows, searchTerm }) => {

  const filteredRows = useMemo(() => {
    const q = normText(searchTerm);
    const base = Array.isArray(rows) ? rows : [];

    const filtered = !q
      ? base
      : base.filter((r) => {
          const name = normText(r.product_name);
          const sku  = normText(r.sku);
          const loc  = normText(r.location_name);
          return name.includes(q) || sku.includes(q) || loc.includes(q);
        });

    // Sort: product name A->Z
    return [...filtered].sort((a, b) => {
      const an = normText(a.product_name);
      const bn = normText(b.product_name);
      if (an !== bn) return an.localeCompare(bn);

      // tie-break: location A->Z
      const al = normText(a.location_name);
      const bl = normText(b.location_name);
      if (al !== bl) return al.localeCompare(bl);

      const asku = normText(a.sku);
      const bsku = normText(b.sku);
      return asku.localeCompare(bsku);
    });
  }, [rows, searchTerm]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1); // change searchTerm back page 1
  }, [searchTerm, pageSize]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  if (!rows || rows.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        No stock records for the selected filter.
      </div>
    );
  }

  return (
    <>
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
              <th style={thStyle}>Stock value</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r) => (
              <tr
                key={`${r.product_id}-${r.location_id}`}
                style={{ borderTop: "1px solid #e5e7eb" }}
              >
                <td style={tdStyle}>{r.product_name}</td>
                <td style={tdStyle}>{r.sku}</td>
                <td style={tdStyle}>{r.location_name}</td>
                <td style={tdStyle}>{r.quantity_on_hand}</td>
                <td style={tdStyle}>{r.reorder_level}</td>
                <td style={tdStyle}>
                  {r.stock_value != null
                    ? formatCurrency(r.stock_value)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Left info – giống sample */}
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            Page {page} of {totalPages} · {filteredRows.length} records
          </span>


          {/* Right controls – giống sample */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              className="form-input"
              style={{ width: 100 }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>

            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>

            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

    </>
  );
};

const TopSellingReportTable = ({ rows , searchTerm }) => {

  const filteredRows = useMemo(() => {
    const q = normText(searchTerm);
    const base = Array.isArray(rows) ? rows : [];

    const filtered = !q
      ? base
      : base.filter((r) => {
          const name = normText(r.product_name);
          const sku  = normText(r.sku);
          return name.includes(q) || sku.includes(q);
        });

    // Sort: total_revenue DESC (highest first)
    return [...filtered].sort((a, b) => {
      const ar = toNumber(a.total_revenue, 0);
      const br = toNumber(b.total_revenue, 0);
      if (ar !== br) return br - ar;

      // tie-break: quantity sold DESC then name A->Z
      const aq = toNumber(a.total_qty_sold, 0);
      const bq = toNumber(b.total_qty_sold, 0);
      if (aq !== bq) return bq - aq;

      const an = normText(a.product_name);
      const bn = normText(b.product_name);
      return an.localeCompare(bn);
    });
  }, [rows, searchTerm]);


  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1); // change searchTerm back page 1
  }, [searchTerm, pageSize]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  if (!rows || rows.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        No sales data in the last 30 days.
      </div>
    );
  }


  return (
    <>
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
              <th style={thStyle}>Total quantity sold</th>
              <th style={thStyle}>Total revenue</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r) => (
              <tr key={r.product_id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={tdStyle}>{r.product_name}</td>
                <td style={tdStyle}>{r.sku}</td>
                <td style={tdStyle}>{r.total_qty_sold}</td>
                <td style={tdStyle}>
                  {r.total_revenue != null
                    ? formatCurrency(r.total_revenue)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Left info – giống sample */}
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            Page {page} of {totalPages} · {filteredRows.length} products
          </span>


          {/* Right controls – giống sample */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              className="form-input"
              style={{ width: 100 }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>

            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>

            <button
              className="btn btn-outline"
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

    </>
  );
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

export default ReportsPage;
