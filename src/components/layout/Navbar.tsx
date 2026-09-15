import { useNavigate } from "react-router-dom";
import { getCurrentUser, logoutUser } from "../../services/auth";
import { invalidateMeCache } from "../../services/entities";
import { Avatar } from "../common/Avatar";
import { useProfilePicture } from "../../context/ProfilePictureContext";

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
        <button className="btn-icon notification-btn" aria-label="Notifications">
          🔔
        </button>

        <div className="user-profile">
          <Avatar src={profilePictureUrl} name={user?.name || "User"} size={36} />
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
