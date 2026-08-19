import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getCurrentUser } from "../../services/auth";
import { teacherService, offeringService, enrollmentService } from "../../services/entities";
import { Link } from "react-router-dom";
import type { Teacher, CourseOffering } from "../../types/user";

export default function TeacherDashboard() {
  const user = getCurrentUser();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.teacher_id) {
      setLoading(false);
      return;
    }
    
    teacherService.getById(user.teacher_id).then(myTeacher => {
      setTeacher(myTeacher);
      
      Promise.all([
        offeringService.getAll(),
        enrollmentService.getAll()
      ]).then(([o, e]) => {
        const myOfferings = o.filter(x => x.teacher === myTeacher.id);
        setOfferings(myOfferings);
        
        const myOfferingIds = myOfferings.map(x => x.id);
        const myEnrollments = e.filter(x => myOfferingIds.includes(x.course_offering));
        setStudentCount(myEnrollments.length);
      }).finally(() => setLoading(false));
    }).catch(console.error);
  }, [user]);

  return (
    <DashboardLayout title="Teacher Dashboard">
      <div className="page-header">
        <h2>Welcome, {user?.name}</h2>
        <p>Your teaching overview</p>
      </div>

      {loading ? (
        <p>Loading dashboard...</p>
      ) : !teacher ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          <h3>Teacher Record Not Found</h3>
          <p>We could not find a teacher record matching your email ({user?.email}). Please contact administration.</p>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon primary">📚</div>
                <div className="stat-title">Active Classes</div>
              </div>
              <div className="stat-value">{offerings.filter(o => o.is_active).length}</div>
              <div className="stat-desc">Courses you are teaching</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon success">👥</div>
                <div className="stat-title">Total Students</div>
              </div>
              <div className="stat-value">{studentCount}</div>
              <div className="stat-desc">Across all your classes</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon warning">📅</div>
                <div className="stat-title">Attendance</div>
              </div>
              <div className="stat-value">Action Required</div>
              <div className="stat-desc">Mark today's attendance</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
            <div className="content-card">
              <div className="card-header">
                <h3>Quick Links</h3>
              </div>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <Link to="/teacher/courses" className="btn btn-outline" style={{ justifyContent: "flex-start" }}>📚 View My Classes</Link>
                <Link to="/teacher/students" className="btn btn-outline" style={{ justifyContent: "flex-start" }}>👥 View My Students</Link>
                <Link to="/teacher/attendance" className="btn btn-outline" style={{ justifyContent: "flex-start" }}>📅 Mark Attendance</Link>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}