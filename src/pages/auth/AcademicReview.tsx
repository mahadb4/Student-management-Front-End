import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logoutUser, refreshCurrentUser } from "../../services/auth";
import ThemeToggle from "../../components/common/ThemeToggle";
import "../styles/Auth.css";

const dashboardMap: Record<string, string> = {
  admin: "/admin",
  student: "/student",
  teacher: "/teacher",
  staff: "/staff",
};

// Shown to a student who has completed onboarding but whose academic
// placement (Department + Section) an admin hasn't confirmed yet - the
// server itself refuses student-portal data until then (see
// common/permissions.py's authenticate_request), this page is just the
// user-facing side of that same gate.
export default function AcademicReview() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [checking, setChecking] = useState(false);

  if (!user) {
    navigate("/", { replace: true });
    return null;
  }

  // Nothing to review for this role, or already cleared - nowhere to be here.
  if (user.role !== "student" || !user.academic_review_pending) {
    navigate(dashboardMap[user.role] ?? "/", { replace: true });
    return null;
  }

  const handleCheckStatus = async () => {
    if (checking) return;
    setChecking(true);

    const refreshed = await refreshCurrentUser();

    if (refreshed && !refreshed.academic_review_pending) {
      navigate("/student", { replace: true });
      return;
    }

    setChecking(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate("/", { replace: true });
  };

  return (
    <div className="pending-container">
      <ThemeToggle className="theme-toggle-corner" />
      <div className="pending-card">
        <div className="pending-success-badge-wrapper">
          <div className="pending-success-badge">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <h1 className="pending-title">Profile Submitted!</h1>
        <p className="pending-subtitle">
          Your profile has been submitted successfully. Your academic placement is currently being reviewed by the
          administration. You will be able to access your student dashboard once your department and section have
          been assigned.
        </p>

        <div className="pending-details-card">
          <div className="pending-details-header">
            <span className="pending-details-title">Account Details</span>
            <span className="status-badge pending-badge">
              ⏳ Academic Review Pending
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
          </div>
        </div>

        <div className="pending-guidance-card">
          <div className="pending-guidance-header">
            <span>What happens next?</span>
          </div>
          <div className="pending-steps-list">
            <div className="pending-step-item">
              <div className="pending-step-num">1</div>
              <div>
                <div className="pending-step-title">Academic Review</div>
                <div className="pending-step-desc">An administrator reviews your submission and assigns your Department and Section.</div>
              </div>
            </div>

            <div className="pending-step-item">
              <div className="pending-step-num">2</div>
              <div>
                <div className="pending-step-title">Dashboard Access</div>
                <div className="pending-step-desc">Once confirmed, your full student dashboard becomes available.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pending-footer-actions">
          <button onClick={handleCheckStatus} className="auth-button" disabled={checking} style={{ maxWidth: "260px", margin: "0 auto" }}>
            {checking ? "Checking..." : "Check Status"}
          </button>
          <button onClick={handleLogout} className="btn btn-outline" style={{ maxWidth: "260px", margin: "12px auto 0" }}>
            Sign Out
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
