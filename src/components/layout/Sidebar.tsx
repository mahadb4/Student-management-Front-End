import { Link, useLocation } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";
import { NAV_ITEMS, isNavItemActive } from "../../config/navigation";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const path = location.pathname;
  const { role } = usePermissions();

  const links = NAV_ITEMS[role || "admin"];

  return (
    <aside className={`dashboard-sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-logo-group">
          <span className="brand-icon">🏛️</span>
          {!collapsed && <span className="brand-text">EduPortal</span>}
        </div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <div className="sidebar-nav">
        {!collapsed && <p className="nav-heading">Main Menu</p>}
        <ul className="nav-list">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`nav-link ${isNavItemActive(link, path) ? "active" : ""}`}
                title={collapsed ? link.navLabel : undefined}
              >
                <span className="nav-icon">{link.icon}</span>
                {!collapsed && <span className="nav-label">{link.navLabel}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

