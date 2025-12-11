// src/components/salesOrders/SalesOrderFormModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { locationApi } from "../../api/locationApi";
import { productApi } from "../../api/productApi";
import { salesOrderApi } from "../../api/salesOrderApi";

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
        const [locData, prodData] = await Promise.all([
          locationApi.list({ pageSize: 1000 }),
          productApi.list({ pageSize: 1000 }),
        ]);

        setLocations(locData.results || locData || []);
        setProducts(prodData.results || prodData || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load locations and products.");
      } finally {
        setLoadingLookups(false);
      }
    };

    fetchLookups();
  }, [open]);

  const handleChangeForm = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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

    const payload = {
      location_id: Number(form.location_id),
      order_date: form.order_date || todayStr,
      customer_name: form.customer_name.trim() || null,
      items: validItems.map((it) => ({
        product_id: Number(it.product_id),
        quantity: Number(it.quantity),
      })),
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
                onChange={handleChangeForm}
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

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                background: "#f9fafb",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr>
                  <th style={thItemStyle}>Product</th>
                  <th style={thItemStyle}>Quantity</th>
                  <th style={thItemStyle}>Unit price</th>
                  <th style={thItemStyle}>Line total</th>
                  <th style={thItemStyle}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, index) => {
                  const product = findProduct(it.product_id);
                  const qty = Number(it.quantity) || 0;
                  const price = product ? Number(product.unit_price || 0) : 0;
                  const lineTotal = qty * price;

                  return (
                    <tr key={index}>
                      <td style={tdItemStyle}>
                        <select
                          className="form-input"
                          value={it.product_id}
                          onChange={(e) =>
                            handleChangeItem(index, "product_id", e.target.value)
                          }
                        >
                          <option value="">Select product</option>
                          {products.map((p) => (
                            <option key={p.product_id} value={p.product_id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={tdItemStyle}>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          value={it.quantity}
                          onChange={(e) =>
                            handleChangeItem(index, "quantity", e.target.value)
                          }
                        />
                      </td>
                      <td style={tdItemStyle}>
                        {product
                          ? `${product.unit_price} ₫`
                          : "-"}
                      </td>
                      <td style={tdItemStyle}>
                        {lineTotal > 0 ? `${lineTotal.toFixed(2)} ₫` : "-"}
                      </td>
                      <td style={tdItemStyle}>
                        {items.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{
                              fontSize: 12,
                              padding: "4px 8px",
                              borderColor: "#fecaca",
                            }}
                            onClick={() => handleRemoveItem(index)}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

const thItemStyle = {
  textAlign: "left",
  padding: "6px 8px",
  fontWeight: 600,
  color: "#4b5563",
};

const tdItemStyle = {
  padding: "4px 8px",
};

export default SalesOrderFormModal;
