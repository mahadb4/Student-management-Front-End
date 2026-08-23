import { useEffect } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet, useLocation } from "react-router-dom";
import { scheduleTokenRefresh, clearScheduledTokenRefresh } from "../../services/tokenScheduler";
import "../../pages/styles/Dashboard.css";

// Map route paths to navbar titles
const routeTitles: Record<string, string> = {
  "/admin": "Admin Dashboard",
  "/admin/students": "Manage Students",
  "/admin/teachers": "Manage Teachers",
  "/admin/departments": "Manage Departments",
  "/admin/courses": "Manage Courses",
  "/admin/course-offerings": "Course Offerings",
  "/admin/enrollments": "Enrollments",
  "/admin/attendance": "Attendance Management",
  "/admin/staff": "Staff Management",
  "/admin/approvals": "Pending Approvals",
  "/admin/permissions": "Role Permissions",
  "/student": "Student Dashboard",
  "/student/courses": "My Courses",
  "/student/attendance": "My Attendance",
  "/student/profile": "My Profile",
  "/teacher": "Teacher Dashboard",
  "/teacher/courses": "My Classes",
  "/teacher/students": "My Students",
  "/teacher/attendance": "Class Attendance",
  "/staff": "Staff Dashboard",
};

export default function DashboardLayout() {
  const location = useLocation();
  const title = routeTitles[location.pathname] || "Dashboard";

  // DashboardLayout is mounted for the full lifetime of any authenticated
  // session (all admin/student/teacher/staff routes share it), so it's the
  // natural place to start/stop the proactive token-refresh timer.
  useEffect(() => {
    scheduleTokenRefresh();
    return () => clearScheduledTokenRefresh();
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <Navbar title={title} />
        <main className="dashboard-content-wrapper">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
