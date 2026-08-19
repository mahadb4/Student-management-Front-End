import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getCurrentUser } from "../../services/auth";
import { studentService, enrollmentService, attendanceService } from "../../services/entities";
import type { Student, Enrollment, Attendance } from "../../types/user";

export default function StudentDashboard() {
  const user = getCurrentUser();
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.student_id) {
      setLoading(false);
      return;
    }
    
    // Fetch the specific student using ID
    studentService.getById(user.student_id).then(myStudent => {
      setStudent(myStudent);
      
      // Fetch enrollments and attendance for this student
      Promise.all([
        enrollmentService.getAll(),
        attendanceService.getAll()
      ]).then(([e, a]) => {
        const myEnrollments = e.filter(x => x.student === myStudent.id);
        setEnrollments(myEnrollments);
        
        const myEnrollmentIds = myEnrollments.map(x => x.id);
        const myAttendance = a.filter(x => myEnrollmentIds.includes(x.enrollment));
        setAttendance(myAttendance);
      }).finally(() => setLoading(false));
      
    }).catch(console.error);
  }, [user]);

  const presentCount = attendance.filter(a => a.status === "PRESENT").length;
  const absentCount = attendance.filter(a => a.status === "ABSENT").length;
  // const lateCount = attendance.filter(a => a.status === "LATE").length;

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="page-header">
        <h2>Welcome, {user?.name}</h2>
        <p>Your academic overview</p>
      </div>

      {loading ? (
        <p>Loading dashboard...</p>
      ) : !student ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          <h3>Student Record Not Found</h3>
          <p>We could not find a student record matching your email ({user?.email}). Please contact administration.</p>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon primary">📚</div>
                <div className="stat-title">Active Enrollments</div>
              </div>
              <div className="stat-value">{enrollments.filter(e => e.status === "ACTIVE").length}</div>
              <div className="stat-desc">Courses you are taking</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon success">✅</div>
                <div className="stat-title">Classes Attended</div>
              </div>
              <div className="stat-value">{presentCount}</div>
              <div className="stat-desc">Total marked present</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon warning">⚠️</div>
                <div className="stat-title">Absences</div>
              </div>
              <div className="stat-value">{absentCount}</div>
              <div className="stat-desc">Total marked absent</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
            <div className="content-card">
              <div className="card-header">
                <h3>Quick Links</h3>
              </div>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <Link to="/student/courses" className="btn btn-outline" style={{ justifyContent: "flex-start" }}>📚 View My Courses</Link>
                <Link to="/student/attendance" className="btn btn-outline" style={{ justifyContent: "flex-start" }}>📅 Check Attendance</Link>
                <Link to="/student/profile" className="btn btn-outline" style={{ justifyContent: "flex-start" }}>👤 View Profile</Link>
              </div>
            </div>
            
            <div className="content-card">
              <div className="card-header">
                <h3>Recent Activity</h3>
              </div>
              <div style={{ padding: "24px" }}>
                {attendance.length > 0 ? (
                  <ul style={{ paddingLeft: "20px", color: "var(--color-text-secondary)" }}>
                    {attendance.slice(-3).map(a => (
                      <li key={a.id} style={{ marginBottom: "8px" }}>
                        Marked <strong>{a.status}</strong> on {a.date}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: "var(--color-text-secondary)" }}>No recent activity.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}