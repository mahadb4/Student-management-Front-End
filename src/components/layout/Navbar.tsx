import { useNavigate } from "react-router-dom";
import { getCurrentUser, logoutUser } from "../../services/auth";
import { invalidateMeCache } from "../../services/entities";
import { Avatar } from "../common/Avatar";
import { useProfilePicture } from "../../context/ProfilePictureContext";
import ThemeToggle from "../common/ThemeToggle";

interface NavbarProps {
  title: string;
}

export default function Navbar({ title }: NavbarProps) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { profilePictureUrl } = useProfilePicture();

  const handleLogout = () => {
    logoutUser();
    invalidateMeCache();
    navigate("/");
  };

  return (
    <header className="dashboard-navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">{title}</h1>
      </div>

      <div className="navbar-right">
        {/* Dark / Light Theme Toggle */}
        <ThemeToggle />

        <div className="user-profile">
          <Avatar src={profilePictureUrl} name={user?.name || "User"} size={36} />
          <div className="user-info">
            <span className="user-name">{user?.name || "User"}</span>
            <span className="user-role" style={{ textTransform: "capitalize" }}>
              {user?.role || "Guest"}
            </span>
          </div>
        </div>

        <button onClick={handleLogout} className="btn-navbar-logout" aria-label="Sign out">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
