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

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, monthIndex, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return dateStr;
  }

  return (
    <>
      <div className="page-header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2>Welcome, {user?.name}</h2>
          <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--color-text-secondary)" }}>
            Your student academic overview & progress
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/student/courses" className="btn btn-primary btn-sm" style={{ padding: "8px 16px", fontWeight: 600 }}>
            View Courses
          </Link>
          <Link to="/student/assignments" className="btn btn-secondary btn-sm" style={{ padding: "8px 16px", fontWeight: 600 }}>
            Assignments
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-secondary)" }}>Loading dashboard...</div>
      ) : !summary ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          <h3>Student Record Not Found</h3>
          <p>We could not find a student record matching your email ({user?.email}). Please contact administration.</p>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="dashboard-grid" style={{ marginBottom: "24px" }}>
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon primary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
                <div className="stat-title">Active Enrollments</div>
              </div>
              <div className="stat-value">{activeEnrollmentsCount}</div>
              <div className="stat-desc">Courses currently enrolled</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon success">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div className="stat-title">Classes Attended</div>
              </div>
              <div className="stat-value">{presentCount}</div>
              <div className="stat-desc">Sessions marked present</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon warning">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="stat-title">Absences</div>
              </div>
              <div className="stat-value">{absentCount}</div>
              <div className="stat-desc">Total marked absent</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
            {/* Quick Links */}
            <div className="content-card" style={{ padding: "20px 24px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ paddingBottom: "12px", borderBottom: "1px solid var(--color-border)", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Academic Shortcuts</h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Direct access to your portal resources</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Link
                  to="/student/courses"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid #f1f5f9",
                    textDecoration: "none",
                    color: "var(--color-text-primary)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-primary-light)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "var(--color-primary-light)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>My Courses</div>
                      <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>View your enrolled subjects & syllabus</div>
                    </div>
                  </div>
                  <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>&rarr;</span>
                </Link>

                <Link
                  to="/student/assignments"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid #f1f5f9",
                    textDecoration: "none",
                    color: "var(--color-text-primary)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-primary-light)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Assignments</div>
                      <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>Submit coursework and track deadlines</div>
                    </div>
                  </div>
                  <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>&rarr;</span>
                </Link>

                <Link
                  to="/student/attendance"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid #f1f5f9",
                    textDecoration: "none",
                    color: "var(--color-text-primary)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-primary-light)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Attendance Register</div>
                      <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>Check your course attendance records</div>
                    </div>
                  </div>
                  <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Recent Attendance Activity */}
            <div className="content-card" style={{ padding: "20px 24px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ paddingBottom: "12px", borderBottom: "1px solid var(--color-border)", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Recent Attendance</h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Your latest recorded class sessions</p>
              </div>

              {recentAttendance.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {recentAttendance.map(a => (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        backgroundColor: "#f8fafc",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid #f1f5f9",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                          {formatDate(a.date)}
                        </span>
                      </div>

                      <span
                        className={`badge ${
                          a.status === "PRESENT" ? "badge-success" : a.status === "ABSENT" ? "badge-danger" : "badge-warning"
                        }`}
                        style={{ padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}
                      >
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--color-text-secondary)" }}>
                  No recent attendance activity recorded.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
