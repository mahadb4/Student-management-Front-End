import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import PendingApproval from "./pages/auth/PendingApproval";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import Students from "./pages/admin/Students";
import Teachers from "./pages/admin/Teachers";
import Departments from "./pages/admin/Departments";
import AdminCourses from "./pages/admin/Courses";
import CourseOfferings from "./pages/admin/CourseOfferings";
import Enrollments from "./pages/admin/Enrollments";
import AdminAttendance from "./pages/admin/AttendanceMgmt";
import Staff from "./pages/admin/Staff";
import PendingApprovals from "./pages/admin/PendingApprovals";
import Permissions from "./pages/admin/Permissions";

// Student
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentCourses from "./pages/student/Courses";
import StudentAttendance from "./pages/student/Attendance";
import StudentProfile from "./pages/student/Profile";

// Teacher
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherCourses from "./pages/teacher/Courses";
import TeacherStudents from "./pages/teacher/Students";
import TeacherAttendance from "./pages/teacher/Attendance";

// Staff
import StaffDashboard from "./pages/staff/StaffDashboard";

import { getCurrentUser, isAuthenticated } from "./services/auth";
import type { UserRole } from "./types/user";

// ── Route guard ──────────────────────────────────────────────────────────────
function ProtectedRoute({
  children,
  allowedRole,
}: {
  children: React.ReactNode;
  allowedRole: UserRole;
}) {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== allowedRole) {
    const dashboardMap: Record<UserRole, string> = {
      admin: "/admin",
      student: "/student",
      teacher: "/teacher",
      staff: "/staff",
    };
    return <Navigate to={dashboardMap[user.role]} replace />;
  }

  return <>{children}</>;
}
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pending-approval" element={<PendingApproval />} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/students" element={<ProtectedRoute allowedRole="admin"><Students /></ProtectedRoute>} />
        <Route path="/admin/teachers" element={<ProtectedRoute allowedRole="admin"><Teachers /></ProtectedRoute>} />
        <Route path="/admin/departments" element={<ProtectedRoute allowedRole="admin"><Departments /></ProtectedRoute>} />
        <Route path="/admin/courses" element={<ProtectedRoute allowedRole="admin"><AdminCourses /></ProtectedRoute>} />
        <Route path="/admin/course-offerings" element={<ProtectedRoute allowedRole="admin"><CourseOfferings /></ProtectedRoute>} />
        <Route path="/admin/enrollments" element={<ProtectedRoute allowedRole="admin"><Enrollments /></ProtectedRoute>} />
        <Route path="/admin/attendance" element={<ProtectedRoute allowedRole="admin"><AdminAttendance /></ProtectedRoute>} />
        <Route path="/admin/staff" element={<ProtectedRoute allowedRole="admin"><Staff /></ProtectedRoute>} />
        <Route path="/admin/approvals" element={<ProtectedRoute allowedRole="admin"><PendingApprovals /></ProtectedRoute>} />
        <Route path="/admin/permissions" element={<ProtectedRoute allowedRole="admin"><Permissions /></ProtectedRoute>} />

        {/* Student routes */}
        <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/courses" element={<ProtectedRoute allowedRole="student"><StudentCourses /></ProtectedRoute>} />
        <Route path="/student/attendance" element={<ProtectedRoute allowedRole="student"><StudentAttendance /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute allowedRole="student"><StudentProfile /></ProtectedRoute>} />

        {/* Teacher routes */}
        <Route path="/teacher" element={<ProtectedRoute allowedRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/teacher/courses" element={<ProtectedRoute allowedRole="teacher"><TeacherCourses /></ProtectedRoute>} />
        <Route path="/teacher/students" element={<ProtectedRoute allowedRole="teacher"><TeacherStudents /></ProtectedRoute>} />
        <Route path="/teacher/attendance" element={<ProtectedRoute allowedRole="teacher"><TeacherAttendance /></ProtectedRoute>} />

        {/* Staff routes */}
        <Route path="/staff" element={<ProtectedRoute allowedRole="staff"><StaffDashboard /></ProtectedRoute>} />

        {/* Catch-all → Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;