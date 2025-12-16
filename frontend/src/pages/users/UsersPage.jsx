// src/pages/users/UsersPage.jsx
import React, { useEffect, useState } from "react";
import { userApi } from "../../api/userApi";

const TOKEN_KEY = "sipms_token";
const USER_KEY = "sipms_user";
const BACKUP_TOKEN_KEY = "sipms_admin_token_backup";
const BACKUP_USER_KEY = "sipms_admin_user_backup";

const UsersPage = () => {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [ordering, setOrdering] = useState("-user_id");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const totalPages = count > 0 ? Math.ceil(count / pageSize) : 0;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.list({
        page,
        pageSize,
        search,
        ordering,
      });
      setRows(data.results || []);
      setCount(data.count || 0);
    } catch (e) {
      console.error(e);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, ordering]);

  const onNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const onEdit = (u) => {
    setEditing(u);
    setOpen(true);
  };

  const onImpersonate = async (u) => {
    const ok = window.confirm(`Login as "${u.username}"? You can switch back later.`);
    if (!ok) return;

    setBusyId(u.user_id);
    try {
      const { access, user } = await userApi.impersonate(u.user_id);

      // backup admin session (only once)
      if (!localStorage.getItem(BACKUP_TOKEN_KEY)) {
        localStorage.setItem(BACKUP_TOKEN_KEY, localStorage.getItem(TOKEN_KEY) || "");
        localStorage.setItem(BACKUP_USER_KEY, localStorage.getItem(USER_KEY) || "");
      }

      // swap to user session
      localStorage.setItem(TOKEN_KEY, access);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      // reload app to let AuthContext re-read the new user/token
      window.location.href = "/dashboard";
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.detail || "Failed to login as user.";
      alert(msg);
    } finally {
      setBusyId(null);
    }
  };


  const onDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.username}"?`)) return;
    setBusyId(u.user_id);
    try {
      await userApi.remove(u.user_id);
      await load();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.detail || "Failed to delete user. Please try again.";
      alert(msg);
    } finally {
      setBusyId(null);
    }
  };

  const onToggleStatus = async (u) => {
    const next = u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const actionLabel = next === "INACTIVE" ? "deactivate" : "activate";
    const ok = window.confirm(`Are you sure you want to ${actionLabel} "${u.username}"?`);
    if (!ok) return;

    setBusyId(u.user_id);
    try {
      await userApi.setStatus(u.user_id, next);
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to update user status. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const onSubmit = async (payload) => {
    setBusyId("modal");
    try {
      if (editing) await userApi.update(editing.user_id, payload);
      else await userApi.create(payload);

      setOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      console.error(e);
      throw e; // let modal show field errors if any
    } finally {
      setBusyId(null);
    }
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

  const handlePrevPage = () => setPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => {
    if (totalPages === 0) return;
    setPage((p) => Math.min(totalPages, p + 1));
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
        <h2 style={{ margin: 0 }}>Users</h2>
        <button className="btn btn-primary" type="button" onClick={onNew}>
          New User
        </button>
      </div>

      {/* Search + sort */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search username, name, email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="form-input"
          style={{ minWidth: 240, maxWidth: 360 }}
        />

        <select
          value={ordering}
          onChange={handleOrderingChange}
          className="form-input"
          style={{ minWidth: 180, maxWidth: 220 }}
        >
          <option value="-user_id">Newest</option>
          <option value="username">Username (A→Z)</option>
          <option value="-username">Username (Z→A)</option>
          <option value="created_at">Created (old→new)</option>
          <option value="-created_at">Created (new→old)</option>
        </select>

        <button className="btn btn-outline" type="submit">
          Search
        </button>
      </form>

      {/* Status */}
      {loading && <div>Loading users...</div>}
      {error && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div style={{ padding: 12, borderRadius: 8, background: "#f3f4f6" }}>
          No users found.
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
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
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Full name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((u) => (
                <tr key={u.user_id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>{u.username}</td>
                  <td style={tdStyle}>{u.full_name || "-"}</td>
                  <td style={tdStyle}>{u.email || "-"}</td>
                  <td style={tdStyle}>{u.role_name || "-"}</td>
                  <td style={tdStyle}>
                    <span style={statusPillStyle(u.status)}>{u.status}</span>
                  </td>

                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: 12, padding: "4px 8px" }}
                        onClick={() => onEdit(u)}
                        disabled={busyId === u.user_id}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: 12, padding: "4px 8px" }}
                        onClick={() => onImpersonate(u)}
                        disabled={busyId === u.user_id}
                        >
                        Login as
                      </button>

                      {u.status === "ACTIVE" ? (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            borderColor: "#fecaca",
                          }}
                          onClick={() => onToggleStatus(u)}
                          disabled={busyId === u.user_id}
                        >
                          {busyId === u.user_id ? "Deactivating..." : "Deactivate"}
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
                          onClick={() => onToggleStatus(u)}
                          disabled={busyId === u.user_id}
                        >
                          {busyId === u.user_id ? "Activating..." : "Activate"}
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
                        onClick={() => onDelete(u)}
                        disabled={busyId === u.user_id}
                      >
                        {busyId === u.user_id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
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
            Page {page} of {totalPages} · {count} users
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

      {/* Modal */}
      <UserFormModal
        open={open}
        editing={editing}
        busy={busyId === "modal"}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={onSubmit}
      />
    </div>
  );
};

const UserFormModal = ({ open, editing, busy, onClose, onSubmit }) => {
  const isEdit = !!editing;

  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [username, setUsername] = useState(editing?.username || "");
  const [fullName, setFullName] = useState(editing?.full_name || "");
  const [email, setEmail] = useState(editing?.email || "");
  const [roleId, setRoleId] = useState(editing?.role_id ? String(editing.role_id) : "");
  const [status, setStatus] = useState(editing?.status || "ACTIVE");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) return;

    setError(null);
    setFieldErrors({});
    setPassword("");

    setUsername(editing?.username || "");
    setFullName(editing?.full_name || "");
    setEmail(editing?.email || "");
    setRoleId(editing?.role_id ? String(editing.role_id) : "");
    setStatus(editing?.status || "ACTIVE");

    (async () => {
      try {
        const data = await userApi.listRoles();
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        setRoles(list);
        if (!(editing?.role_id) && !roleId && list.length) {
          setRoleId(String(list[0].role_id));
        }
       } catch (e) {
        console.error(e);
        setError("Failed to load roles. Please try again.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = {
      username,
      full_name: fullName.trim() || null,
      email: email.trim() || null,
      role_id: Number(roleId),
      status,
    };
    if (password) payload.password = password;

    try {
      await onSubmit(payload);
    } catch (err) {
      // try show DRF 400 field errors
      if (err?.response?.status === 400 && err?.response?.data) {
        setFieldErrors(err.response.data);
        setError("Please fix the errors highlighted below.");
      } else {
        setError("Failed to save user. Please try again.");
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {isEdit ? `Edit User: ${editing.username}` : "New User"}
          </h3>
          <button className="modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="modal-body">
          {error && (
            <div className="form-error" style={{ marginBottom: 4 }}>
              {error}
            </div>
          )}

          <label className="form-label">
            Username
            <input
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEdit}
              required
            />
            {fieldErrors.username && (
              <span className="field-error">{JSON.stringify(fieldErrors.username)}</span>
            )}
          </label>

          <label className="form-label">
            Full name
            <input
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            {fieldErrors.full_name && (
              <span className="field-error">{JSON.stringify(fieldErrors.full_name)}</span>
            )}
          </label>

          <label className="form-label">
            Email
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {fieldErrors.email && (
              <span className="field-error">{JSON.stringify(fieldErrors.email)}</span>
            )}
          </label>

          <div style={{ display: "flex", gap: 12 }}>
            <label className="form-label" style={{ flex: 1 }}>
              Role
              <select className="form-input" value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
                {(Array.isArray(roles) ? roles : []).map((r) => (
                  <option key={r.role_id} value={String(r.role_id)}>
                    {r.role_name}
                  </option>
                ))}
              </select>
              {fieldErrors.role_id && (
                <span className="field-error">{JSON.stringify(fieldErrors.role_id)}</span>
              )}
            </label>

            <label className="form-label" style={{ width: 160 }}>
              Status
              <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)} required>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              {fieldErrors.status && (
                <span className="field-error">{JSON.stringify(fieldErrors.status)}</span>
              )}
            </label>
          </div>

          <label className="form-label">
            Password
            <input
              className="form-input"
              type="password"
              placeholder={isEdit ? "New password (optional)" : "Password (leave empty if backend sets default)"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {fieldErrors.password && (
              <span className="field-error">{JSON.stringify(fieldErrors.password)}</span>
            )}
          </label>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save changes" : "Create user"}
            </button>
          </div>
        </form>
      </div>
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

const statusPillStyle = (status) => ({
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  background: status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
  color: status === "ACTIVE" ? "#15803d" : "#b91c1c",
});

export default UsersPage;
