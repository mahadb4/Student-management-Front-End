import type { UserRole } from "../types/user";

// Single source of truth for both the Sidebar's active-link highlighting and
// DashboardLayout's navbar title - previously these were two independent
// hand-maintained maps (Sidebar's nav-link list vs DashboardLayout's
// routeTitles) that could and did disagree (e.g. /teacher/profile had a
// sidebar entry but no routeTitles entry, so the navbar silently fell back
// to "Dashboard"). Driving both from this one list makes that class of bug
// impossible: a route missing here is missing from both places at once.
export interface NavItem {
  to: string;
  navLabel: string;
  pageTitle: string;
  icon: string;
  // Index/dashboard routes (e.g. "/teacher") must match exactly - without
  // this, "/teacher/profile" would also prefix-match "/teacher" and both
  // the Dashboard and Profile links would show active simultaneously.
  exact?: boolean;
  // Extra path prefixes that should also count as "this link is active",
  // for nested routes that don't have their own sidebar entry (e.g. a
  // teacher's per-class assignment/roster pages belong under "My Classes").
  extraActivePrefixes?: string[];
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  student: [
    { to: "/student", navLabel: "Dashboard", pageTitle: "Student Dashboard", icon: "📊", exact: true },
    { to: "/student/courses", navLabel: "My Courses", pageTitle: "My Courses", icon: "📚" },
    { to: "/student/attendance", navLabel: "Attendance", pageTitle: "Attendance", icon: "📅" },
    { to: "/student/assignments", navLabel: "Assignments", pageTitle: "Assignments", icon: "📄" },
    { to: "/student/remarks", navLabel: "Remarks", pageTitle: "Remarks", icon: "📝" },
    { to: "/student/ai-assistant", navLabel: "AI Assistant", pageTitle: "AI Assistant", icon: "🤖" },
    { to: "/student/profile", navLabel: "Profile", pageTitle: "Profile", icon: "👤" },
  ],
  teacher: [
    { to: "/teacher", navLabel: "Dashboard", pageTitle: "Teacher Dashboard", icon: "📊", exact: true },
    {
      to: "/teacher/courses",
      navLabel: "My Classes",
      pageTitle: "My Classes",
      icon: "📚",
      // A class's own assignment/roster pages (/teacher/classes/:id/...)
      // don't have their own sidebar entry - they belong under My Classes.
      extraActivePrefixes: ["/teacher/classes"],
    },
    { to: "/teacher/attendance", navLabel: "Attendance", pageTitle: "Attendance", icon: "📅" },
    { to: "/teacher/assignments", navLabel: "Assignments", pageTitle: "Assignments", icon: "📄" },
    { to: "/teacher/profile", navLabel: "Profile", pageTitle: "Profile", icon: "👤" },
  ],
  staff: [
    { to: "/staff", navLabel: "Dashboard", pageTitle: "Staff Dashboard", icon: "📊", exact: true },
  ],
  admin: [
    { to: "/admin", navLabel: "Dashboard", pageTitle: "Admin Dashboard", icon: "📊", exact: true },
    { to: "/admin/students", navLabel: "Students", pageTitle: "Manage Students", icon: "🎓" },
    { to: "/admin/teachers", navLabel: "Teachers", pageTitle: "Manage Teachers", icon: "👨‍🏫" },
    { to: "/admin/departments", navLabel: "Departments", pageTitle: "Manage Departments", icon: "🏢" },
    { to: "/admin/sections", navLabel: "Sections", pageTitle: "Manage Sections", icon: "🏫" },
    { to: "/admin/courses", navLabel: "Courses", pageTitle: "Manage Courses", icon: "📚" },
    { to: "/admin/course-offerings", navLabel: "Offerings", pageTitle: "Course Offerings", icon: "🗓️" },
    { to: "/admin/enrollments", navLabel: "Enrollments", pageTitle: "Enrollments", icon: "📝" },
    { to: "/admin/attendance", navLabel: "Attendance", pageTitle: "Attendance Management", icon: "📅" },
    { to: "/admin/approvals", navLabel: "Approvals", pageTitle: "Pending Approvals", icon: "✅" },
    { to: "/admin/permissions", navLabel: "Permissions", pageTitle: "Role Permissions", icon: "🔐" },
    { to: "/admin/staff", navLabel: "Staff", pageTitle: "Staff Management", icon: "👨‍💼" },
  ],
};

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const prefixes = [item.to, ...(item.extraActivePrefixes || [])];
  return prefixes.some(prefix =>
    item.exact ? pathname === prefix : pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function resolvePageTitle(pathname: string, role: UserRole | undefined): string {
  const items = role ? NAV_ITEMS[role] : undefined;
  const match = items?.find(item => isNavItemActive(item, pathname));
  return match?.pageTitle || "Dashboard";
}
