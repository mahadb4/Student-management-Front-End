import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";
import { getMyTeacherDashboard, getMyCourseOfferings } from "../../services/entities";
import type { TeacherDashboardSummary, CourseOfferingTeacherListItem } from "../../types/user";

export default function TeacherDashboard() {
  const user = getCurrentUser();
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [classes, setClasses] = useState<CourseOfferingTeacherListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    Promise.all([
      getMyTeacherDashboard().catch(() => null),
      getMyCourseOfferings(1, 20).then(res => res.results).catch(() => [])
    ])
      .then(([dashSummary, courseList]) => {
        setSummary(dashSummary);
        setClasses(courseList);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2>Welcome, {user?.name}</h2>
          <p>Your faculty teaching overview</p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link to="/teacher/attendance" className="btn btn-primary" style={{ textDecoration: "none", gap: "6px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Mark Attendance
          </Link>
          <Link to="/teacher/students" className="btn btn-secondary" style={{ textDecoration: "none", gap: "6px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            View Students
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center" }}>Loading dashboard...</div>
      ) : !summary ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          <h3>Teacher Record Not Found</h3>
          <p>We could not find a teacher record matching your email ({user?.email}). Please contact administration.</p>
        </div>
      ) : (
        <>
          {/* Top KPI Metrics Row */}
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
                <div className="stat-icon warning">🏫</div>
                <div className="stat-title">Assigned Sections</div>
              </div>
              <div className="stat-value">{classes.length || summary.active_classes}</div>
              <div className="stat-desc">Active class sections</div>
            </div>
          </div>

          {/* Classes Table Card */}
          <div className="content-card" style={{ marginTop: "24px" }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0 }}>My Classes</h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                  Assigned courses and class rosters for this academic term
                </p>
              </div>
              <span className="badge" style={{ backgroundColor: "var(--color-primary-light)", color: "var(--color-primary)", fontWeight: 700, padding: "4px 10px", fontSize: "0.75rem" }}>
                {classes.length} {classes.length === 1 ? "Class" : "Classes"}
              </span>
            </div>

            <div className="table-responsive">
              <table className="data-table table-compact" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Code</th>
                    <th>Section</th>
                    <th>Students</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "36px 20px", color: "var(--color-text-secondary)" }}>
                        No courses currently assigned to your faculty profile.
                      </td>
                    </tr>
                  ) : (
                    classes.map(c => (
                      <tr key={c.id}>
                        <td>
                          <span style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.88rem" }}>
                            {c.course_name || "Untitled Course"}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            padding: "3px 8px",
                            backgroundColor: "var(--color-primary-light)",
                            color: "var(--color-primary)",
                            borderRadius: "var(--radius-sm)",
                            fontWeight: 700,
                            fontSize: "0.76rem"
                          }}>
                            {c.course_code || "N/A"}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: "var(--color-text-secondary)", fontSize: "0.84rem" }}>
                            {c.section_name ? `Section ${c.section_name}` : "General"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.84rem" }}>
                            {c.enrolled_students_count} {c.enrolled_students_count === 1 ? "student" : "students"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`badge ${c.is_active ? 'badge-success' : 'badge-warning'}`} style={{ padding: "3px 8px", fontSize: "0.72rem" }}>
                            {c.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <Link
                              to={`/teacher/classes/${c.id}/assignments`}
                              className="btn btn-sm btn-subtle-primary"
                              style={{ textDecoration: "none", fontSize: "0.78rem", padding: "4px 10px", fontWeight: 600 }}
                            >
                              Assignments
                            </Link>
                            <Link
                              to="/teacher/attendance"
                              className="btn btn-sm btn-secondary"
                              style={{ textDecoration: "none", fontSize: "0.78rem", padding: "4px 10px", fontWeight: 500 }}
                            >
                              Attendance
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
