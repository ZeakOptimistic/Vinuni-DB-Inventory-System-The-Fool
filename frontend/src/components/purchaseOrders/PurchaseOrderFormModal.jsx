// src/components/purchaseOrders/PurchaseOrderFormModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supplierApi } from "../../api/supplierApi";
import { locationApi } from "../../api/locationApi";
import { productApi } from "../../api/productApi";
import { purchaseOrderApi } from "../../api/purchaseOrderApi";

/**
 * Modal form for creating a new purchase order.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onCreated: (createdOrder) => void
 */
const PurchaseOrderFormModal = ({ open, onClose, onCreated }) => {
  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [form, setForm] = useState({
    supplier_id: "",
    location_id: "",
    order_date: "",
    expected_date: "",
  });

  const [items, setItems] = useState([
    { product_id: "", ordered_qty: "", unit_price: "" },
  ]);

  const [suppliers, setSuppliers] = useState([]);
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
      supplier_id: "",
      location_id: "",
      order_date: todayStr,
      expected_date: "",
    });

    setItems([{ product_id: "", ordered_qty: "", unit_price: "" }]);
  }, [open, todayStr]);

  // Load suppliers, locations, products when modal opens
  useEffect(() => {
    if (!open) return;

    const fetchLookups = async () => {
      setLoadingLookups(true);
      try {
        const [supList, locList, prodList] = await Promise.all([
          supplierApi.listAll({ status: "ACTIVE"}),
          locationApi.listAll({ status: "ACTIVE" }),
          productApi.listAll({ status: "ACTIVE" }),
        ]);

        setSuppliers(supList);
        setLocations(locList);
        setProducts(prodList);
      } catch (err) {
        console.error(err);
        setError("Failed to load suppliers/locations/products.");
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
    setItems((prev) => [...prev, { product_id: "", ordered_qty: "", unit_price: "" }]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const validItems = useMemo(
    () =>
      items.filter(
        (it) =>
          it.product_id &&
          it.ordered_qty &&
          Number(it.ordered_qty) > 0 &&
          it.unit_price !== "" &&
          Number(it.unit_price) >= 0
      ),
    [items]
  );

  const estimatedTotal = useMemo(() => {
    return validItems.reduce((sum, it) => {
      const qty = Number(it.ordered_qty) || 0;
      const price = parseFloat(it.unit_price || "0") || 0;
      return sum + qty * price;
    }, 0);
  }, [validItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setItemsError(null);
    setFieldErrors({});

    if (!form.supplier_id || !form.location_id) {
      setError("Supplier and location are required.");
      setSubmitting(false);
      return;
    }

    if (validItems.length === 0) {
      setItemsError("At least one line item with product and quantity > 0 is required.");
      setSubmitting(false);
      return;
    }

    const payload = {
      supplier_id: Number(form.supplier_id),
      location_id: Number(form.location_id),
      order_date: form.order_date || todayStr,
      expected_date: form.expected_date || null,
      items: validItems.map((it) => ({
        product_id: Number(it.product_id),
        ordered_qty: Number(it.ordered_qty),
        unit_price: String(it.unit_price),
      })),
    };

    try {
      const created = await purchaseOrderApi.create(payload);
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
        setError("Failed to create purchase order. Please fix the highlighted errors.");
      } else {
        setError("Failed to create purchase order. Please try again.");
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
          <h3 className="modal-title">New Purchase Order</h3>
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
              Loading suppliers, locations, and products...
            </div>
          )}

          {/* Header fields */}
          <div style={{ display: "flex", gap: 12 }}>
            <label className="form-label" style={{ flex: 1 }}>
              Supplier
              <select
                name="supplier_id"
                className="form-input"
                value={form.supplier_id}
                onChange={handleChangeForm}
                required
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {fieldErrors.supplier_id && (
                <span className="field-error">
                  {JSON.stringify(fieldErrors.supplier_id)}
                </span>
              )}
            </label>

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
          </div>

          <div style={{ display: "flex", gap: 12 }}>
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

            <label className="form-label" style={{ flex: 1 }}>
              Expected date
              <input
                type="date"
                name="expected_date"
                className="form-input"
                value={form.expected_date}
                onChange={handleChangeForm}
              />
              {fieldErrors.expected_date && (
                <span className="field-error">
                  {JSON.stringify(fieldErrors.expected_date)}
                </span>
              )}
            </label>
          </div>

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

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((it, index) => {
              const qty = Number(it.ordered_qty) || 0;
              const price = parseFloat(it.unit_price || "0") || 0;
              const lineTotal = qty * price;

              return (
                <div
                  key={index}
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
                      className="form-input"
                      value={it.product_id}
                      onChange={(e) => {
                        const pid = e.target.value;
                        const p = products.find(x => String(x.product_id) === String(pid));

                        setItems(prev => prev.map((row, i) => {
                          if (i !== index) return row;
                          return {
                            ...row,
                            product_id: pid,
                            unit_price: row.unit_price === "" ? String(p?.unit_price ?? "") : row.unit_price,
                          };
                        }));
                      }}
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Row 2: Qty + Unit price */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <label className="form-label" style={{ width: 280 }}>
                      Quantity
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={it.ordered_qty}
                        onChange={(e) => handleChangeItem(index, "ordered_qty", e.target.value)}
                      />
                    </label>

                    <label className="form-label" style={{ width: 280 }}>
                      Unit price (optional)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input"
                        value={it.unit_price}
                        onChange={(e) => handleChangeItem(index, "unit_price", e.target.value)}
                        placeholder="Optional"
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
                        onClick={() => handleRemoveItem(index)}
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
              {submitting ? "Creating..." : "Create PO"}
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

export default PurchaseOrderFormModal;
