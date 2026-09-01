import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyTeacherStudents, getCourseOfferingReference } from "../../services/entities";
import type { EnrollmentTeacherListItem, CourseOfferingReference } from "../../types/user";

export default function TeacherStudents() {
  const user = getCurrentUser();

  const [offerings, setOfferings] = useState<CourseOfferingReference[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentTeacherListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState("all");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getCourseOfferingReference(1, 10)
      .then(o => setOfferings(o.results))
      .catch(() => setNotFound(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch scoped to the selected class whenever the filter changes - a
  // class's own roster, or the teacher's full cross-class list on "All
  // Classes", each loaded page by page rather than assumed to fit on page 1.
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const courseOfferingId = courseFilter === "all" ? undefined : Number(courseFilter);

    getMyTeacherStudents(1, 10, courseOfferingId).then(e => {
      setEnrollments(e.results);
      setPage(e.current_page);
      setTotalPages(e.total_pages);
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseFilter]);

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const courseOfferingId = courseFilter === "all" ? undefined : Number(courseFilter);

    getMyTeacherStudents(nextPage, 10, courseOfferingId).then(e => {
      setEnrollments(prev => [...prev, ...e.results]);
      setPage(e.current_page);
      setTotalPages(e.total_pages);
    }).finally(() => setLoadingMore(false));
  };

  const getCourseLabel = (offering: CourseOfferingReference) =>
    `${offering.course_name || "Unknown Course"} (${offering.course_code || "---"}) - ${offering.section_name || "No Section"}`;

  if (loading && enrollments.length === 0) {
    return <><div style={{ padding: "40px", textAlign: "center" }}>Loading students...</div></>;
  }

  return (
    <>
      <div className="page-header">
        <h2>My Students</h2>
        <p>Students enrolled in your classes</p>
      </div>

      {notFound ? (
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
                {enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "24px" }}>No students found for this selection.</td>
                  </tr>
                ) : (
                  enrollments.map(e => (
                    <tr key={e.enrollment_id}>
                      <td><strong>{e.student_name}</strong></td>
                      <td>{e.student_email}</td>
                      <td>{e.course_name} ({e.course_code}) - {e.section_name || "No Section"}</td>
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

          {page < totalPages && (
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
