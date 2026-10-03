import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyStudentProfile, studentProfilePictureService, updateMyStudentProfile } from "../../services/entities";
import { ProfilePictureUploader } from "../../components/common/ProfilePictureUploader";
import type { StudentProfile } from "../../types/user";
import { useToast } from "../../context/ToastContext";
import { useProfilePicture } from "../../context/ProfilePictureContext";

export default function StudentProfile() {
  const user = getCurrentUser();
  const { showToast } = useToast();
  const { setProfilePictureUrl } = useProfilePicture();
  const [student, setStudent] = useState<StudentProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ date_of_birth: "", gender: "M", parents_phone_number: "", address: "" });

  const startEditing = () => {
    if (!student) return;
    setFormData({
      date_of_birth: student.date_of_birth || "",
      gender: student.gender || "M",
      parents_phone_number: student.parents_phone_number || "",
      address: student.address || "",
    });
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateMyStudentProfile(formData);
      setStudent(prev => prev && { ...prev, ...formData });
      setIsEditing(false);
      showToast("Profile updated successfully.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update profile.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getMyStudentProfile()
      .then(setStudent)
      .catch(() => { })
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
        <div className="profile-grid" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Card 1: Student Identity Card */}
          <div className="content-card" style={{ padding: "26px 26px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px", borderRadius: "16px", borderTop: "3px solid var(--color-primary)" }}>
            <ProfilePictureUploader
              name={`${student.first_name} ${student.last_name}`}
              imageUrl={student.profile_picture_url}
              requestUploadUrl={studentProfilePictureService.requestUploadUrl}
              confirmUpload={studentProfilePictureService.confirmUpload}
              removePicture={studentProfilePictureService.remove}
              onChange={url => {
                setStudent(prev => prev && { ...prev, profile_picture_url: url });
                setProfilePictureUrl(url);
              }}
            />

            <div style={{ marginTop: "4px" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                {student.first_name} {student.last_name}
              </h3>
              <p style={{ margin: "0 0 10px 0", color: "var(--color-primary)", fontWeight: 600, fontSize: "0.875rem" }}>
                {student.department_name || "Enrolled Student"}
              </p>
              <span className="badge badge-success" style={{ padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>
                Active Student
              </span>
            </div>

            <div style={{
              width: "100%",
              borderTop: "1px solid var(--color-border)",
              paddingTop: "16px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
              fontSize: "0.85rem"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                backgroundColor: "var(--color-surface-muted)",
                borderRadius: "10px",
                border: "1px solid var(--color-surface-hover)"
              }}>
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(2, 132, 199, 0.1)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div style={{ overflow: "hidden", textAlign: "left" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>Email</div>
                  <div style={{ color: "var(--color-text-primary)", fontWeight: 600, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {student.student_email}
                  </div>
                </div>
              </div>

              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                backgroundColor: "var(--color-surface-muted)",
                borderRadius: "10px",
                border: "1px solid var(--color-surface-hover)"
              }}>
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(2, 132, 199, 0.1)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>Enrolled Date</div>
                  <div style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                    {student.date_of_enrollment || "N/A"}
                  </div>
                </div>
              </div>

              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                backgroundColor: "var(--color-surface-muted)",
                borderRadius: "10px",
                border: "1px solid var(--color-surface-hover)"
              }}>
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(2, 132, 199, 0.1)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>Section</div>
                  <div style={{ color: "var(--color-primary)", fontWeight: 700 }}>
                    {student.section_name || "Not Assigned"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Academic Details Card */}
          <div className="content-card" style={{ padding: "22px 26px", borderRadius: "16px" }}>
            <div className="profile-section-header-academic">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="profile-section-icon-academic">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                    Academic Details
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                    Department, class section, and enrollment status
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
              <div className="profile-stat-box">
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Department</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                  {student.department_name || "Not Assigned"}
                </div>
              </div>

              <div className="profile-stat-box">
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Assigned Section</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                  {student.section_name || "Not Assigned"}
                </div>
              </div>

              <div className="profile-stat-box">
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Enrollment Date</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                  {student.date_of_enrollment || "N/A"}
                </div>
              </div>

              <div className="profile-stat-box">
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Student Status</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-success)" }}>
                  Active &bull; Good Standing
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Personal Information Card */}
          <div className="content-card" style={{ padding: "22px 26px", borderRadius: "16px" }}>
            <div className="profile-section-header-personal">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="profile-section-icon-personal">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                    Personal Information
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                    Emergency contact and demographic details
                  </p>
                </div>
              </div>
              {!isEditing && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={startEditing}
                  style={{
                    padding: "6px 16px",
                    fontWeight: 600,
                    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.15)",
                  }}
                >
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSave}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input
                      required type="date" className="form-control" value={formData.date_of_birth}
                      onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-control" value={formData.gender}
                      onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Guardian Contact</label>
                    <input
                      required className="form-control" value={formData.parents_phone_number}
                      onChange={e => setFormData({ ...formData, parents_phone_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Residential Address</label>
                  <textarea
                    className="form-control" rows={2} value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                  ></textarea>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsEditing(false)} disabled={isSubmitting}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</button>
                </div>
              </form>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <div className="profile-stat-box">
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Date of Birth</div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                    {student.date_of_birth || "N/A"}
                  </div>
                </div>

                <div className="profile-stat-box">
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Gender</div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                    {student.gender === "M" ? "Male" : student.gender === "F" ? "Female" : student.gender || "N/A"}
                  </div>
                </div>

                <div className="profile-stat-box">
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Guardian Contact</div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                    {student.parents_phone_number || "N/A"}
                  </div>
                </div>

                <div className="profile-stat-box">
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Residential Address</div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                    {student.address || "Not Provided"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
