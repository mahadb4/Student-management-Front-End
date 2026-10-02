import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyTeacherProfile, teacherProfilePictureService, updateMyTeacherProfile } from "../../services/entities";
import { ProfilePictureUploader } from "../../components/common/ProfilePictureUploader";
import type { TeacherProfile } from "../../types/user";
import { useToast } from "../../context/ToastContext";
import { useProfilePicture } from "../../context/ProfilePictureContext";

export default function TeacherProfile() {
  const user = getCurrentUser();
  const { showToast } = useToast();
  const { setProfilePictureUrl } = useProfilePicture();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: "", date_of_birth: "", gender: "M", address: "", qualification: "",
  });

  const startEditing = () => {
    if (!teacher) return;
    setFormData({
      phone_number: teacher.phone_number || "",
      date_of_birth: teacher.date_of_birth || "",
      gender: teacher.gender || "M",
      address: teacher.address || "",
      qualification: teacher.qualification || "",
    });
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateMyTeacherProfile(formData);
      setTeacher(prev => prev && { ...prev, ...formData });
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
        <p>View your personal and professional faculty information</p>
      </div>

      {!teacher ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Teacher record not found.
        </div>
      ) : (
        <div className="content-card" style={{ padding: "32px 36px", borderTop: "3px solid var(--color-primary)" }}>
          <div className="profile-hero-card">
            {/* Left Column: Avatar & Status */}
            <div className="profile-hero-avatar-pane">
              <ProfilePictureUploader
                name={teacher.name}
                imageUrl={teacher.profile_picture_url}
                requestUploadUrl={teacherProfilePictureService.requestUploadUrl}
                confirmUpload={teacherProfilePictureService.confirmUpload}
                removePicture={teacherProfilePictureService.remove}
                onChange={url => {
                  setTeacher(prev => prev && { ...prev, profile_picture_url: url });
                  setProfilePictureUrl(url);
                }}
              />
              <span className="badge badge-success" style={{ padding: "4px 12px", fontSize: "0.74rem", fontWeight: 700 }}>
                Active Faculty
              </span>
            </div>

            {/* Right Column: Name, Designation & Fields Grid */}
            <div className="profile-hero-info-pane">
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ margin: "0 0 6px 0", fontSize: "1.45rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  {teacher.name}
                </h2>
                <p style={{ margin: 0, color: "var(--color-primary)", fontWeight: 600, fontSize: "0.92rem" }}>
                  {teacher.designation || "Faculty Member"} &bull; {teacher.department_name || "Faculty"}
                </p>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
                paddingTop: "18px",
                borderTop: "2px solid var(--color-primary)"
              }}>
                <div style={{ padding: "14px 16px", backgroundColor: "var(--color-surface-muted)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Email Address
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)", wordBreak: "break-all" }}>
                    {teacher.email}
                  </div>
                </div>

                <div style={{ padding: "14px 16px", backgroundColor: "var(--color-surface-muted)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Staff ID
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-primary)" }}>
                    #{teacher.employee_id}
                  </div>
                </div>

                <div style={{ padding: "14px 16px", backgroundColor: "var(--color-surface-muted)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                    Department
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
                    {teacher.department_name || "Not Assigned"}
                  </div>
                </div>

                <div style={{ padding: "14px 16px", backgroundColor: "var(--color-surface-muted)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    Academic Designation
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
                    {teacher.designation || "Faculty Member"}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "20px", paddingTop: "18px", borderTop: "2px solid var(--color-primary)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Personal Information</h3>
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
                        <label className="form-label">Phone Number</label>
                        <input
                          required className="form-control" value={formData.phone_number}
                          onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                        />
                      </div>
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
                        <label className="form-label">Qualification</label>
                        <input
                          required className="form-control" value={formData.qualification}
                          onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Address</label>
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
                    <div style={{ padding: "12px 14px", backgroundColor: "var(--color-surface-muted)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px" }}>Phone Number</div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>{teacher.phone_number || "N/A"}</div>
                    </div>
                    <div style={{ padding: "12px 14px", backgroundColor: "var(--color-surface-muted)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px" }}>Date of Birth</div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>{teacher.date_of_birth || "N/A"}</div>
                    </div>
                    <div style={{ padding: "12px 14px", backgroundColor: "var(--color-surface-muted)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px" }}>Gender</div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
                        {teacher.gender === "M" ? "Male" : teacher.gender === "F" ? "Female" : teacher.gender || "N/A"}
                      </div>
                    </div>
                    <div style={{ padding: "12px 14px", backgroundColor: "var(--color-surface-muted)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px" }}>Qualification</div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>{teacher.qualification || "N/A"}</div>
                    </div>
                    <div style={{ padding: "12px 14px", backgroundColor: "var(--color-surface-muted)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "4px" }}>Residential Address</div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>{teacher.address || "Not Provided"}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
