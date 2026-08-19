import { Link, useLocation } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";

export default function Sidebar() {
  const location = useLocation();
  const path = location.pathname;
  const { role } = usePermissions();

  const getLinks = () => {
    switch(role) {
      case "student":
        return [
          { to: "/student", label: "Dashboard", icon: "📊" },
          { to: "/student/courses", label: "My Courses", icon: "📚" },
          { to: "/student/attendance", label: "Attendance", icon: "📅" },
          { to: "/student/profile", label: "Profile", icon: "👤" },
        ];
      case "teacher":
        return [
          { to: "/teacher", label: "Dashboard", icon: "📊" },
          { to: "/teacher/courses", label: "My Classes", icon: "📚" },
          { to: "/teacher/students", label: "Students", icon: "👥" },
          { to: "/teacher/attendance", label: "Attendance", icon: "📅" },
        ];
      case "staff":
        return [
          { to: "/staff", label: "Dashboard", icon: "📊" },
        ];
      case "admin":
      default:
        return [
          { to: "/admin", label: "Dashboard", icon: "📊" },
          { to: "/admin/students", label: "Students", icon: "🎓" },
          { to: "/admin/teachers", label: "Teachers", icon: "👨‍🏫" },
          { to: "/admin/departments", label: "Departments", icon: "🏢" },
          { to: "/admin/courses", label: "Courses", icon: "📚" },
          { to: "/admin/course-offerings", label: "Offerings", icon: "🗓️" },
          { to: "/admin/enrollments", label: "Enrollments", icon: "📝" },
          { to: "/admin/attendance", label: "Attendance", icon: "📅" },
          { to: "/admin/approvals", label: "Approvals", icon: "✅" },
          { to: "/admin/permissions", label: "Permissions", icon: "🔐" },
          { to: "/admin/staff", label: "Staff", icon: "👨‍💼" },
        ];
    }
  };

  const links = getLinks();

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">🏛️</span>
        <span className="brand-text">EduPortal</span>
      </div>
      
      <div className="sidebar-nav">
        <p className="nav-heading">Main Menu</p>
        <ul className="nav-list">
          {links.map((link) => (
            <li key={link.to}>
              <Link 
                to={link.to} 
                className={`nav-link ${path === link.to || (path !== '/' && path !== '/admin' && link.to !== '/admin' && path.startsWith(link.to)) ? "active" : ""}`}
              >
                <span className="nav-icon">{link.icon}</span>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
