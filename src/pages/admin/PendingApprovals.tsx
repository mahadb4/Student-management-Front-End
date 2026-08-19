import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getPendingUsers, approveUser, rejectUser } from "../../services/auth";
import type { User } from "../../types/user";

function PendingApprovals() {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      setError(null);
      const users = await getPendingUsers();
      setPendingUsers(users);
    } catch (error) {
      console.error("Failed to fetch pending users:", error);
      setError("Failed to load pending approval requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(id);

      const success = await approveUser(id);

      if (!success) {
        setError("Failed to approve user.");
        return;
      }

      await fetchPending();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionLoading(id);

      const success = await rejectUser(id);

      if (!success) {
        setError("Failed to reject user.");
        return;
      }

      await fetchPending();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DashboardLayout title="Pending Approvals">
      <div className="page-header">
        <h2>Registration Approvals</h2>
        <p>Review and approve new user accounts</p>
      </div>

      <div className="content-card">
        <div className="card-header">
          <h3>Pending Requests</h3>
        </div>

        {error && (
          <div className="error-alert">
            {error}
          </div>
        )}

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Requested Role</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center" }}>
                    Loading requests...
                  </td>
                </tr>
              ) : pendingUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    No pending approvals at this time.
                  </td>
                </tr>
              ) : (
                pendingUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>

                    <td style={{ textTransform: "capitalize" }}>
                      {user.role}
                    </td>

                    <td>
                      <div className="action-group">
                        <button
                          className="btn btn-success"
                          onClick={() => handleApprove(user.id.toString())}
                          disabled={actionLoading === user.id}
                        >
                          {actionLoading === user.id
                            ? "Processing..."
                            : "Approve"}
                        </button>

                        <button
                          className="btn btn-danger"
                          onClick={() => handleReject(user.id.toString())}
                          disabled={actionLoading === user.id}
                        >
                          {actionLoading === user.id
                            ? "Processing..."
                            : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default PendingApprovals;