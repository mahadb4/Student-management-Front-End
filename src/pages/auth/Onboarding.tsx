import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeOnboarding, getCurrentUser } from "../../services/auth";
import { departmentService, sectionService } from "../../services/entities";
import type { Department, Section } from "../../types/user";
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
  const [sections, setSections] = useState<Section[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [studentProfile, setStudentProfile] = useState({
    parents_phone_number: "", date_of_birth: "", gender: "M", address: "",
    department: "" as number | "", section: "" as number | "",
  });

  const [teacherProfile, setTeacherProfile] = useState({
    employee_id: "", phone_number: "", department: "" as number | "",
    designation: "", qualification: "", gender: "M",
    date_of_birth: "", date_of_joining: "", salary: "", address: "",
  });

  useEffect(() => {
    Promise.all([departmentService.getAll(), sectionService.getAll()])
      .then(([d, s]) => { setDepartments(d); setSections(s); })
      .catch(err => console.error(err));
  }, []);

  const sectionsForDepartment = useMemo(() => {
    if (studentProfile.department === "") return sections;
    return sections.filter(s => s.department === studentProfile.department);
  }, [sections, studentProfile.department]);

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

    const [first_name, last_name] = user.name.split(" ", 2);
    const raw = isStudent ? studentProfile : teacherProfile;

    const profile: Record<string, unknown> = {
      ...raw,
      first_name: first_name || user.name,
      last_name: last_name || "",
      department: raw.department === "" ? null : Number(raw.department),
      ...(isStudent ? { section: studentProfile.section === "" ? null : Number(studentProfile.section) } : {}),
      ...(!isStudent ? { salary: Number(teacherProfile.salary) || 0, department: teacherProfile.department === "" ? null : Number(teacherProfile.department) } : {}),
    };

    const result = await completeOnboarding(profile);

    if (!result.success) {
      setError(result.error || "Failed to complete onboarding.");
      setIsSubmitting(false);
      return;
    }

    navigate(dashboardMap[user.role] ?? "/", { replace: true });
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: "640px" }}>
        <h2>Complete Your Profile</h2>
        <p style={{ color: "var(--color-text-secondary, #666)", marginBottom: "24px" }}>
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
                <label className="form-label">Department</label>
                <select className="form-control" value={studentProfile.department} onChange={e => setStudentProfile({ ...studentProfile, department: e.target.value === "" ? "" : Number(e.target.value), section: "" })}>
                  <option value="">-- No Department --</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Section</label>
                <select className="form-control" value={studentProfile.section} onChange={e => setStudentProfile({ ...studentProfile, section: e.target.value === "" ? "" : Number(e.target.value) })}>
                  <option value="">-- No Section --</option>
                  {sectionsForDepartment.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
