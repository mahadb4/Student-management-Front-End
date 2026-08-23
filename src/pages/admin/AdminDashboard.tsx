import { useEffect, useState } from "react";
import { dashboardService } from "../../services/entities";
import type { AdminSummary } from "../../services/entities";
import { Link } from "react-router-dom";

function AdminDashboard() {
  const [stats, setStats] = useState<AdminSummary>({
    total_students: 0,
    total_teachers: 0,
    total_departments: 0,
    total_courses: 0,
    total_course_offerings: 0,
    total_enrollments: 0
  });

  useEffect(() => {
    const controller = new AbortController();
    
    dashboardService.getAdminSummary(controller.signal)
      .then(setStats)
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error(err);
      });
      
    return () => controller.abort();
  }, []);

  return (
    <>
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
          <div className="stat-value">{stats.total_students}</div>
          <div className="stat-desc">Registered in system</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon success">👨‍🏫</div>
            <div className="stat-title">Total Teachers</div>
          </div>
          <div className="stat-value">{stats.total_teachers}</div>
          <div className="stat-desc">Active faculty members</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon warning">🏢</div>
            <div className="stat-title">Departments</div>
          </div>
          <div className="stat-value">{stats.total_departments}</div>
          <div className="stat-desc">Academic faculties</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon primary">📚</div>
            <div className="stat-title">Courses</div>
          </div>
          <div className="stat-value">{stats.total_courses}</div>
          <div className="stat-desc">Curriculum courses</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon success">🗓️</div>
            <div className="stat-title">Course Offerings</div>
          </div>
          <div className="stat-value">{stats.total_course_offerings}</div>
          <div className="stat-desc">Active in current semester</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon warning">📝</div>
            <div className="stat-title">Total Enrollments</div>
          </div>
          <div className="stat-value">{stats.total_enrollments}</div>
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
    </>
  );
}

export default AdminDashboard;