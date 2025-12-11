// src/components/categories/CategoryFormModal.jsx
import React, { useEffect, useState } from "react";
import { categoryApi } from "../../api/categoryApi";

/**
 * Modal form for creating or editing a category.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onSaved: (savedCategory) => void
 * - initialCategory: category object or null
 */
const CategoryFormModal = ({ open, onClose, onSaved, initialCategory }) => {
  const isEdit = !!initialCategory;

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Reset when open / change mode
  useEffect(() => {
    if (!open) return;

    setError(null);
    setFieldErrors({});

    if (initialCategory) {
      setForm({
        name: initialCategory.name || "",
        description: initialCategory.description || "",
      });
    } else {
      setForm({
        name: "",
        description: "",
      });
    }
  }, [open, initialCategory]);

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
      description: form.description.trim() || null,
    };

    try {
      let saved;
      if (isEdit && initialCategory) {
        saved = await categoryApi.update(initialCategory.category_id, payload);
      } else {
        saved = await categoryApi.create(payload);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 400 && err.response.data) {
        setFieldErrors(err.response.data);
        setError("Please fix the errors highlighted below.");
      } else {
        setError("Failed to save category. Please try again.");
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
            {isEdit ? "Edit Category" : "New Category"}
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

          <label className="form-label">
            Description
            <textarea
              name="description"
              className="form-input"
              style={{ minHeight: 60 }}
              value={form.description}
              onChange={handleChange}
              placeholder="Optional"
            />
            {fieldErrors.description && (
              <span className="field-error">
                {JSON.stringify(fieldErrors.description)}
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
                : "Create category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryFormModal;
