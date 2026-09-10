import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyTeacherProfile, teacherProfilePictureService } from "../../services/entities";
import { ProfilePictureUploader } from "../../components/common/ProfilePictureUploader";
import type { TeacherProfile } from "../../types/user";

export default function TeacherProfile() {
  const user = getCurrentUser();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getMyTeacherProfile()
      .then(setTeacher)
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
        <h2>Teacher Profile</h2>
        <p>View your personal and professional information</p>
      </div>

      {!teacher ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Teacher record not found.
        </div>
      ) : (
        <div className="content-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <ProfilePictureUploader
              name={`${teacher.first_name} ${teacher.last_name}`}
              imageUrl={teacher.profile_picture_url}
              requestUploadUrl={teacherProfilePictureService.requestUploadUrl}
              confirmUpload={teacherProfilePictureService.confirmUpload}
              removePicture={teacherProfilePictureService.remove}
              onChange={url => setTeacher(prev => prev && { ...prev, profile_picture_url: url })}
            />

            <div style={{ flex: 1 }}>
              <h2 style={{ margin: "0 0 8px 0" }}>{teacher.first_name} {teacher.last_name}</h2>
              <p style={{ margin: "0 0 4px 0", color: "var(--color-text-secondary)" }}>{teacher.email}</p>
              <p style={{ margin: "0 0 16px 0" }}>
                <span className="badge badge-success">Employee ID: {teacher.employee_id}</span>
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginTop: "24px" }}>
                <div>
                  <div className="form-label">Department</div>
                  <div><strong>{teacher.department_name || "Not Assigned"}</strong></div>
                </div>
                <div>
                  <div className="form-label">Designation</div>
                  <div><strong>{teacher.designation}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
