// src/components/salesOrders/SalesOrderFormModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { locationApi } from "../../api/locationApi";
import { productApi } from "../../api/productApi";
import { salesOrderApi } from "../../api/salesOrderApi";
import { reportApi } from "../../api/reportApi";

/**
 * Modal form for creating a new sales order.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onCreated: (createdOrder) => void
 */
const SalesOrderFormModal = ({ open, onClose, onCreated }) => {
  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [form, setForm] = useState({
    location_id: "",
    order_date: "",
    customer_name: "",
  });

  const [items, setItems] = useState([{ product_id: "", quantity: "" }]);

  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);


  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [itemsError, setItemsError] = useState(null);

  // Reset state when opening
  useEffect(() => {
    if (!open) return;

    setError(null);
    setItemsError(null);
    setFieldErrors({});

    setForm({
      location_id: "",
      order_date: todayStr,
      customer_name: "",
    });

    setItems([{ product_id: "", quantity: "" }]);
  }, [open, todayStr]);

  // Load locations & products when modal opens
  useEffect(() => {
    if (!open) return;

    const fetchLookups = async () => {
      setLoadingLookups(true);
      try {
        const [locList, prodList] = await Promise.all([
          locationApi.listAll({status: "ACTIVE" }),
          productApi.listAll({status: "ACTIVE" }),
        ]);

        setLocations(locList);
        setProducts(prodList);
      } catch (err) {
        console.error(err);
        setError("Failed to load locations and products.");
      } finally {
        setLoadingLookups(false);
      }
    };

    fetchLookups();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // not select location -> clear stock
    if (!form.location_id) {
      setStockRows([]);
      return;
    }

    const fetchStock = async () => {
      setLoadingStock(true);
      try {
        const rows = await reportApi.getStockPerLocation({
          location_id: Number(form.location_id),
        });
        setStockRows(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.error(err);
        setStockRows([]);
      } finally {
        setLoadingStock(false);
      }
    };

    fetchStock();
  }, [open, form.location_id]);

  const handleChangeForm = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLocationChange = (e) => {
    const value = e.target.value;

    setForm((prev) => ({
      ...prev,
      location_id: value,
    }));

    // reset items avoids keeping products from the old location
    setItems([{ product_id: "", quantity: "" }]);
    setItemsError(null);
  };


  const handleChangeItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { product_id: "", quantity: "" }]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const validItems = useMemo(
    () =>
      items.filter(
        (it) =>
          it.product_id &&
          it.quantity &&
          Number(it.quantity) > 0
      ),
    [items]
  );

  const findProduct = (productId) =>
    products.find((p) => String(p.product_id) === String(productId));

  const estimatedTotal = useMemo(() => {
    return validItems.reduce((sum, it) => {
      const product = findProduct(it.product_id);
      const qty = Number(it.quantity) || 0;
      const price = product ? Number(product.unit_price || 0) : 0;
      return sum + qty * price;
    }, 0);
  }, [validItems, products]);

  const availableQtyByProductId = useMemo(() => {
    const map = {};
    for (const r of stockRows) {
      const pid = Number(r.product_id);
      const qty = Number(r.quantity_on_hand || 0);
      map[pid] = qty;
    }
    return map;
  }, [stockRows]);

  const availableProducts = useMemo(() => {
    // only allow products with qty > 0 at selected location
    return (products || []).filter((p) => {
      const qty = availableQtyByProductId[Number(p.product_id)] || 0;
      return qty > 0;
    });
  }, [products, availableQtyByProductId]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setItemsError(null);
    setFieldErrors({});

    if (!form.location_id) {
      setError("Location is required.");
      setSubmitting(false);
      return;
    }

    if (validItems.length === 0) {
      setItemsError("At least one line item with product and quantity > 0 is required.");
      setSubmitting(false);
      return;
    }

    // validate requested qty <= available (sum by product)
    const req = {};
    for (const it of validItems) {
      const pid = Number(it.product_id);
      const qty = Number(it.quantity) || 0;
      req[pid] = (req[pid] || 0) + qty;
    }

    const problems = [];
    for (const pidStr of Object.keys(req)) {
      const pid = Number(pidStr);
      const available = availableQtyByProductId[pid] || 0;
      if (req[pid] > available) {
        const p = products.find((x) => Number(x.product_id) === pid);
        problems.push(
          `${p ? p.name : `Product ${pid}`}: requested ${req[pid]} > available ${available}`
        );
      }
    }

    if (problems.length > 0) {
      setItemsError(problems.join(" | "));
      setSubmitting(false);
      return;
    }

    const customerName = (form.customer_name || "").trim();

    const payload = {
      location_id: Number(form.location_id),
      order_date: form.order_date || todayStr,
      ...(customerName ? { customer_name: customerName } : {}), // empty -> omit
      items: validItems,
    };

    try {
      const created = await salesOrderApi.create(payload);
      onCreated(created);
      onClose();
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 400 && err.response.data) {
        const data = err.response.data;
        setFieldErrors(data);
        if (data.items) {
          setItemsError(JSON.stringify(data.items));
        }
        setError("Failed to create sales order. Please fix the highlighted errors.");
      } else {
        setError("Failed to create sales order. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">New Sales Order</h3>
          <button className="modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="form-error" style={{ marginBottom: 4 }}>
              {error}
            </div>
          )}

          {loadingLookups && (
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
              Loading locations and products...
            </div>
          )}

          {/* Header fields */}
          <div style={{ display: "flex", gap: 12 }}>
            <label className="form-label" style={{ flex: 1 }}>
              Location
              <select
                name="location_id"
                className="form-input"
                value={form.location_id}
                onChange={handleLocationChange}
                required
              >
                <option value="">Select location</option>
                {locations.map((l) => (
                  <option key={l.location_id} value={l.location_id}>
                    {l.name}
                  </option>
                ))}
              </select>
              {fieldErrors.location_id && (
                <span className="field-error">
                  {JSON.stringify(fieldErrors.location_id)}
                </span>
              )}
            </label>

            <label className="form-label" style={{ flex: 1 }}>
              Order date
              <input
                type="date"
                name="order_date"
                className="form-input"
                value={form.order_date}
                onChange={handleChangeForm}
                required
              />
              {fieldErrors.order_date && (
                <span className="field-error">
                  {JSON.stringify(fieldErrors.order_date)}
                </span>
              )}
            </label>
          </div>

          <label className="form-label">
            Customer name
            <input
              name="customer_name"
              className="form-input"
              value={form.customer_name}
              onChange={handleChangeForm}
              placeholder="Optional"
            />
            {fieldErrors.customer_name && (
              <span className="field-error">
                {JSON.stringify(fieldErrors.customer_name)}
              </span>
            )}
          </label>

          {/* Line items */}
          <div
            style={{
              marginTop: 8,
              marginBottom: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>Items</span>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleAddItem}
              style={{ fontSize: 13, padding: "4px 10px" }}
            >
              Add line
            </button>
          </div>

          {itemsError && (
            <div className="form-error" style={{ marginBottom: 4 }}>
              {itemsError}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {items.map((it, idx) => {
              const product = products.find(
                (p) => String(p.product_id) === String(it.product_id)
              );

              const maxQty = it.product_id
                ? (availableQtyByProductId[Number(it.product_id)] ?? 0)
                : null;

              // unit price is read-only from product
              const unitPrice = product ? Number(product.unit_price || 0) : 0;
              const qty = Number(it.quantity || 0);
              const lineTotal = unitPrice * qty;

              return (
                <div
                  key={`${it.product_id || "p"}-${idx}`}
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  {/* Row 1: Product */}
                  <label className="form-label" style={{ marginBottom: 8 }}>
                    Product
                    <select
                      value={it.product_id}
                      onChange={(e) => handleChangeItem(idx, "product_id", e.target.value)}
                      className="form-input"
                    >
                      <option value="">Select product</option>
                      {availableProducts.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Row 2: Quantity + Unit price (same row like PO) */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <label className="form-label" style={{ width: 280 }}>
                      Quantity
                      <input
                        type="number"
                        min="1"
                        max={maxQty ?? undefined}
                        value={it.quantity}
                        onChange={(e) => handleChangeItem(idx, "quantity", e.target.value)}
                        className="form-input"
                      />
                      {maxQty !== null && Number(it.quantity || 0) > maxQty && (
                        <div style={{ marginTop: 4, fontSize: 12, color: "#b91c1c" }}>
                          Max {maxQty}
                        </div>
                      )}
                    </label>

                    <label className="form-label" style={{ width: 280 }}>
                      Unit price
                      <input
                        className="form-input"
                        value={product ? unitPrice.toFixed(2) : "-"}
                        readOnly
                        disabled
                      />
                    </label>
                  </div>

                  {/* Row 3: Line total + Remove */}
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 13, color: "#4b5563" }}>
                      Line total:{" "}
                      <strong>{lineTotal > 0 ? `${lineTotal.toFixed(2)} ₫` : "-"}</strong>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: 12, padding: "4px 10px", borderColor: "#fecaca" }}
                        onClick={() => handleRemoveItem(idx)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );

            })}
          </div>

          {/* Estimated total */}
          <div
            style={{
              marginTop: 8,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <span style={{ fontSize: 13, color: "#4b5563" }}>
              Estimated total:{" "}
              <strong>
                {estimatedTotal > 0
                  ? `${estimatedTotal.toFixed(2)} ₫`
                  : "-"}
              </strong>
            </span>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create sales order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesOrderFormModal;
