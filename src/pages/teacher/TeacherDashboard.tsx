import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyTeacherDashboard } from "../../services/entities";
import { Link } from "react-router-dom";
import type { TeacherDashboardSummary } from "../../types/user";

export default function TeacherDashboard() {
  const user = getCurrentUser();
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getMyTeacherDashboard()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="page-header">
        <h2>Welcome, {user?.name}</h2>
        <p>Your teaching overview</p>
      </div>

      {loading ? (
        <p>Loading dashboard...</p>
      ) : !summary ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          <h3>Teacher Record Not Found</h3>
          <p>We could not find a teacher record matching your email ({user?.email}). Please contact administration.</p>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon primary">📚</div>
                <div className="stat-title">Active Classes</div>
              </div>
              <div className="stat-value">{summary.active_classes}</div>
              <div className="stat-desc">Courses you are teaching</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon success">👥</div>
                <div className="stat-title">Total Students</div>
              </div>
              <div className="stat-value">{summary.total_students}</div>
              <div className="stat-desc">Across all your classes</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon warning">📅</div>
                <div className="stat-title">Attendance</div>
              </div>
              <div className="stat-value">Action Required</div>
              <div className="stat-desc">Mark today's attendance</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
            <div className="content-card">
              <div className="card-header">
                <h3>Quick Links</h3>
              </div>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <Link to="/teacher/courses" className="btn btn-outline" style={{ justifyContent: "flex-start" }}>📚 View My Classes</Link>
                <Link to="/teacher/students" className="btn btn-outline" style={{ justifyContent: "flex-start" }}>👥 View My Students</Link>
                <Link to="/teacher/attendance" className="btn btn-outline" style={{ justifyContent: "flex-start" }}>📅 Mark Attendance</Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
