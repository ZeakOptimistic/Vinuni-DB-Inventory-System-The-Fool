// src/pages/suppliers/SuppliersPage.jsx
import React, { useEffect, useState } from "react";
import { supplierApi } from "../../api/supplierApi";
import SupplierFormModal from "../../components/suppliers/SupplierFormModal";
import { useAuth } from "../../hooks/useAuth";

const PAGE_SIZE = 10;

/**
 * SuppliersPage: view, search, sort, and CRUD for suppliers.
 *
 * Permission model:
 * - ADMIN / MANAGER: full CRUD (create, edit, delete).
 * - CLERK: read-only. Can search and view details, but cannot modify.
 */
const SuppliersPage = () => {
  const { user } = useAuth();

  // Permission flags based on role
  const canManageSuppliers =
    user && (user.role === "ADMIN" || user.role === "MANAGER");
  const isClerk = user && user.role === "CLERK";

  const [suppliers, setSuppliers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [ordering, setOrdering] = useState("name");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [initialSupplier, setInitialSupplier] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 0;

  // ----------------- Data loading -----------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = {
          page,
          pageSize: PAGE_SIZE,
          search: search || undefined,
          ordering: ordering || undefined,
        };

        const data = await supplierApi.list(params);
        const items = data.results || data || [];
        setSuppliers(items);
        setTotalCount(data.count ?? items.length);
      } catch (err) {
        console.error(err);
        setError("Failed to load suppliers. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [page, search, ordering]);

  // ----------------- Handlers -----------------
  const openCreateModal = () => {
    if (!canManageSuppliers) return;
    setInitialSupplier(null);
    setModalOpen(true);
  };

  const openEditModal = (supplier) => {
    if (!canManageSuppliers) return;
    setInitialSupplier(supplier);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setInitialSupplier(null);
  };

  const handleSupplierSaved = (saved) => {
    // Refresh list, but also do a small optimistic update for UX
    setSuppliers((prev) => {
      const exists = prev.find((s) => s.supplier_id === saved.supplier_id);
      if (exists) {
        return prev.map((s) =>
          s.supplier_id === saved.supplier_id ? saved : s
        );
      }
      return [saved, ...prev];
    });

    // To keep list in sync with server (esp. pagination), we can reload
    // from page 1 after save:
    setPage(1);
  };

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

  const handleDelete = async (supplier) => {
    if (!canManageSuppliers) {
      alert("You do not have permission to delete suppliers.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete supplier "${supplier.name}"?`
      )
    ) {
      return;
    }

    setDeletingId(supplier.supplier_id);
    try {
      await supplierApi.delete(supplier.supplier_id);
      setSuppliers((prev) =>
        prev.filter((s) => s.supplier_id !== supplier.supplier_id)
      );
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
      alert("Failed to delete supplier. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // ----------------- Render -----------------
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
        <h2 style={{ margin: 0 }}>Suppliers</h2>

        {canManageSuppliers && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateModal}
          >
            New Supplier
          </button>
        )}
      </div>

      {/* Read-only notice for Clerk */}
      {isClerk && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 10px",
            borderRadius: 8,
            background: "#FEF3C7",
            color: "#92400E",
            fontSize: 13,
          }}
        >
          You are signed in as <strong>Clerk</strong>. This page is read-only:
          you can search and view suppliers but cannot create, edit, or delete.
        </div>
      )}

      {/* Filters */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, phone, or email."
          className="form-input"
          style={{ minWidth: 220, maxWidth: 360 }}
        />
        <select
          value={ordering}
          onChange={handleOrderingChange}
          className="form-input"
          style={{ minWidth: 180, maxWidth: 220 }}
        >
          <option value="name">Name (A→Z)</option>
          <option value="-name">Name (Z→A)</option>
          <option value="contact_name">Contact name (A→Z)</option>
          <option value="-contact_name">Contact name (Z→A)</option>
        </select>
        <button className="btn btn-outline" type="submit">
          Search
        </button>
      </form>

      {/* Status / messages */}
      {loading && <div>Loading suppliers.</div>}
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
                {canManageSuppliers && <th style={thStyle}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr
                  key={s.supplier_id}
                  style={{ borderTop: "1px solid #e5e7eb" }}
                >
                  <td style={tdStyle}>{s.name}</td>
                  <td style={tdStyle}>{s.contact_name}</td>
                  <td style={tdStyle}>{s.phone}</td>
                  <td style={tdStyle}>{s.email}</td>
                  <td style={tdStyle}>{s.address}</td>
                  <td style={tdStyle}>{s.payment_terms}</td>
                  <td style={tdStyle}>
                    {s.status ? (
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
                    ) : (
                      "-"
                    )}
                  </td>
                  {canManageSuppliers && (
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
                          disabled={deletingId === s.supplier_id}
                        >
                          {deletingId === s.supplier_id
                            ? "Deleting..."
                            : "Delete"}
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
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
          }}
        >
          <div>
            Page {page} of {totalPages} · {totalCount} suppliers
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handlePrevPage}
              disabled={page <= 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleNextPage}
              disabled={totalPages === 0 || page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      <SupplierFormModal
        open={modalOpen}
        onClose={handleModalClose}
        onSaved={handleSupplierSaved}
        initialSupplier={initialSupplier}
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
