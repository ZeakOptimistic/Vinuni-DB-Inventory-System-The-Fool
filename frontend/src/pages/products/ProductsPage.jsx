// src/pages/products/ProductsPage.jsx
import React, { useEffect, useState } from "react";
import { productApi } from "../../api/productApi";
import ProductFormModal from "../../components/products/ProductFormModal";
import { useAuth } from "../../hooks/useAuth";

const PAGE_SIZE = 10;

/**
 * ProductsPage: view, search, sort, and basic CRUD for products.
 */
const ProductsPage = () => {
  const { user } = useAuth();

  // Permission flags derived from role
  const canManageProducts =
    user && (user.role === "ADMIN" || user.role === "MANAGER");

  const isClerk = user && user.role === "CLERK";

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [ordering, setOrdering] = useState("name");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const totalPages = count > 0 ? Math.ceil(count / PAGE_SIZE) : 0;

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productApi.list({
        page,
        pageSize: PAGE_SIZE,
        search,
        ordering,
      });
      setProducts(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      console.error(err);
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
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
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleProductSaved = () => {
    // Refresh list after create/update
    fetchProducts();
  };

  const handleDelete = async (product) => {
    if (!canManageProducts) {
      alert("You do not have permission to delete products.");
      return;
    }
    const ok = window.confirm(
      `Are you sure you want to delete product "${product.name}" (SKU: ${product.sku})?`
    );
    if (!ok) return;

    try {
      await productApi.remove(product.product_id);
      // If last item on this page was deleted, move one page back if needed
      if (products.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete product. Please try again.");
    }
  };

  const handleStatusChange = async (product, nextStatus) => {
    if (!canManageProducts) {
      alert("You do not have permission to change product status.");
      return;
    }

    const actionLabel = nextStatus === "INACTIVE" ? "deactivate" : "activate";
    const ok = window.confirm(
      `Are you sure you want to ${actionLabel} product "${product.name}" (SKU: ${product.sku})?`
    );
    if (!ok) return;

    try {
      setStatusUpdatingId(product.product_id);
      const updated = await productApi.setStatus(product.product_id, nextStatus);

      // Update list in-place without full refetch
      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === updated.product_id ? updated : p
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update product status. Please try again.");
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
        }}
      >
        <h2 style={{ margin: 0 }}>Products</h2>
        {canManageProducts && (
          <button className="btn btn-primary" type="button" onClick={openCreateModal}>
            New Product
          </button>
        )}
      </div>

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
          you can search and view products but cannot create, edit, or delete.
        </div>
      )}


      {/* Search + sort */}
      <form
        onSubmit={handleSearchSubmit}
        style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}
      >
        <input
          type="text"
          placeholder="Search by name, SKU, barcode..."
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
          <option value="unit_price">Unit price (low→high)</option>
          <option value="-unit_price">Unit price (high→low)</option>
          <option value="-created_at">Created (newest)</option>
          <option value="created_at">Created (oldest)</option>
        </select>

        <button className="btn btn-outline" type="submit">
          Search
        </button>
      </form>

      {/* Status */}
      {loading && <div>Loading products...</div>}
      {error && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div style={{ padding: 12, borderRadius: 8, background: "#f3f4f6" }}>
          No products found.
        </div>
      )}

      {/* Table */}
      {products.length > 0 && (
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
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Unit Price</th>
                <th style={thStyle}>Unit</th>
                <th style={thStyle}>Reorder Level</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created At</th>
                {canManageProducts && <th style={thStyle}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.product_id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>{p.sku}</td>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={tdStyle}>{p.category_name}</td>
                  <td style={tdStyle}>
                    {p.unit_price != null ? `${p.unit_price} ₫` : "-"}
                  </td>
                  <td style={tdStyle}>{p.unit_of_measure}</td>
                  <td style={tdStyle}>{p.reorder_level}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 12,
                        background:
                          p.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                        color: p.status === "ACTIVE" ? "#15803d" : "#b91c1c",
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {p.created_at
                      ? new Date(p.created_at).toLocaleString()
                      : "-"}
                  </td>
                {canManageProducts && (
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
                        onClick={() => openEditModal(p)}
                      >
                        Edit
                      </button>

                      {p.status === "ACTIVE" ? (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            borderColor: "#fecaca",
                          }}
                          onClick={() => handleStatusChange(p, "INACTIVE")}
                          disabled={statusUpdatingId === p.product_id}
                        >
                          {statusUpdatingId === p.product_id ? "Deactivating..." : "Deactivate"}
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
                          onClick={() => handleStatusChange(p, "ACTIVE")}
                          disabled={statusUpdatingId === p.product_id}
                        >
                          {statusUpdatingId === p.product_id ? "Activating..." : "Activate"}
                        </button>
                      )}

                      {/* Optional: keep hard delete only for ADMIN if you still want it */}
                      {/* {user.role === "ADMIN" && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            borderColor: "#fecaca",
                          }}
                          onClick={() => handleDelete(p)}
                        >
                          Delete
                        </button>
                      )} */}
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
            Page {page} of {totalPages} · {count} products
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
      <ProductFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSaved={handleProductSaved}
        initialProduct={editingProduct}
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

export default ProductsPage;
