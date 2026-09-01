import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyCourseOfferings } from "../../services/entities";
import type { CourseOfferingTeacherListItem } from "../../types/user";

export default function TeacherCourses() {
  const user = getCurrentUser();

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
        <h2>My Classes</h2>
        <p>Courses you are currently teaching</p>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Teacher record not found.
        </div>
      ) : (
        <div className="dashboard-grid">
          {offerings.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)", gridColumn: "1 / -1" }}>You are not assigned to teach any classes.</p>
          ) : (
            offerings.map(offering => (
              <div key={offering.id} className="stat-card" style={{ position: "relative" }}>
                <div style={{ position: "absolute", top: "20px", right: "20px" }}>
                  <span className={`badge ${offering.is_active ? 'badge-success' : 'badge-warning'}`}>
                    {offering.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 style={{ margin: "0 0 8px 0" }}>{offering.course_name || "Unknown Course"}</h3>
                <p style={{ margin: "0 0 16px 0", color: "var(--color-primary)", fontWeight: 600 }}>{offering.course_code || "---"}</p>

                <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div><strong>Semester:</strong> {offering.semester} {offering.academic_year}</div>
                  <div><strong>Section:</strong> {offering.section_name || "No Section"}</div>
                  <div><strong>Enrolled Students:</strong> {offering.enrolled_students_count}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
