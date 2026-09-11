import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";
import { getMyCourseOfferings } from "../../services/entities";
import type { CourseOfferingTeacherListItem } from "../../types/user";

// Reused as-is for two sidebar entries - "My Classes" (/teacher/courses) and
// "Assignments" (/teacher/assignments) - rather than duplicating the class
// grid + data-fetching in a second page. Both routes render the exact same
// class-selection grid (each card's own "Assignments" button already leads
// into /teacher/classes/:id/assignments); only the heading copy differs by
// entry point.
export default function TeacherCourses() {
  const user = getCurrentUser();
  const isAssignmentsEntry = useLocation().pathname === "/teacher/assignments";

  const [offerings, setOfferings] = useState<CourseOfferingTeacherListItem[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getMyCourseOfferings(1, 10)
      .then(o => setOfferings(o.results))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <><div style={{ padding: "40px", textAlign: "center" }}>Loading classes...</div></>;
  }

  return (
    <>
      <div className="page-header">
        <h2>{isAssignmentsEntry ? "Assignments" : "My Classes"}</h2>
        <p>{isAssignmentsEntry ? "Select a class to manage its assignments" : "Courses you are currently teaching"}</p>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Teacher record not found.
        </div>
      ) : (
        <div className="teacher-classes-grid">
          {offerings.length === 0 ? (
            <div className="content-card" style={{ padding: "40px", textAlign: "center", gridColumn: "1 / -1" }}>
              <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>You are not assigned to teach any classes.</p>
            </div>
          ) : (
            offerings.map(offering => (
              <div key={offering.id} className="teacher-class-card">
                <div className="teacher-class-header">
                  <div className="teacher-class-title-group">
                    <h3 className="teacher-class-title">{offering.course_name || "Unknown Course"}</h3>
                    <div className="teacher-class-code-tag">
                      {offering.course_code || "---"}
                    </div>
                  </div>
                  <span className={`badge ${offering.is_active ? 'badge-success' : 'badge-warning'}`}>
                    {offering.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="teacher-class-details">
                  <div className="teacher-class-detail-item">
                    <span className="teacher-class-detail-label">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Semester
                    </span>
                    <span className="teacher-class-detail-val">{offering.semester} {offering.academic_year}</span>
                  </div>
                  <div className="teacher-class-detail-item">
                    <span className="teacher-class-detail-label">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      Section
                    </span>
                    <span className="teacher-class-detail-val">{offering.section_name || "No Section"}</span>
                  </div>
                </div>

                <div className="teacher-class-footer">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-primary-light)",
                      color: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1 }}>Enrolled</div>
                      <div style={{ fontWeight: 700, color: "var(--color-text-primary)", fontSize: "0.95rem" }}>
                        {offering.enrolled_students_count} {offering.enrolled_students_count === 1 ? 'Student' : 'Students'}
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/teacher/classes/${offering.id}/assignments`}
                    className="btn btn-primary"
                    style={{ fontWeight: 600, padding: "9px 18px", boxShadow: "0 2px 6px rgba(30, 58, 138, 0.25)" }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Assignments
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
