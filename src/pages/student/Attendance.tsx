import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getCurrentUser } from "../../services/auth";
import { studentService, enrollmentService, attendanceService, offeringService, courseService } from "../../services/entities";
import type { Student, Enrollment, Attendance, CourseOffering, Course } from "../../types/user";

export default function StudentAttendance() {
  const user = getCurrentUser();
  const [student, setStudent] = useState<Student | null>(null);
  
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState<string>("all");

  useEffect(() => {
    if (!user || !user.student_id) {
      setLoading(false);
      return;
    }
    
    studentService.getById(user.student_id).then(myStudent => {
      setStudent(myStudent);
      
      Promise.all([
        enrollmentService.getAll(),
        attendanceService.getAll(),
        offeringService.getAll(),
        courseService.getAll()
      ]).then(([e, a, o, c]) => {
        const myEnrollments = e.filter(x => x.student === myStudent.id);
        setEnrollments(myEnrollments);
        
        const myEnrollmentIds = myEnrollments.map(x => x.id);
        setAttendance(a.filter(x => myEnrollmentIds.includes(x.enrollment)));
        
        setOfferings(o);
        setCourses(c);
      }).finally(() => setLoading(false));
    }).catch(console.error);
  }, [user]);

  const getCourseInfo = (enrollmentId: number) => {
    const e = enrollments.find(x => x.id === enrollmentId);
    if (!e) return "Unknown";
    
    const o = offerings.find(x => x.id === e.course_offering);
    if (!o) return "Unknown";
    
    const c = courses.find(x => x.id === o.course);
    return c ? `${c.name} (${c.code})` : "Unknown Course";
  };

  const filteredAttendance = courseFilter === "all" 
    ? attendance 
    : attendance.filter(a => a.enrollment.toString() === courseFilter);

  // Sort by date descending
  filteredAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return <DashboardLayout title="My Attendance"><div style={{ padding: "40px", textAlign: "center" }}>Loading attendance...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="My Attendance">
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
                      <td>{getCourseInfo(a.enrollment)}</td>
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
    </DashboardLayout>
  );
}
