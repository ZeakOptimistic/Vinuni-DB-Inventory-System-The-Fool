// src/components/suppliers/SupplierFormModal.jsx
import React, { useEffect, useState } from "react";
import { supplierApi } from "../../api/supplierApi";

/**
 * Modal form for creating or editing a supplier.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onSaved: (savedSupplier) => void
 * - initialSupplier: supplier object or null
 */
const SupplierFormModal = ({ open, onClose, onSaved, initialSupplier }) => {
  const isEdit = !!initialSupplier;

  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    phone: "",
    email: "",
    address: "",
    payment_terms: "",
    status: "ACTIVE",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Reset form when opening / switching between create & edit
  useEffect(() => {
    if (!open) return;

    setError(null);
    setFieldErrors({});

    if (initialSupplier) {
      setForm({
        name: initialSupplier.name || "",
        contact_name: initialSupplier.contact_name || "",
        phone: initialSupplier.phone || "",
        email: initialSupplier.email || "",
        address: initialSupplier.address || "",
        payment_terms: initialSupplier.payment_terms || "",
        status: initialSupplier.status || "ACTIVE",
      });
    } else {
      setForm({
        name: "",
        contact_name: "",
        phone: "",
        email: "",
        address: "",
        payment_terms: "",
        status: "ACTIVE",
      });
    }
  }, [open, initialSupplier]);

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
      name: form.name.trim(),
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      payment_terms: form.payment_terms.trim() || null,
      status: form.status,
    };

    try {
      let saved;
      if (isEdit && initialSupplier) {
        saved = await supplierApi.update(initialSupplier.supplier_id, payload);
      } else {
        saved = await supplierApi.create(payload);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 400 && err.response.data) {
        setFieldErrors(err.response.data);
        setError("Please fix the errors highlighted below.");
      } else {
        setError("Failed to save supplier. Please try again.");
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
          <h3 className="modal-title">
            {isEdit ? "Edit Supplier" : "New Supplier"}
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

          {/* Contact + Phone */}
          <div style={{ display: "flex", gap: 12 }}>
            <label className="form-label" style={{ flex: 1 }}>
              Contact name
              <input
                name="contact_name"
                className="form-input"
                value={form.contact_name}
                onChange={handleChange}
              />
              {fieldErrors.contact_name && (
                <span className="field-error">
                  {JSON.stringify(fieldErrors.contact_name)}
                </span>
              )}
            </label>
            <label className="form-label" style={{ flex: 1 }}>
              Phone
              <input
                name="phone"
                className="form-input"
                value={form.phone}
                onChange={handleChange}
              />
              {fieldErrors.phone && (
                <span className="field-error">
                  {JSON.stringify(fieldErrors.phone)}
                </span>
              )}
            </label>
          </div>

          {/* Email */}
          <label className="form-label">
            Email
            <input
              name="email"
              type="email"
              className="form-input"
              value={form.email}
              onChange={handleChange}
            />
            {fieldErrors.email && (
              <span className="field-error">
                {JSON.stringify(fieldErrors.email)}
              </span>
            )}
          </label>

          {/* Address */}
          <label className="form-label">
            Address
            <textarea
              name="address"
              className="form-input"
              style={{ minHeight: 60 }}
              value={form.address}
              onChange={handleChange}
            />
            {fieldErrors.address && (
              <span className="field-error">
                {JSON.stringify(fieldErrors.address)}
              </span>
            )}
          </label>

          {/* Payment terms + Status */}
          <div style={{ display: "flex", gap: 12 }}>
            <label className="form-label" style={{ flex: 2 }}>
              Payment terms
              <input
                name="payment_terms"
                className="form-input"
                value={form.payment_terms}
                onChange={handleChange}
                placeholder="Net 30, Net 45..."
              />
              {fieldErrors.payment_terms && (
                <span className="field-error">
                  {JSON.stringify(fieldErrors.payment_terms)}
                </span>
              )}
            </label>

            <label className="form-label" style={{ width: 150 }}>
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
          </div>

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
                : "Create supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierFormModal;
