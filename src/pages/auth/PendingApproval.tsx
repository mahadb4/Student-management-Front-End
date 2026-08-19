import { useNavigate, useLocation } from "react-router-dom";
import type { User } from "../../types/user";
import "../styles/Auth.css";
interface LocationState {
  user?: User;
}

function PendingApproval() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  // If user data is not available, show a basic pending message
  const user = state?.user;

  const roleDisplayName: Record<string, string> = {
    student: "Student",
    teacher: "Teacher",
    staff: "Staff Member",
    admin: "Administrator",
  };

  const roleEmoji: Record<string, string> = {
    student: "📚",
    teacher: "👨‍🏫",
    staff: "👨‍💼",
    admin: "🔐",
  };

  return (
    <div className="pending-container">
      <div className="pending-card">
        <div className="pending-icon">✅</div>
        <h1 className="pending-title">Registration Submitted Successfully!</h1>

        {user && (
          <div className="pending-details">
            <div className="details-section">
              <h2 className="details-heading">Account Details</h2>

              <div className="detail-item">
                <span className="detail-label">Full Name</span>
                <span className="detail-value">{user.name}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Email Address</span>
                <span className="detail-value">{user.email}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Role</span>
                <span className="detail-value role-badge">
                  {roleEmoji[user.role]} {roleDisplayName[user.role]}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className="detail-value status-badge pending-badge">
                  ⏳ Pending Approval
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="pending-content">
          <p className="pending-message">
            Thank you for registering! Your account has been successfully
            submitted and is currently awaiting administrator approval.
          </p>

          <div className="pending-info">
            <p>
              <strong>What happens next?</strong>
            </p>
            <ul>
              <li>
                An administrator will review your registration details within
                24-48 hours
              </li>
              <li>
                Once approved, you will receive a confirmation notification
              </li>
              <li>
                After approval, you can log in with your email and password to
                access your dashboard
              </li>
              <li>
                If your registration is rejected, you may register again with
                updated information
              </li>
            </ul>
          </div>

          <div className="pending-tips">
            <p>
              <strong>💡 Tips while you wait:</strong>
            </p>
            <ul>
              <li>Check your email regularly for approval notifications</li>
              <li>
                If you don't receive a response within 48 hours, contact support
              </li>
              <li>Keep your registration credentials safe</li>
            </ul>
          </div>

          <p className="pending-contact">
            <strong>Need help?</strong> Contact the support team at{" "}
            <a href="mailto:support@xyzuniversity.com" className="support-link">
              support@xyzuniversity.com
            </a>
          </p>

          <button onClick={() => navigate("/")} className="back-button">
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default PendingApproval;
