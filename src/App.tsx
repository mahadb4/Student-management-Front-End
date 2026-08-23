import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import PendingApproval from "./pages/auth/PendingApproval";
import Onboarding from "./pages/auth/Onboarding";

// Layout
import DashboardLayout from "./components/layout/DashboardLayout";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import Students from "./pages/admin/Students";
import Teachers from "./pages/admin/Teachers";
import Departments from "./pages/admin/Departments";
import Sections from "./pages/admin/Sections";
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
// Roles whose account isn't usable until they've completed their own
// Student/Teacher profile via /onboarding. admin/staff have no profile
// entity, so they're never gated here.
const ROLE_NEEDS_PROFILE: Partial<Record<UserRole, boolean>> = {
  student: true,
  teacher: true,
};

function hasCompletedOnboarding(user: ReturnType<typeof getCurrentUser>): boolean {
  if (!user) return false;
  if (user.role === "student") return !!user.student_id;
  if (user.role === "teacher") return !!user.teacher_id;
  return true;
}

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

  if (ROLE_NEEDS_PROFILE[user.role] && !hasCompletedOnboarding(user)) {
    return <Navigate to="/onboarding" replace />;
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
        <Route path="/onboarding" element={<Onboarding />} />

        {/* ── Admin routes (nested under shared DashboardLayout) ────────── */}
        <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="departments" element={<Departments />} />
          <Route path="sections" element={<Sections />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="course-offerings" element={<CourseOfferings />} />
          <Route path="enrollments" element={<Enrollments />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="staff" element={<Staff />} />
          <Route path="approvals" element={<PendingApprovals />} />
          <Route path="permissions" element={<Permissions />} />
        </Route>

        {/* ── Student routes (nested under shared DashboardLayout) ──────── */}
        <Route path="/student" element={<ProtectedRoute allowedRole="student"><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        {/* ── Teacher routes (nested under shared DashboardLayout) ──────── */}
        <Route path="/teacher" element={<ProtectedRoute allowedRole="teacher"><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<TeacherDashboard />} />
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="attendance" element={<TeacherAttendance />} />
        </Route>

        {/* ── Staff routes (nested under shared DashboardLayout) ────────── */}
        <Route path="/staff" element={<ProtectedRoute allowedRole="staff"><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<StaffDashboard />} />
        </Route>

        {/* Catch-all → Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;