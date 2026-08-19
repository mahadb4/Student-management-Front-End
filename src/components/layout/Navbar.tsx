import { useNavigate } from "react-router-dom";
import { getCurrentUser, logoutUser } from "../../services/auth";

interface NavbarProps {
  title: string;
}

export default function Navbar({ title }: NavbarProps) {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    logoutUser();
    navigate("/");
  };

  return (
    <header className="dashboard-navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">{title}</h1>
      </div>
      
      <div className="navbar-right">
        <button className="btn-icon notification-btn" aria-label="Notifications">
          🔔
          <span className="notification-badge">3</span>
        </button>
        
        <div className="user-profile">
          <div className="avatar">{user?.name ? user.name.charAt(0).toUpperCase() : "U"}</div>
          <div className="user-info">
            <span className="user-name">{user?.name || "User"}</span>
            <span className="user-role" style={{ textTransform: "capitalize" }}>
              {user?.role || "Guest"}
            </span>
          </div>
        </div>

        <button onClick={handleLogout} className="btn-outline logout-btn">
          Logout
        </button>
      </div>
    </header>
  );
}
