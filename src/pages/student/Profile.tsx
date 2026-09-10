import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyStudentProfile, studentProfilePictureService } from "../../services/entities";
import { ProfilePictureUploader } from "../../components/common/ProfilePictureUploader";
import type { StudentProfile } from "../../types/user";

export default function StudentProfile() {
  const user = getCurrentUser();
  const [student, setStudent] = useState<StudentProfile | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getMyStudentProfile()
      .then(setStudent)
      .catch(() => {})
      .finally(() => setLoading(false));
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
            <ProfilePictureUploader
              name={`${student.first_name} ${student.last_name}`}
              imageUrl={student.profile_picture_url}
              requestUploadUrl={studentProfilePictureService.requestUploadUrl}
              confirmUpload={studentProfilePictureService.confirmUpload}
              removePicture={studentProfilePictureService.remove}
              onChange={url => setStudent(prev => prev && { ...prev, profile_picture_url: url })}
            />

            <div style={{ flex: 1 }}>
              <h2 style={{ margin: "0 0 8px 0" }}>{student.first_name} {student.last_name}</h2>
              <p style={{ margin: "0 0 4px 0", color: "var(--color-text-secondary)" }}>{student.student_email}</p>
              <p style={{ margin: "0 0 16px 0" }}>
                <span className="badge badge-success">Active Student</span>
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginTop: "24px" }}>
                <div>
                  <div className="form-label">Section</div>
                  <div><strong>{student.section_name || "Not Assigned"}</strong></div>
                </div>
                <div>
                  <div className="form-label">Department</div>
                  <div><strong>{student.department_name || "Not Assigned"}</strong></div>
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
