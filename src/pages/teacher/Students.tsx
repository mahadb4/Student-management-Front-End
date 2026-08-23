import { useEffect, useState, useMemo } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyTeacherProfile, getMyCourseOfferings, getEnrollmentList } from "../../services/entities";
import type { Teacher, CourseOfferingListItem, EnrollmentListItem } from "../../types/user";

export default function TeacherStudents() {
  const user = getCurrentUser();
  const [teacher, setTeacher] = useState<Teacher | null>(null);

  const [offerings, setOfferings] = useState<CourseOfferingListItem[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentListItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState("all");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getMyTeacherProfile().then(myTeacher => {
      setTeacher(myTeacher);

      // enrollments/ is already server-scoped to this teacher's own offerings,
      // and its DTO already nests the student + course + section info this
      // page needs - no separate students/courses/sections fetch required.
      Promise.all([
        getMyCourseOfferings(1, 500),
        getEnrollmentList(1, 500),
      ]).then(([o, e]) => {
        setOfferings(o.results);
        setEnrollments(e.results);
      }).finally(() => setLoading(false));
    }).catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEnrollments = useMemo(() => {
    return courseFilter === "all"
      ? enrollments
      : enrollments.filter(e => e.course_offering.id.toString() === courseFilter);
  }, [enrollments, courseFilter]);

  const getCourseLabel = (offering: CourseOfferingListItem) =>
    `${offering.course?.name || "Unknown Course"} (${offering.course?.code || "---"}) - ${offering.section?.name || "No Section"}`;

  if (loading) {
    return <><div style={{ padding: "40px", textAlign: "center" }}>Loading students...</div></>;
  }

  return (
    <>
      <div className="page-header">
        <h2>My Students</h2>
        <p>Students enrolled in your classes</p>
      </div>

      {!teacher ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Teacher record not found.
        </div>
      ) : (
        <>
          <div className="content-card" style={{ marginBottom: "24px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <label style={{ fontWeight: 500 }}>Filter by Class:</label>
              <select className="form-control" value={courseFilter} onChange={e => setCourseFilter(e.target.value)} style={{ maxWidth: "300px" }}>
                <option value="all">All Classes</option>
                {offerings.map(o => (
                  <option key={o.id} value={o.id}>{getCourseLabel(o)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-responsive content-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Class</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "24px" }}>No students found for this selection.</td>
                  </tr>
                ) : (
                  filteredEnrollments.map(e => (
                    <tr key={e.id}>
                      <td><strong>{e.student.first_name} {e.student.last_name}</strong></td>
                      <td>{e.student.student_email}</td>
                      <td>{e.course_offering.course.name} ({e.course_offering.course.code}) - {e.course_offering.section?.name || "No Section"}</td>
                      <td>
                        <span className={`badge ${
                          e.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'
                        }`}>
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
