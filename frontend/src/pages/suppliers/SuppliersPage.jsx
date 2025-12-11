// src/pages/suppliers/SuppliersPage.jsx
import React, { useEffect, useState } from "react";
import { supplierApi } from "../../api/supplierApi";
import SupplierFormModal from "../../components/suppliers/SupplierFormModal";
import { useAuth } from "../../hooks/useAuth";

const PAGE_SIZE = 10;

/**
 * SuppliersPage: view, search, sort, and basic CRUD for suppliers.
 */
const SuppliersPage = () => {
  const { user } = useAuth();
  const isStaff =
    user && ["ADMIN", "MANAGER", "CLERK"].includes(user.role);

  const [suppliers, setSuppliers] = useState([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [ordering, setOrdering] = useState("name");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const totalPages = count > 0 ? Math.ceil(count / PAGE_SIZE) : 0;

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await supplierApi.list({
        page,
        pageSize: PAGE_SIZE,
        search,
        ordering,
      });
      setSuppliers(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      console.error(err);
      setError("Failed to load suppliers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, ordering]);

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
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleSupplierSaved = () => {
    fetchSuppliers();
  };

  const handleDelete = async (supplier) => {
    const ok = window.confirm(
      `Are you sure you want to delete supplier "${supplier.name}"?`
    );
    if (!ok) return;

    try {
      await supplierApi.remove(supplier.supplier_id);
      if (suppliers.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        fetchSuppliers();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete supplier. Please try again.");
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
        }}
      >
        <h2 style={{ margin: 0 }}>Suppliers</h2>
        {isStaff && (
          <button className="btn btn-primary" type="button" onClick={openCreateModal}>
            New Supplier
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
          placeholder="Search by name, contact, email, phone..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="form-input"
          style={{ maxWidth: 320 }}
        />
        <button className="btn btn-outline" type="submit">
          Search
        </button>

        <select
          value={ordering}
          onChange={handleOrderingChange}
          className="form-input"
          style={{ maxWidth: 220 }}
        >
          <option value="name">Sort by name (A→Z)</option>
          <option value="-name">Sort by name (Z→A)</option>
          <option value="-created_at">Created (newest)</option>
          <option value="created_at">Created (oldest)</option>
        </select>
      </form>

      {/* Status */}
      {loading && <div>Loading suppliers...</div>}
      {error && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!loading && suppliers.length === 0 && (
        <div style={{ padding: 12, borderRadius: 8, background: "#f3f4f6" }}>
          No suppliers found.
        </div>
      )}

      {/* Table */}
      {suppliers.length > 0 && (
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
                <th style={thStyle}>Contact</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Address</th>
                <th style={thStyle}>Payment terms</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created At</th>
                {isStaff && <th style={thStyle}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.supplier_id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>{s.name}</td>
                  <td style={tdStyle}>{s.contact_name}</td>
                  <td style={tdStyle}>{s.phone}</td>
                  <td style={tdStyle}>{s.email}</td>
                  <td style={tdStyle}>{s.address}</td>
                  <td style={tdStyle}>{s.payment_terms}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 12,
                        background:
                          s.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                        color: s.status === "ACTIVE" ? "#15803d" : "#b91c1c",
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {s.created_at
                      ? new Date(s.created_at).toLocaleString()
                      : "-"}
                  </td>
                  {isStaff && (
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: 12, padding: "4px 8px" }}
                          onClick={() => openEditModal(s)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            borderColor: "#fecaca",
                          }}
                          onClick={() => handleDelete(s)}
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
            Page {page} of {totalPages} · {count} suppliers
          </span>
          <div style={{ display: "flex", gap: 8 }}>
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
      <SupplierFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSaved={handleSupplierSaved}
        initialSupplier={editingSupplier}
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

export default SuppliersPage;
