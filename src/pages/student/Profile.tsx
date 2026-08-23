import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyStudentProfile, departmentService, sectionService } from "../../services/entities";
import type { Student, Department, Section } from "../../types/user";

export default function StudentProfile() {
  const user = getCurrentUser();
  const [student, setStudent] = useState<Student | null>(null);

  const [department, setDepartment] = useState<Department | null>(null);
  const [section, setSection] = useState<Section | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getMyStudentProfile().then(myStudent => {
      setStudent(myStudent);

      // Single-record lookups (not full-collection fetches) to resolve names.
      Promise.all([
        myStudent.department ? departmentService.getById(myStudent.department) : Promise.resolve(null),
        myStudent.section ? sectionService.getById(myStudent.section) : Promise.resolve(null),
      ]).then(([d, s]) => {
        setDepartment(d);
        setSection(s);
      }).finally(() => setLoading(false));
    }).catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <><div style={{ padding: "40px", textAlign: "center" }}>Loading profile...</div></>;
  }

  return (
    <>
      <div className="page-header">
        <h2>Student Profile</h2>
        <p>View your personal and academic information</p>
      </div>

      {!student ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Student record not found.
        </div>
      ) : (
        <div className="content-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{
              width: "120px", height: "120px", borderRadius: "50%",
              background: "var(--color-primary)", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "3rem", fontWeight: "bold"
            }}>
              {student.first_name.charAt(0)}{student.last_name.charAt(0)}
            </div>

            <div style={{ flex: 1 }}>
              <h2 style={{ margin: "0 0 8px 0" }}>{student.first_name} {student.last_name}</h2>
              <p style={{ margin: "0 0 4px 0", color: "var(--color-text-secondary)" }}>{student.student_email}</p>
              <p style={{ margin: "0 0 16px 0" }}>
                <span className="badge badge-success">Active Student</span>
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginTop: "24px" }}>
                <div>
                  <div className="form-label">Section</div>
                  <div><strong>{section ? section.name : "Not Assigned"}</strong></div>
                </div>
                <div>
                  <div className="form-label">Department</div>
                  <div><strong>{department ? department.name : "Not Assigned"}</strong></div>
                </div>
                <div>
                  <div className="form-label">Enrollment Date</div>
                  <div><strong>{student.date_of_enrollment}</strong></div>
                </div>
              </div>

              <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid var(--color-border)" }} />

              <h3 style={{ margin: "0 0 16px 0" }}>Personal Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
                <div>
                  <div className="form-label">Date of Birth</div>
                  <div><strong>{student.date_of_birth}</strong></div>
                </div>
                <div>
                  <div className="form-label">Gender</div>
                  <div><strong>{student.gender === "M" ? "Male" : student.gender === "F" ? "Female" : student.gender}</strong></div>
                </div>
                <div>
                  <div className="form-label">Parents Phone</div>
                  <div><strong>{student.parents_phone_number}</strong></div>
                </div>
                <div>
                  <div className="form-label">Address</div>
                  <div><strong>{student.address || "-"}</strong></div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
