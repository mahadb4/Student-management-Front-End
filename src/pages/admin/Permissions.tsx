import { useEffect, useState } from "react";
import { getUsers } from "../../services/auth";
import type { User } from "../../types/user";

export default function Permissions() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async () => {
      try {
        const data = await getUsers(controller.signal);
        setUsers(data);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error("Failed to load users", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
    
    return () => controller.abort();
  }, []);

  return (
    <>
      <div className="page-header">
        <h2>System Permissions</h2>
        <p>Manage access controls across the platform</p>
      </div>

      <div className="content-card" style={{ marginBottom: "24px", padding: "20px" }}>
        <h4 style={{ margin: "0 0 12px 0", color: "var(--color-primary)" }}>ℹ️ Backend Capability Note</h4>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
          The backend <code>/users/</code> API currently does not support PATCH/PUT requests. Dynamic permission assignment is disabled in the UI until the backend implements this endpoint. Granular permission checks are already fully wired up in the frontend via the <code>usePermissions</code> hook.
        </p>
      </div>

      <div className="content-card">
        <div className="card-header">
          <h3>User Roles & Permissions Matrix</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Permissions Array</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "24px" }}>Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "24px" }}>No users found.</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-success'}`} style={{textTransform:"capitalize"}}>{u.role}</span></td>
                    <td>
                      {u.permissions && u.permissions.length > 0 
                        ? <code style={{ fontSize: "0.75rem", background: "var(--color-background)", padding: "4px" }}>{JSON.stringify(u.permissions)}</code>
                        : <span style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>[Empty] - Default Role Access</span>
                      }
                    </td>
                    <td>
                      <button disabled className="btn btn-outline" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                        Edit Permissions
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
