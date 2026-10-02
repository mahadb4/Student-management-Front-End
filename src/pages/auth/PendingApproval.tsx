import { useNavigate, useLocation } from "react-router-dom";
import type { User } from "../../types/user";
import ThemeToggle from "../../components/common/ThemeToggle";
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
      <ThemeToggle className="theme-toggle-corner" />
      <div className="pending-card">
        {/* Animated Success Checkmark Header */}
        <div className="pending-success-badge-wrapper">
          <div className="pending-success-badge">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <h1 className="pending-title">Registration Submitted!</h1>
        <p className="pending-subtitle">
          Your account request has been received and is currently awaiting administrator review.
        </p>

        {user && (
          <div className="pending-details-card">
            <div className="pending-details-header">
              <span className="pending-details-title">Account Details</span>
              <span className="status-badge pending-badge">
                ⏳ Pending Approval
              </span>
            </div>

            <div className="pending-details-grid">
              <div className="pending-detail-cell">
                <span className="pending-cell-label">Full Name</span>
                <span className="pending-cell-value">{user.name}</span>
              </div>

              <div className="pending-detail-cell">
                <span className="pending-cell-label">Email Address</span>
                <span className="pending-cell-value">{user.email}</span>
              </div>

              <div className="pending-detail-cell">
                <span className="pending-cell-label">Applied Role</span>
                <span className="role-badge">
                  {roleEmoji[user.role]} {roleDisplayName[user.role]}
                </span>
              </div>

              <div className="pending-detail-cell">
                <span className="pending-cell-label">Portal Access</span>
                <span style={{ fontWeight: 600, color: "var(--color-warning-text)", fontSize: "0.85rem" }}>
                  Awaiting Activation
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Steps & Guidance */}
        <div className="pending-guidance-card">
          <div className="pending-guidance-header">
            <span>What happens next?</span>
          </div>
          <div className="pending-steps-list">
            <div className="pending-step-item">
              <div className="pending-step-num">1</div>
              <div>
                <div className="pending-step-title">Administrative Verification</div>
                <div className="pending-step-desc">An administrator verifies your identity and academic department within 24–48 hours.</div>
              </div>
            </div>

            <div className="pending-step-item">
              <div className="pending-step-num">2</div>
              <div>
                <div className="pending-step-title">Confirmation & Access</div>
                <div className="pending-step-desc">Once verified, your account is activated and you can sign in directly with your email.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pending-footer-actions">
          <button onClick={() => navigate("/")} className="auth-button" style={{ maxWidth: "260px", margin: "0 auto" }}>
            Return to Sign In
          </button>
          <p className="pending-contact-note">
            Need urgent assistance? Contact{" "}
            <a href="mailto:support@xyzuniversity.com" className="support-link">
              support@xyzuniversity.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default PendingApproval;

