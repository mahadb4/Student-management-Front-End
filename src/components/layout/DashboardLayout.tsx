import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet, useLocation } from "react-router-dom";
import { scheduleTokenRefresh, clearScheduledTokenRefresh } from "../../services/tokenScheduler";
import FloatingAiAssistant from "../ai/FloatingAiAssistant";
import { getCurrentUser } from "../../services/auth";
import { ProfilePictureProvider } from "../../context/ProfilePictureContext";
import { resolvePageTitle } from "../../config/navigation";
import "../../pages/styles/Dashboard.css";

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";

export default function DashboardLayout() {
  const location = useLocation();
  const user = getCurrentUser();
  const title = resolvePageTitle(location.pathname, user?.role);
  const isStudent = user?.role === "student";
  const isFullAiPage = location.pathname === "/student/ai-assistant";

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // localStorage unavailable (private browsing, etc.) - preference just won't persist
      }
      return next;
    });
  };

  // DashboardLayout is mounted for the full lifetime of any authenticated
  // session (all admin/student/teacher/staff routes share it), so it's the
  // natural place to start/stop the proactive token-refresh timer.
  useEffect(() => {
    scheduleTokenRefresh();
    return () => clearScheduledTokenRefresh();
  }, []);

  return (
    <ProfilePictureProvider>
      <div className={`dashboard-layout${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <div className="dashboard-main">
          <Navbar title={title} />
          <main className="dashboard-content-wrapper">
            <Outlet />
          </main>
        </div>
        {isStudent && !isFullAiPage && <FloatingAiAssistant />}
      </div>
    </ProfilePictureProvider>
  );
}
