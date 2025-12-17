// src/pages/transfers/TransfersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { productApi } from "../../api/productApi";
import { locationApi } from "../../api/locationApi";
import { transferApi } from "../../api/transferApi";


/**
 * TransfersPage:
 * - Staff user selects product, from location, to location, quantity
 * - Calls POST /api/transfers/
 * - Shows result and recent transfers in the UI
 */
const TransfersPage = () => {
  const { user } = useAuth();

  // Only ADMIN / MANAGER can perform stock transfers
  const canTransfer =
    user && (user.role === "ADMIN" || user.role === "MANAGER");

  // Clerk can view in read-only mode
  const isClerk = user && user.role === "CLERK";

  // Known application roles for this page
  const isKnownRole = canTransfer || isClerk;

  const [loadingLookups, setLoadingLookups] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);

  const [form, setForm] = useState({
    productId: "",
    fromLocationId: "",
    toLocationId: "",
    quantity: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [recentTransfers, setRecentTransfers] = useState([]);

  // Load transfer history from server (persist across sessions)
  useEffect(() => {
    if (!isKnownRole) return;

    const loadHistory = async () => {
      try {
        const data = await transferApi.list({ limit: 5000 });
        const list = Array.isArray(data) ? data : (data?.results || []);
        // newest first (optional)
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setRecentTransfers(list);
      } catch (err) {
        console.error(err);
        // not block UI, only log
      }
    };

    loadHistory();
  }, [isKnownRole]);


  // Load product and location options
  useEffect(() => {
    if (!isKnownRole) return;

    const loadLookups = async () => {
      setLoadingLookups(true);
      setLookupError(null);

      try {
        const [productList, locationList] = await Promise.all([
          productApi.listAll({ ordering: "name", status: "ACTIVE" }),
          locationApi.listAll({ ordering: "name", status: "ACTIVE" }),
        ]);

        setProducts(productList);
        setLocations(locationList);
      } catch (err) {
        console.error(err);
        setLookupError(
          "Failed to load products and locations. Please try again."
        );
      } finally {
        setLoadingLookups(false);
      }
    };

    loadLookups();
  }, [isKnownRole]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetMessages = () => {
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    // Safety: only ADMIN / MANAGER can perform transfers
    if (!canTransfer) {
      setSubmitError(
        "You do not have permission to perform stock transfers."
      );
      return;
    }

    if (!form.productId || !form.fromLocationId || !form.toLocationId) {
      setSubmitError("Please select product and both locations.");
      return;
    }

    if (form.fromLocationId === form.toLocationId) {
      setSubmitError(
        "Source and destination locations must be different."
      );
      return;
    }

    const qty = Number(form.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setSubmitError("Quantity must be a positive number.");
      return;
    }

    const payload = {
      product_id: Number(form.productId),
      from_location_id: Number(form.fromLocationId),
      to_location_id: Number(form.toLocationId),
      quantity: qty,
    };

    setSubmitting(true);
    try {
      const res = await transferApi.create(payload);
      setSubmitSuccess(
        `Transferred ${res.quantity} units of "${res.product_name}" from "${res.from_location_name}" to "${res.to_location_name}".`
      );

      // Reload recent transfers (full + newest first)
      const latest = await transferApi.list({ limit: 5000 });
      const list = Array.isArray(latest) ? latest : (latest?.results || []);
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentTransfers(list);

      // Reset quantity, keep selections
      setForm((prev) => ({
        ...prev,
        quantity: "",
      }));
    } catch (err) {
      console.error(err);
      if (
        err.response &&
        err.response.status === 400 &&
        err.response.data
      ) {
        // Show detail or serializer / trigger message
        const data = err.response.data;
        const detail =
          data.detail ||
          data.quantity ||
          data.product_id ||
          data.from_location_id ||
          data.to_location_id;
        setSubmitError(
          typeof detail === "string"
            ? detail
            : "Transfer failed. Please check input and try again."
        );
      } else {
        setSubmitError("Transfer failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isKnownRole) {
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
          <h2 style={{ margin: 0 }}>Transfers</h2>

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
          Only application staff users can perform stock transfers.
        </div>
      </div>
    );
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
        <h2 style={{ margin: 0 }}>Transfers</h2>

      </div>

      {lookupError && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {lookupError}
        </div>
      )}

      {/* Transfer form: only Admin / Manager */}
      {canTransfer && (
        <div className="dashboard-card" style={{ marginBottom: 16 }}>
          <div className="dashboard-card-header">
            New stock transfer between locations
          </div>

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
                marginTop: 8,
                marginBottom: 8,
              }}
            >
              <label className="form-label">
                Product
                <select
                  name="productId"
                  value={form.productId}
                  onChange={handleChange}
                  className="form-input"
                  disabled={loadingLookups}
                >
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-label">
                Quantity
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={handleChange}
                  className="form-input"
                />
              </label>

              <label className="form-label">
                From location
                <select
                  name="fromLocationId"
                  value={form.fromLocationId}
                  onChange={handleChange}
                  className="form-input"
                  disabled={loadingLookups}
                >
                  <option value="">Select source location…</option>
                  {locations.map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-label">
                To location
                <select
                  name="toLocationId"
                  value={form.toLocationId}
                  onChange={handleChange}
                  className="form-input"
                  disabled={loadingLookups}
                >
                  <option value="">Select destination location…</option>
                  {locations.map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {submitError && (
              <div className="form-error" style={{ marginBottom: 8 }}>
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div
                style={{
                  marginBottom: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "#ecfdf3",
                  color: "#166534",
                  fontSize: 13,
                }}
              >
                {submitSuccess}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || loadingLookups}
            >
              {submitting ? "Transferring..." : "Transfer stock"}
            </button>
          </form>
        </div>
      )}

      {/* Recent transfers table (all roles can see) */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">Recent transfers</div>
        <RecentTransfersTable rows={recentTransfers} />
      </div>
    </div>
  );

};

function RecentTransfersTable({ rows }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(safeRows.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return safeRows.slice(start, end);
  }, [safeRows, page, pageSize]);

  return (
    <div>
      {/* --- table --- */}
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
              <th style={thStyle}>Transfer #</th>
              <th style={thStyle}>Product</th>
              <th style={thStyle}>From</th>
              <th style={thStyle}>To</th>
              <th style={thStyle}>Quantity</th>
              <th style={thStyle}>From qty after</th>
              <th style={thStyle}>To qty after</th>
            </tr>
          </thead>

          <tbody>
            {pagedRows.map((t) => (
              <tr
                key={`${t.transfer_id ?? "na"}-${t.created_at ?? ""}-${t.product_id ?? ""}-${t.from_location_id ?? ""}-${t.to_location_id ?? ""}`}
                style={{ borderTop: "1px solid #e5e7eb" }}
              >
                <td style={tdStyle}>{t.transfer_id ?? "-"}</td>
                <td style={tdStyle}>{t.product_name ?? "-"}</td>
                <td style={tdStyle}>{t.from_location_name ?? "-"}</td>
                <td style={tdStyle}>{t.to_location_name ?? "-"}</td>
                <td style={tdStyle}>
                  {Number.isFinite(Number(t.quantity)) ? Math.abs(Number(t.quantity)) : "-"}
                </td>

                {/* keep existing fallbacks to avoid empty cells */}
                <td style={tdStyle}>
                  {t.from_quantity_on_hand ?? t.from_qty_after ?? t.from_quantity_after ?? "-"}
                </td>
                <td style={tdStyle}>
                  {t.to_quantity_on_hand ?? t.to_qty_after ?? t.to_quantity_after ?? "-"}
                </td>
              </tr>
            ))}

            {pagedRows.length === 0 && (
              <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                <td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#6b7280" }}>
                  No transfers
                </td>
              </tr>
            )}
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
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            Page {page} of {totalPages} · {safeRows.length} transfers
          </span>

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
    </div>
  );
}


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



export default TransfersPage;
