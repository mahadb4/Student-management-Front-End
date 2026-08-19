import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { 
  getStudents, getTeachers, getDepartments, getCourses, 
  offeringService, enrollmentService 
} from "../../services/entities";
import { Link } from "react-router-dom";

function AdminDashboard() {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    departments: 0,
    courses: 0,
    offerings: 0,
    enrollments: 0
  });

  useEffect(() => {
    Promise.all([
      getStudents(),
      getTeachers(),
      getDepartments(),
      getCourses(),
      offeringService.getAll(),
      enrollmentService.getAll()
    ]).then(([s, t, d, c, o, e]) => {
      setStats({
        students: s.length,
        teachers: t.length,
        departments: d.length,
        courses: c.length,
        offerings: o.length,
        enrollments: e.length
      });
    }).catch(console.error);
  }, []);

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="page-header">
        <h2>Overview</h2>
        <p>System-wide metrics and status</p>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon primary">👨‍🎓</div>
            <div className="stat-title">Total Students</div>
          </div>
          <div className="stat-value">{stats.students}</div>
          <div className="stat-desc">Registered in system</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon success">👨‍🏫</div>
            <div className="stat-title">Total Teachers</div>
          </div>
          <div className="stat-value">{stats.teachers}</div>
          <div className="stat-desc">Active faculty members</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon warning">🏢</div>
            <div className="stat-title">Departments</div>
          </div>
          <div className="stat-value">{stats.departments}</div>
          <div className="stat-desc">Academic faculties</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon primary">📚</div>
            <div className="stat-title">Courses</div>
          </div>
          <div className="stat-value">{stats.courses}</div>
          <div className="stat-desc">Curriculum courses</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon success">🗓️</div>
            <div className="stat-title">Course Offerings</div>
          </div>
          <div className="stat-value">{stats.offerings}</div>
          <div className="stat-desc">Active in current semester</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon warning">📝</div>
            <div className="stat-title">Total Enrollments</div>
          </div>
          <div className="stat-value">{stats.enrollments}</div>
          <div className="stat-desc">Active student enrollments</div>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header">
          <h3>Quick Actions</h3>
        </div>
        <div style={{ padding: "24px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <Link to="/admin/approvals" className="btn btn-outline">Review Pending Approvals</Link>
          <Link to="/admin/students" className="btn btn-outline">Manage Students</Link>
          <Link to="/admin/teachers" className="btn btn-outline">Manage Teachers</Link>
          <Link to="/admin/course-offerings" className="btn btn-outline">Manage Offerings</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;