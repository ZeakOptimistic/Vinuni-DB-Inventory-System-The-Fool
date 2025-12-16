// src/pages/categories/CategoriesPage.jsx
import React, { useEffect, useState } from "react";
import { categoryApi } from "../../api/categoryApi";
import CategoryFormModal from "../../components/categories/CategoryFormModal";
import { useAuth } from "../../hooks/useAuth";

/**
 * CategoriesPage:
 * - List, search, sort, paginate categories
 * - Allow staff to create, edit, delete
 */
const CategoriesPage = () => {
  const { user } = useAuth();
  const isStaff =
    user && ["ADMIN", "MANAGER", "CLERK"].includes(user.role);

  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [ordering, setOrdering] = useState("name");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const totalPages = count > 0 ? Math.ceil(count / pageSize) : 0;

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoryApi.list({
        page,
        pageSize,
        search,
        ordering,
      });
      setCategories(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      console.error(err);
      setError("Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, ordering]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleOrderingChange = (e) => {
    setOrdering(e.target.value);
    setPage(1);
  };

  const handlePrevPage = () => {
    setPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    if (totalPages === 0) return;
    setPage((p) => Math.min(totalPages, p + 1));
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleCategorySaved = () => {
    fetchCategories();
  };

  const handleDelete = async (category) => {
    const ok = window.confirm(
      `Are you sure you want to delete category "${category.name}"?`
    );
    if (!ok) return;

    try {
      await categoryApi.remove(category.category_id);
      if (categories.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        fetchCategories();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete category. Please try again.");
    }
  };

  const handleStatusChange = async (category, nextStatus) => {
    if (!isStaff) {
      alert("You do not have permission to change categories.");
      return;
    }

    const actionLabel = nextStatus === "INACTIVE" ? "deactivate" : "activate";
    const ok = window.confirm(
      `Are you sure you want to ${actionLabel} category "${category.name}"?`
    );
    if (!ok) return;

    try {
      setStatusUpdatingId(category.category_id);
      const updated = await categoryApi.setStatus(
        category.category_id,
        nextStatus
      );

      setCategories((prev) =>
        prev.map((c) =>
          c.category_id === updated.category_id ? updated : c
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update category status. Please try again.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Categories</h2>
        {isStaff && (
          <button
            className="btn btn-primary"
            type="button"
            onClick={openCreateModal}
          >
            New Category
          </button>
        )}
      </div>

      {/* Search + sort */}
      <form
        onSubmit={handleSearchSubmit}
        style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}
      >
        <input
          type="text"
          placeholder="Search by name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="form-input"
          style={{ maxWidth: 320 }}
        />

        <select
          value={ordering}
          onChange={handleOrderingChange}
          className="form-input"
          style={{ maxWidth: 220 }}
        >
          <option value="name">Sort by name (A→Z)</option>
          <option value="-name">Sort by name (Z→A)</option>
        </select>

        <button className="btn btn-outline" type="submit">
          Search
        </button>
      </form>

      {/* Status */}
      {loading && <div>Loading categories...</div>}
      {error && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div style={{ padding: 12, borderRadius: 8, background: "#f3f4f6" }}>
          No categories found.
        </div>
      )}

      {/* Table */}
      {categories.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <thead style={{ background: "#f9fafb" }}>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Status</th>
                {isStaff && <th style={thStyle}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.category_id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>{c.name}</td>
                  <td style={tdStyle}>{c.description || "-"}</td>
                  <td style={tdStyle}>
                    {c.status ? (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 12,
                          background:
                            c.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                          color: c.status === "ACTIVE" ? "#15803d" : "#b91c1c",
                        }}
                      >
                        {c.status}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  {isStaff && (
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: 12, padding: "4px 8px" }}
                          onClick={() => openEditModal(c)}
                        >
                          Edit
                        </button>

                        {c.status === "ACTIVE" ? (
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{
                              fontSize: 12,
                              padding: "4px 8px",
                              borderColor: "#fecaca",
                            }}
                            onClick={() => handleStatusChange(c, "INACTIVE")}
                            disabled={statusUpdatingId === c.category_id}
                          >
                            {statusUpdatingId === c.category_id
                              ? "Deactivating..."
                              : "Deactivate"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{
                              fontSize: 12,
                              padding: "4px 8px",
                              borderColor: "#bbf7d0",
                            }}
                            onClick={() => handleStatusChange(c, "ACTIVE")}
                            disabled={statusUpdatingId === c.category_id}
                          >
                            {statusUpdatingId === c.category_id
                              ? "Activating..."
                              : "Activate"}
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            borderColor: "#fecaca",
                          }}
                          onClick={() => handleDelete(c)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
            Page {page} of {totalPages} · {count} categories
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
              onClick={handlePrevPage}
              disabled={page <= 1}
            >
              Previous
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={handleNextPage}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modal for create / edit */}
      <CategoryFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSaved={handleCategorySaved}
        initialCategory={editingCategory}
      />
    </div>
  );
};

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 600,
  color: "#4b5563",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle = {
  padding: "8px 12px",
  color: "#374151",
};

export default CategoriesPage;
