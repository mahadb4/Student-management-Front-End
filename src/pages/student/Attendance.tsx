import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyStudentProfile, getMyEnrollments, getMyStudentAttendance } from "../../services/entities";
import type { Student, EnrollmentListItem, AttendanceListItem } from "../../types/user";

export default function StudentAttendance() {
  const user = getCurrentUser();
  const [student, setStudent] = useState<Student | null>(null);

  const [enrollments, setEnrollments] = useState<EnrollmentListItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceListItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getMyStudentProfile().then(myStudent => {
      setStudent(myStudent);

      Promise.all([
        getMyEnrollments(1, 500),
        getMyStudentAttendance(1, 500),
      ]).then(([e, a]) => {
        setEnrollments(e.results);
        setAttendance(a.results);
      }).finally(() => setLoading(false));
    }).catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCourseInfo = (enrollmentId: number) => {
    const e = enrollments.find(x => x.id === enrollmentId);
    return e ? `${e.course_offering.course.name} (${e.course_offering.course.code})` : "Unknown Course";
  };

  const filteredAttendance = courseFilter === "all"
    ? attendance
    : attendance.filter(a => a.enrollment?.id.toString() === courseFilter);

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

      {!student ? (
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
                      <td>{a.enrollment ? `${a.enrollment.course.code}` : "Unknown"}</td>
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
        </>
      )}
    </>
  );
}
