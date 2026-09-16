import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeOnboarding, getCurrentUser } from "../../services/auth";
import { departmentService } from "../../services/entities";
import type { Department } from "../../types/user";
import ThemeToggle from "../../components/common/ThemeToggle";
import "../styles/Auth.css";

const dashboardMap: Record<string, string> = {
  admin: "/admin",
  student: "/student",
  teacher: "/teacher",
  staff: "/staff",
};

export default function Onboarding() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [studentProfile, setStudentProfile] = useState({
    parents_phone_number: "", date_of_birth: "", gender: "M", address: "",
  });

  const [teacherProfile, setTeacherProfile] = useState({
    employee_id: "", phone_number: "", department: "" as number | "",
    designation: "", qualification: "", gender: "M",
    date_of_birth: "", date_of_joining: "", salary: "", address: "",
  });

  // Only the Teacher form needs this - Department/Section are admin-assigned
  // academic placement, decided AFTER onboarding once an admin reviews the
  // student's submission (see AcademicReview.tsx), never chosen here.
  useEffect(() => {
    if (user?.role !== "teacher") return;
    departmentService.getAll()
      .then(setDepartments)
      .catch(err => console.error(err));
  }, [user?.role]);

  if (!user) {
    navigate("/", { replace: true });
    return null;
  }

  // Nothing to onboard for this role, or already onboarded - nowhere to be here.
  const needsOnboarding = (user.role === "student" && !user.student_id) || (user.role === "teacher" && !user.teacher_id);
  if (!needsOnboarding) {
    navigate(dashboardMap[user.role] ?? "/", { replace: true });
    return null;
  }

  const isStudent = user.role === "student";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const spaceIndex = user.name.indexOf(" ");
    const first_name = spaceIndex === -1 ? user.name : user.name.slice(0, spaceIndex);
    const last_name = spaceIndex === -1 ? "" : user.name.slice(spaceIndex + 1);
    const raw = isStudent ? studentProfile : teacherProfile;

    const profile: Record<string, unknown> = {
      ...raw,
      first_name: first_name || user.name,
      last_name: last_name || "",
      // Department/Section are never part of the student's own submission -
      // they're admin-assigned academic placement, decided after onboarding
      // (see AcademicReview.tsx). Teacher onboarding is unrelated/unchanged.
      ...(!isStudent ? {
        department: teacherProfile.department === "" ? null : Number(teacherProfile.department),
        salary: Number(teacherProfile.salary) || 0,
      } : {}),
    };

    const result = await completeOnboarding(profile);

    if (!result.success) {
      setError(result.error || "Failed to complete onboarding.");
      setIsSubmitting(false);
      return;
    }

    // A student's academic placement always still needs admin confirmation
    // right after onboarding - completeOnboarding() already refreshed the
    // cached user, so ProtectedRoute will route them to Academic Review
    // instead of the dashboard on its own; teachers go straight through.
    navigate(dashboardMap[user.role] ?? "/", { replace: true });
  };

  return (
    <div className="auth-container">
      <ThemeToggle className="theme-toggle-corner" />
      <div className="auth-card" style={{ maxWidth: "640px" }}>
        <h2>Complete Your Profile</h2>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "24px" }}>
          Welcome, {user.name}. Before you can access the dashboard, please complete your {user.role} profile.
        </p>

        {error && <div className="error-alert" style={{ marginBottom: "16px" }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {isStudent ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Parents Phone</label>
                <input required className="form-control" value={studentProfile.parents_phone_number} onChange={e => setStudentProfile({ ...studentProfile, parents_phone_number: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input required type="date" className="form-control" value={studentProfile.date_of_birth} onChange={e => setStudentProfile({ ...studentProfile, date_of_birth: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-control" value={studentProfile.gender} onChange={e => setStudentProfile({ ...studentProfile, gender: e.target.value })}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-control" value={studentProfile.address} onChange={e => setStudentProfile({ ...studentProfile, address: e.target.value })} />
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <input required className="form-control" value={teacherProfile.employee_id} onChange={e => setTeacherProfile({ ...teacherProfile, employee_id: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input required className="form-control" value={teacherProfile.phone_number} onChange={e => setTeacherProfile({ ...teacherProfile, phone_number: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select required className="form-control" value={teacherProfile.department} onChange={e => setTeacherProfile({ ...teacherProfile, department: e.target.value === "" ? "" : Number(e.target.value) })}>
                  <option value="">-- Select Department --</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Designation</label>
                <input required className="form-control" value={teacherProfile.designation} onChange={e => setTeacherProfile({ ...teacherProfile, designation: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Qualification</label>
                <input required className="form-control" value={teacherProfile.qualification} onChange={e => setTeacherProfile({ ...teacherProfile, qualification: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-control" value={teacherProfile.gender} onChange={e => setTeacherProfile({ ...teacherProfile, gender: e.target.value })}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input required type="date" className="form-control" value={teacherProfile.date_of_birth} onChange={e => setTeacherProfile({ ...teacherProfile, date_of_birth: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Joining</label>
                <input required type="date" className="form-control" value={teacherProfile.date_of_joining} onChange={e => setTeacherProfile({ ...teacherProfile, date_of_joining: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Salary</label>
                <input required type="number" step="0.01" className="form-control" value={teacherProfile.salary} onChange={e => setTeacherProfile({ ...teacherProfile, salary: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-control" value={teacherProfile.address} onChange={e => setTeacherProfile({ ...teacherProfile, address: e.target.value })} />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "24px" }} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Complete Profile & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
