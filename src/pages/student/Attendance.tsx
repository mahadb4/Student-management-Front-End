import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyEnrollmentsReference, getMyStudentAttendance } from "../../services/entities";
import type { EnrollmentReference, StudentAttendanceListItem } from "../../types/user";

export default function StudentAttendance() {
  const user = getCurrentUser();

  const [enrollments, setEnrollments] = useState<EnrollmentReference[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendanceListItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [courseFilter, setCourseFilter] = useState<string>("all");

  // Attendance history grows without bound over a student's enrollment, so
  // unlike the (small, bounded) enrollments list it's fetched page by page
  // at the project-standard page_size=10 instead of in one large request.
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceTotalPages, setAttendanceTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    Promise.all([
      getMyEnrollmentsReference(1, 10),
      getMyStudentAttendance(1, 10),
    ]).then(([e, a]) => {
      setEnrollments(e.results);
      setAttendance(a.results);
      setAttendancePage(a.current_page);
      setAttendanceTotalPages(a.total_pages);
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMoreAttendance = () => {
    if (loadingMore || attendancePage >= attendanceTotalPages) return;
    setLoadingMore(true);
    const nextPage = attendancePage + 1;

    getMyStudentAttendance(nextPage, 10).then(a => {
      setAttendance(prev => [...prev, ...a.results]);
      setAttendancePage(a.current_page);
      setAttendanceTotalPages(a.total_pages);
    }).finally(() => setLoadingMore(false));
  };

  const getCourseInfo = (enrollmentId: number) => {
    const e = enrollments.find(x => x.id === enrollmentId);
    return e ? `${e.course_name} (${e.course_code})` : "Unknown Course";
  };

  const filteredAttendance = courseFilter === "all"
    ? attendance
    : attendance.filter(a => a.enrollment_id?.toString() === courseFilter);

  // Sort by date descending
  filteredAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return <><div style={{ padding: "40px", textAlign: "center" }}>Loading attendance...</div></>;
  }

  return (
    <>
      <div className="page-header">
        <h2>Attendance Records</h2>
        <p>Track your presence across all enrolled courses</p>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Student record not found.
        </div>
      ) : (
        <>
          <div className="content-card" style={{ marginBottom: "24px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <label style={{ fontWeight: 500 }}>Filter by Course:</label>
              <select className="form-control" value={courseFilter} onChange={e => setCourseFilter(e.target.value)} style={{ maxWidth: "300px" }}>
                <option value="all">All Enrolled Courses</option>
                {enrollments.map(e => (
                  <option key={e.id} value={e.id}>{getCourseInfo(e.id)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-responsive content-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "24px" }}>No attendance records found.</td>
                  </tr>
                ) : (
                  filteredAttendance.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.date}</strong></td>
                      <td>{a.enrollment_id ? a.course_code : "Unknown"}</td>
                      <td>
                        <span className={`badge ${
                          a.status === 'PRESENT' ? 'badge-success' :
                          a.status === 'ABSENT' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td>{a.remarks || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {courseFilter === "all" && attendancePage < attendanceTotalPages && (
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button className="btn btn-outline" onClick={loadMoreAttendance} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
