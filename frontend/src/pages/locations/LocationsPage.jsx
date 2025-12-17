// src/pages/locations/LocationsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { locationApi } from "../../api/locationApi";
import LocationFormModal from "../../components/locations/LocationFormModal";
import { useAuth } from "../../hooks/useAuth";

/**
 * LocationsPage: view, search, sort, and basic CRUD for locations.
 *
 * Permission model:
 * - ADMIN / MANAGER: full CRUD (create, edit, delete).
 * - CLERK: read-only. Can search & view but not modify.
 *
 * Pagination strategy:
 * - Fetch ALL items (listAll)
 * - Search/sort/paginate in frontend (slice)
 */
const LocationsPage = () => {
  const { user } = useAuth();

  // permission flags
  const canManageLocations =
    user && (user.role === "ADMIN" || user.role === "MANAGER");
  const isClerk = user && user.role === "CLERK";

  const [locations, setLocations] = useState([]);

  // client-side pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // client-side search/sort
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [ordering, setOrdering] = useState("name");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // --------- Load data ----------
  const fetchLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await locationApi.listAll();
      setLocations(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load locations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLocations = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    let list = Array.isArray(locations) ? [...locations] : [];

    if (q) {
      list = list.filter((l) => {
        const hay = [l?.name, l?.address, l?.type].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    const ord = ordering || "name";
    const desc = ord.startsWith("-");
    const key = desc ? ord.slice(1) : ord;

    list.sort((a, b) => {
      const va = a?.[key];
      const vb = b?.[key];

      const da = va ? Date.parse(va) : NaN;
      const db = vb ? Date.parse(vb) : NaN;
      if (!Number.isNaN(da) && !Number.isNaN(db)) return desc ? db - da : da - db;

      const sa = (va ?? "").toString().toLowerCase();
      const sb = (vb ?? "").toString().toLowerCase();
      if (sa < sb) return desc ? 1 : -1;
      if (sa > sb) return desc ? -1 : 1;
      return 0;
    });

    return list;
  }, [locations, search, ordering]);

  const totalPages = Math.max(1, Math.ceil(filteredLocations.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedLocations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLocations.slice(start, start + pageSize);
  }, [filteredLocations, page, pageSize]);

  // --------- Handlers ----------
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleOrderingChange = (e) => {
    setOrdering(e.target.value);
    setPage(1);
  };

  const handlePrevPage = () => setPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setPage((p) => Math.min(totalPages, p + 1));

  const openCreateModal = () => {
    if (!canManageLocations) return;
    setEditingLocation(null);
    setIsModalOpen(true);
  };

  const openEditModal = (location) => {
    if (!canManageLocations) return;
    setEditingLocation(location);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
  };

  const handleLocationSaved = () => {
    fetchLocations();
  };

  const handleDelete = async (location) => {
    if (!canManageLocations) {
      alert("You do not have permission to delete locations.");
      return;
    }

    const ok = window.confirm(
      `Are you sure you want to delete location "${location.name}"?`
    );
    if (!ok) return;

    try {
      await locationApi.remove(location.location_id);
      setLocations((prev) =>
        (Array.isArray(prev) ? prev : []).filter((l) => l.location_id !== location.location_id)
      );
    } catch (err) {
      console.error(err);
      alert("Failed to delete location. Please try again.");
    }
  };

  const handleStatusChange = async (location, nextStatus) => {
    if (!canManageLocations) {
      alert("You do not have permission to change location status.");
      return;
    }

    const actionLabel = nextStatus === "INACTIVE" ? "deactivate" : "activate";
    const ok = window.confirm(
      `Are you sure you want to ${actionLabel} location "${location.name}"?`
    );
    if (!ok) return;

    try {
      setStatusUpdatingId(location.location_id);
      const updated = await locationApi.setStatus(location.location_id, nextStatus);

      // Update current list without refetching everything
      setLocations((prev) =>
        (Array.isArray(prev) ? prev : []).map((l) =>
          l.location_id === updated.location_id ? updated : l
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update location status. Please try again.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // --------- Render ----------
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
        <h2 style={{ margin: 0 }}>Locations</h2>
        {canManageLocations && (
          <button className="btn btn-primary" type="button" onClick={openCreateModal}>
            New Location
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
          you can search and view locations but cannot create, edit, or delete.
        </div>
      )}

      {/* Search + sort */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search by name or address..."
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
          <option value="-created_at">Created (newest)</option>
          <option value="created_at">Created (oldest)</option>
        </select>

        <button className="btn btn-outline" type="submit">
          Search
        </button>
      </form>

      {/* Status */}
      {loading && <div>Loading locations...</div>}
      {error && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!loading && filteredLocations.length === 0 && (
        <div style={{ padding: 12, borderRadius: 8, background: "#f3f4f6" }}>
          No locations found.
        </div>
      )}

      {/* Table */}
      {filteredLocations.length > 0 && (
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
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Address</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created At</th>
                {canManageLocations && <th style={thStyle}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pagedLocations.map((l) => (
                <tr key={l.location_id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>{l.name}</td>
                  <td style={tdStyle}>{l.type}</td>
                  <td style={tdStyle}>{l.address}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 12,
                        background: l.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                        color: l.status === "ACTIVE" ? "#15803d" : "#b91c1c",
                      }}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {l.created_at ? new Date(l.created_at).toLocaleString() : "-"}
                  </td>
                  {canManageLocations && (
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: 12, padding: "4px 8px" }}
                          onClick={() => openEditModal(l)}
                        >
                          Edit
                        </button>

                        {l.status === "ACTIVE" ? (
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{
                              fontSize: 12,
                              padding: "4px 8px",
                              borderColor: "#fecaca",
                            }}
                            onClick={() => handleStatusChange(l, "INACTIVE")}
                            disabled={statusUpdatingId === l.location_id}
                          >
                            {statusUpdatingId === l.location_id ? "Deactivating..." : "Deactivate"}
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
                            onClick={() => handleStatusChange(l, "ACTIVE")}
                            disabled={statusUpdatingId === l.location_id}
                          >
                            {statusUpdatingId === l.location_id ? "Activating..." : "Activate"}
                          </button>
                        )}

                        {/* Optional: keep hard delete; remove if you only want soft deactivate */}
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            borderColor: "#fecaca",
                          }}
                          onClick={() => handleDelete(l)}
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
      {filteredLocations.length > 0 && (
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
            Page {page} of {totalPages} · {filteredLocations.length} locations
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
      <LocationFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSaved={handleLocationSaved}
        initialLocation={editingLocation}
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

export default LocationsPage;
