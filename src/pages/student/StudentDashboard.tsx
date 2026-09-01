import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";
import { getMyStudentSummary } from "../../services/entities";
import type { StudentSummary } from "../../types/user";

export default function StudentDashboard() {
  const user = getCurrentUser();
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getMyStudentSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeEnrollmentsCount = summary?.active_enrollments_count ?? 0;
  const presentCount = summary?.present_count ?? 0;
  const absentCount = summary?.absent_count ?? 0;
  const recentAttendance = summary?.recent_attendance ?? [];

  return (
    <>
      <div className="page-header">
        <h2>Welcome, {user?.name}</h2>
        <p>Your academic overview</p>
      </div>

      {loading ? (
        <p>Loading dashboard...</p>
      ) : !summary ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          <h3>Student Record Not Found</h3>
          <p>We could not find a student record matching your email ({user?.email}). Please contact administration.</p>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon primary">📚</div>
                <div className="stat-title">Active Enrollments</div>
              </div>
              <div className="stat-value">{activeEnrollmentsCount}</div>
              <div className="stat-desc">Courses you are taking</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon success">✅</div>
                <div className="stat-title">Classes Attended</div>
              </div>
              <div className="stat-value">{presentCount}</div>
              <div className="stat-desc">Total marked present</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon warning">⚠️</div>
                <div className="stat-title">Absences</div>
              </div>
              <div className="stat-value">{absentCount}</div>
              <div className="stat-desc">Total marked absent</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
            <div className="content-card">
              <div className="card-header">
                <h3>Quick Links</h3>
              </div>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <Link to="/student/courses" className="btn btn-outline" style={{ justifyContent: "flex-start" }}>📚 View My Courses</Link>
                <Link to="/student/attendance" className="btn btn-outline" style={{ justifyContent: "flex-start" }}>📅 Check Attendance</Link>
                <Link to="/student/profile" className="btn btn-outline" style={{ justifyContent: "flex-start" }}>👤 View Profile</Link>
              </div>
            </div>

            <div className="content-card">
              <div className="card-header">
                <h3>Recent Activity</h3>
              </div>
              <div style={{ padding: "24px" }}>
                {recentAttendance.length > 0 ? (
                  <ul style={{ paddingLeft: "20px", color: "var(--color-text-secondary)" }}>
                    {recentAttendance.map(a => (
                      <li key={a.id} style={{ marginBottom: "8px" }}>
                        Marked <strong>{a.status}</strong> on {a.date}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: "var(--color-text-secondary)" }}>No recent activity.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
