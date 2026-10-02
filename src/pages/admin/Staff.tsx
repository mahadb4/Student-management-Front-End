import { useEffect, useState } from "react";
import { getMockUsers } from "../../services/auth";
import type { User } from "../../types/user";

function Staff() {
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchStaff = async () => {
      try {
        const allUsers = await getMockUsers(controller.signal);
        setStaff(allUsers.filter((u: User) => u.role === "staff" && u.status === "approved"));
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
    
    return () => controller.abort();
  }, []);

  return (
    <>
      <div className="page-header">
        <h2>Staff</h2>
        <p>Manage administrative and support staff</p>
      </div>

      <div className="content-card">
        <div className="card-header">
          <h3>Staff Directory</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center" }}>Loading staff...</td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
                    No active staff found.
                  </td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td><span className="badge badge-success">Active</span></td>
                    <td>
                      <button className="btn btn-outline">View Profile</button>
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

export default Staff;
