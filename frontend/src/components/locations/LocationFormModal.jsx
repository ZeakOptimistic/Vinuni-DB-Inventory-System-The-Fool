// src/components/locations/LocationFormModal.jsx
import React, { useEffect, useState } from "react";
import { locationApi } from "../../api/locationApi";

/**
 * Modal form for creating or editing a location.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onSaved: (savedLocation) => void
 * - initialLocation: location object or null
 */
const LocationFormModal = ({ open, onClose, onSaved, initialLocation }) => {
  const isEdit = !!initialLocation;

  const [form, setForm] = useState({
    name: "",
    type: "WAREHOUSE",
    address: "",
    status: "ACTIVE",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Reset form when opening / switching mode
  useEffect(() => {
    if (!open) return;

    setError(null);
    setFieldErrors({});

    if (initialLocation) {
      setForm({
        name: initialLocation.name || "",
        type: initialLocation.type || "WAREHOUSE",
        address: initialLocation.address || "",
        status: initialLocation.status || "ACTIVE",
      });
    } else {
      setForm({
        name: "",
        type: "WAREHOUSE",
        address: "",
        status: "ACTIVE",
      });
    }
  }, [open, initialLocation]);

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
      type: form.type,
      address: form.address.trim() || null,
      status: form.status,
    };

    try {
      let saved;
      if (isEdit && initialLocation) {
        saved = await locationApi.update(initialLocation.location_id, payload);
      } else {
        saved = await locationApi.create(payload);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 400 && err.response.data) {
        setFieldErrors(err.response.data);
        setError("Please fix the errors highlighted below.");
      } else {
        setError("Failed to save location. Please try again.");
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
            {isEdit ? "Edit Location" : "New Location"}
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

          {/* Type */}
          <label className="form-label">
            Type
            <select
              name="type"
              className="form-input"
              value={form.type}
              onChange={handleChange}
              required
            >
              <option value="WAREHOUSE">WAREHOUSE</option>
              <option value="STORE">STORE</option>
            </select>
            {fieldErrors.type && (
              <span className="field-error">
                {JSON.stringify(fieldErrors.type)}
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
                : "Create location"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocationFormModal;
