// src/components/products/ProductFormModal.jsx
import React, { useEffect, useState } from "react";
import { categoryApi } from "../../api/categoryApi";
import { productApi } from "../../api/productApi";

/**
 * Modal form for creating or editing a product.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onSaved: (savedProduct) => void  // called after successful create/update
 * - initialProduct: product object or null
 */
const ProductFormModal = ({ open, onClose, onSaved, initialProduct }) => {
  const isEdit = !!initialProduct;

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [form, setForm] = useState({
    category: "",
    name: "",
    sku: "",
    barcode: "",
    description: "",
    unit_price: "",
    unit_of_measure: "",
    reorder_level: "",
    status: "ACTIVE",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Whenever modal opens or initialProduct changes, reset form
  useEffect(() => {
    if (!open) return;

    setError(null);
    setFieldErrors({});

    if (initialProduct) {
      setForm({
        category: initialProduct.category || "",
        name: initialProduct.name || "",
        sku: initialProduct.sku || "",
        barcode: initialProduct.barcode || "",
        description: initialProduct.description || "",
        unit_price:
          initialProduct.unit_price !== null
            ? String(initialProduct.unit_price)
            : "",
        unit_of_measure: initialProduct.unit_of_measure || "",
        reorder_level:
          initialProduct.reorder_level !== null
            ? String(initialProduct.reorder_level)
            : "",
        status: initialProduct.status || "ACTIVE",
      });
    } else {
      setForm({
        category: "",
        name: "",
        sku: "",
        barcode: "",
        description: "",
        unit_price: "",
        unit_of_measure: "",
        reorder_level: "",
        status: "ACTIVE",
      });
    }
  }, [open, initialProduct]);

  // Load categories when modal opens
  useEffect(() => {
    if (!open) return;

    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const data = await categoryApi.listAll();
        setCategories(data);
      } catch (err) {
        console.error(err);
        // do not block saving if categories fail, but show a message
        setError("Failed to load categories. Please try again.");
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const payload = {
      category: form.category ? Number(form.category) : null,
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      description: form.description.trim(),
      unit_price: form.unit_price, // send as string, backend decimal will parse
      unit_of_measure: form.unit_of_measure.trim(),
      reorder_level: form.reorder_level
        ? Number(form.reorder_level)
        : 0,
      status: form.status,
    };

    try {
      let saved;
      if (isEdit && initialProduct) {
        saved = await productApi.update(initialProduct.product_id, payload);
      } else {
        saved = await productApi.create(payload);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 400 && err.response.data) {
        setFieldErrors(err.response.data);
        setError("Please fix the errors highlighted below.");
      } else {
        setError("Failed to save product. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {/* stop click from bubbling from modal content to backdrop */}
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {isEdit ? "Edit Product" : "New Product"}
          </h3>
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

          {/* Category */}
          <label className="form-label">
            Category
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>
            {loadingCategories && (
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                Loading categories...
              </span>
            )}
            {fieldErrors.category && (
              <span className="field-error">
                {JSON.stringify(fieldErrors.category)}
              </span>
            )}
          </label>

          {/* Name */}
          <label className="form-label">
            Name
            <input
              name="name"
              className="form-input"
              value={form.name}
              onChange={handleChange}
              required
            />
            {fieldErrors.name && (
              <span className="field-error">
                {JSON.stringify(fieldErrors.name)}
              </span>
            )}
          </label>

          {/* SKU + Barcode */}
          <div style={{ display: "flex", gap: 12 }}>
            <label className="form-label" style={{ flex: 1 }}>
              SKU
              <input
                name="sku"
                className="form-input"
                value={form.sku}
                onChange={handleChange}
                required
              />
              {fieldErrors.sku && (
                <span className="field-error">
                  {JSON.stringify(fieldErrors.sku)}
                </span>
              )}
            </label>
            <label className="form-label" style={{ flex: 1 }}>
              Barcode
              <input
                name="barcode"
                className="form-input"
                value={form.barcode}
                onChange={handleChange}
              />
              {fieldErrors.barcode && (
                <span className="field-error">
                  {JSON.stringify(fieldErrors.barcode)}
                </span>
              )}
            </label>
          </div>

          {/* Description */}
          <label className="form-label">
            Description
            <textarea
              name="description"
              className="form-input"
              style={{ minHeight: 70 }}
              value={form.description}
              onChange={handleChange}
            />
            {fieldErrors.description && (
              <span className="field-error">
                {JSON.stringify(fieldErrors.description)}
              </span>
            )}
          </label>

          {/* Unit price + unit + reorder level */}
          <div style={{ display: "flex", gap: 12 }}>
            <label className="form-label" style={{ flex: 1 }}>
              Unit price
              <input
                name="unit_price"
                type="number"
                step="0.01"
                className="form-input"
                value={form.unit_price}
                onChange={handleChange}
                required
              />
              {fieldErrors.unit_price && (
                <span className="field-error">
                  {JSON.stringify(fieldErrors.unit_price)}
                </span>
              )}
            </label>

            <label className="form-label" style={{ flex: 1 }}>
              Unit of measure
              <input
                name="unit_of_measure"
                className="form-input"
                value={form.unit_of_measure}
                onChange={handleChange}
                placeholder="PCS, BOX, PACK..."
                required
              />
              {fieldErrors.unit_of_measure && (
                <span className="field-error">
                  {JSON.stringify(fieldErrors.unit_of_measure)}
                </span>
              )}
            </label>

            <label className="form-label" style={{ width: 120 }}>
              Reorder level
              <input
                name="reorder_level"
                type="number"
                min="0"
                className="form-input"
                value={form.reorder_level}
                onChange={handleChange}
                required
              />
              {fieldErrors.reorder_level && (
                <span className="field-error">
                  {JSON.stringify(fieldErrors.reorder_level)}
                </span>
              )}
            </label>
          </div>

          {/* Status */}
          <label className="form-label">
            Status
            <select
              name="status"
              className="form-input"
              value={form.status}
              onChange={handleChange}
              required
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            {fieldErrors.status && (
              <span className="field-error">
                {JSON.stringify(fieldErrors.status)}
              </span>
            )}
          </label>

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
              {submitting
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                ? "Save changes"
                : "Create product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
