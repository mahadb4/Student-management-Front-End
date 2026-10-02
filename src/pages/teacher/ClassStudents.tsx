import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";
import { getMyTeacherStudents, getRemarksForStudentInOffering, remarkService } from "../../services/entities";
import { Avatar } from "../../components/common/Avatar";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { useToast } from "../../context/ToastContext";
import type { EnrollmentTeacherListItem, RemarkTeacherListItem, RemarkVisibility } from "../../types/user";

// The Remarks modal for one student+class: their remark history plus an
// inline Add Remark form. courseOfferingId/courseName/courseCode come from
// the page's own fixed class context (route param + Link state), not from
// the student row itself.
function RemarksModal({
  student, courseOfferingId, courseName, courseCode, onClose,
}: {
  student: EnrollmentTeacherListItem;
  courseOfferingId: number;
  courseName: string;
  courseCode: string;
  onClose: () => void;
}) {
  const user = getCurrentUser();
  const { showToast } = useToast();

  const [remarks, setRemarks] = useState<RemarkTeacherListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRemark, setEditingRemark] = useState<RemarkTeacherListItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<RemarkTeacherListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    remark_text: "",
    visibility: "PRIVATE" as RemarkVisibility,
  });

  const loadRemarks = () => {
    setLoading(true);
    getRemarksForStudentInOffering(student.student_id, courseOfferingId)
      .then(r => setRemarks(r.results))
      .catch(err => showToast(err instanceof Error ? err.message : "Failed to load remarks.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRemarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenAddForm = () => {
    setEditingRemark(null);
    setFormData({ remark_text: "", visibility: "PRIVATE" });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (remark: RemarkTeacherListItem) => {
    setEditingRemark(remark);
    setFormData({ remark_text: remark.remark_text, visibility: remark.visibility });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.remark_text.trim()) {
      showToast("Remark text is required.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRemark) {
        await remarkService.update(editingRemark.id, {
          remark_text: formData.remark_text,
          visibility: formData.visibility,
        });
        showToast("Remark updated successfully.", "success");
      } else {
        await remarkService.create({
          student: student.student_id,
          course_offering: courseOfferingId,
          remark_text: formData.remark_text,
          visibility: formData.visibility,
        } as unknown as Partial<RemarkTeacherListItem>);
        showToast("Remark added successfully.", "success");
      }
      setIsFormOpen(false);
      loadRemarks();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to save remark.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || isDeleting) return;
    setIsDeleting(true);
    try {
      await remarkService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      showToast("Remark deleted successfully.", "success");
      loadRemarks();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to delete remark.", "error");
      setDeleteConfirm(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwnRemark = (remark: RemarkTeacherListItem) => remark.teacher === user?.teacher_id;

  const modalTitle = (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          backgroundColor: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-on-primary)",
          fontSize: "1.1rem",
          boxShadow: "0 2px 6px rgba(15, 23, 42, 0.15)",
        }}
      >
        📝
      </div>
      <div>
        <div style={{ fontSize: "1.12rem", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.2 }}>
          Student Remarks
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
          {student.student_name}
        </div>
      </div>
    </div>
  );

  return (
    <Modal isOpen title={modalTitle} onClose={onClose} maxWidth="640px">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Course context bar */}
        <div className="remarks-header-card">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>Course:</span>
            <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--color-text-primary)" }}>
              {courseName}
            </span>
            <span
              className="badge"
              style={{
                backgroundColor: "var(--color-primary-light)",
                color: "var(--color-primary)",
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "2px 8px",
              }}
            >
              {courseCode}
            </span>
          </div>
          <span
            style={{
              fontSize: "0.76rem",
              fontWeight: 600,
              color: "var(--color-text-strong)",
              background: "var(--color-border)",
              padding: "3px 10px",
              borderRadius: "999px",
            }}
          >
            {remarks.length} {remarks.length === 1 ? "Remark" : "Remarks"}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-secondary)" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>⏳</div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Loading remarks...</div>
          </div>
        ) : remarks.length === 0 ? (
          <div className="remarks-empty-state">
            <div className="remarks-empty-icon">
              📋
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "var(--color-text-primary)", fontSize: "1rem", marginBottom: "4px" }}>
                No remarks recorded yet
              </div>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.84rem", margin: 0, maxWidth: "340px", lineHeight: 1.5 }}>
                Add academic feedback, behavioral observations, or private performance notes for {student.student_name}.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "320px", overflowY: "auto", paddingRight: "4px" }}>
            {remarks.map(r => (
              <div key={r.id} className="remarks-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                      {new Date(r.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {r.visibility === "STUDENT_VISIBLE" ? (
                      <span
                        className="badge badge-success"
                        style={{ fontSize: "0.72rem", padding: "3px 8px", fontWeight: 600 }}
                      >
                        ✓ Visible to Student
                      </span>
                    ) : (
                      <span
                        className="badge badge-warning"
                        style={{ fontSize: "0.72rem", padding: "3px 8px", fontWeight: 600 }}
                      >
                        🔒 Private Note
                      </span>
                    )}
                  </div>

                  {isOwnRemark(r) && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        onClick={() => handleOpenEditForm(r)}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: "3px 10px", fontSize: "0.76rem", fontWeight: 600 }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(r)}
                        className="btn btn-sm btn-subtle-danger"
                        style={{ padding: "3px 10px", fontSize: "0.76rem", fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    backgroundColor: "var(--color-surface-muted)",
                    borderLeft: "3.5px solid var(--color-primary)",
                    borderRadius: "0 8px 8px 0",
                    padding: "12px 16px",
                    fontSize: "0.88rem",
                    color: "var(--color-text-primary)",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {r.remark_text}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Remark Form */}
        {isFormOpen ? (
          <div className="remarks-form-card">
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "var(--color-text-primary)",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>✏️</span>
              <span>{editingRemark ? "Edit Academic Remark" : "New Academic Remark"}</span>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: "0.84rem" }}>
                  Observation / Feedback
                </label>
                <textarea
                  required
                  className="form-control"
                  rows={3}
                  placeholder="Write feedback, behavior notes, or academic observations for this student..."
                  value={formData.remark_text}
                  onChange={(e) => setFormData({ ...formData, remark_text: e.target.value })}
                  style={{ resize: "vertical", fontSize: "0.88rem", lineHeight: 1.5, minHeight: "85px" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "18px" }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: "0.84rem" }}>
                  Visibility Setting
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div
                    onClick={() => setFormData({ ...formData, visibility: "PRIVATE" })}
                    className={`visibility-selector-card ${formData.visibility === "PRIVATE" ? "active" : ""}`}
                    style={{ border: "1.5px solid var(--color-border)" }}
                  >
                    <span style={{ fontSize: "1.2rem", marginTop: "2px" }}>🔒</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--color-text-primary)" }}>Private Note</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--color-text-secondary)", marginTop: "2px", lineHeight: 1.3 }}>
                        Only you and faculty can view
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, visibility: "STUDENT_VISIBLE" })}
                    className={`visibility-selector-card ${formData.visibility === "STUDENT_VISIBLE" ? "active" : ""}`}
                    style={{ border: "1.5px solid var(--color-border)" }}
                  >
                    <span style={{ fontSize: "1.2rem", marginTop: "2px" }}>👁️</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--color-text-primary)" }}>Student Visible</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--color-text-secondary)", marginTop: "2px", lineHeight: 1.3 }}>
                        Student can read on their portal
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ minWidth: "80px", fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting}
                  style={{
                    minWidth: "110px",
                    fontWeight: 600,
                  }}
                >
                  {isSubmitting ? "Saving..." : editingRemark ? "Update Remark" : "Post Remark"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleOpenAddForm}
              className="btn btn-primary btn-sm"
              style={{
                fontWeight: 600,
                padding: "8px 18px",
              }}
            >
              + Add Remark
            </button>
          </div>
        )}

        <ConfirmDialog
          isOpen={!!deleteConfirm}
          title="Delete Remark"
          message="Are you sure you want to delete this remark? This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          confirmDisabled={isDeleting}
        />
      </div>
    </Modal>
  );
}

// Reached only from a My Classes card's "Students" button
// (/teacher/classes/:courseOfferingId/students) - the offering id comes from
// the route, and the course label from the Link's `state` (set by the card
// that already has it), so opening this page costs exactly one new request
// (the roster itself) instead of also re-fetching the teacher's offerings list.
export default function ClassStudents() {
  const { courseOfferingId } = useParams<{ courseOfferingId: string }>();
  const location = useLocation() as { state?: { courseName?: string; courseCode?: string; sectionName?: string | null } };
  const offeringId = Number(courseOfferingId);

  const courseName = location.state?.courseName || "This class";
  const courseCode = location.state?.courseCode || "";
  const sectionName = location.state?.sectionName;

  const [enrollments, setEnrollments] = useState<EnrollmentTeacherListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [remarksFor, setRemarksFor] = useState<EnrollmentTeacherListItem | null>(null);

  useEffect(() => {
    if (!offeringId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getMyTeacherStudents(1, 10, offeringId).then(e => {
      setEnrollments(e.results);
      setPage(e.current_page);
      setTotalPages(e.total_pages);
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeringId]);

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    getMyTeacherStudents(page + 1, 10, offeringId).then(e => {
      setEnrollments(prev => [...prev, ...e.results]);
      setPage(e.current_page);
      setTotalPages(e.total_pages);
    }).finally(() => setLoadingMore(false));
  };

  if (loading) {
    return <><div style={{ padding: "40px", textAlign: "center" }}>Loading students...</div></>;
  }

  return (
    <>
      <div style={{ marginBottom: "20px" }}>
        <Link to="/teacher/courses" className="btn-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to My Classes</span>
        </Link>
      </div>

      <div className="page-header">
        <h2>{courseName}{courseCode ? ` (${courseCode})` : ""}</h2>
        <p>{sectionName ? `Section ${sectionName} · ` : ""}Students enrolled in this class</p>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Unable to load students for this class.
        </div>
      ) : (
        <>
          <div
            style={{
              marginBottom: "18px",
              padding: "14px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "var(--color-primary)",
              borderRadius: "var(--radius-lg)",
              color: "var(--color-on-primary)",
              boxShadow: "0 4px 14px -2px rgba(30, 64, 175, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.2rem" }}>🎓</span>
              <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--color-on-primary)" }}>
                Class Roster
              </span>
            </div>
            <span
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.18)",
                color: "var(--color-on-primary)",
                fontWeight: 700,
                padding: "6px 14px",
                fontSize: "0.82rem",
                borderRadius: "999px",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                letterSpacing: "0.02em",
              }}
            >
              {enrollments.length} {enrollments.length === 1 ? "Student" : "Students"} Enrolled
            </span>
          </div>

          <div className="table-responsive content-card" style={{ boxShadow: "var(--shadow-sm)" }}>
            <table className="data-table table-compact" style={{ minWidth: "750px" }}>
              <colgroup>
                <col style={{ width: "34%" }} />
                <col style={{ width: "34%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "18%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "32px 20px", color: "var(--color-text-secondary)" }}>
                      No students enrolled in this class.
                    </td>
                  </tr>
                ) : (
                  enrollments.map(e => (
                    <tr key={e.enrollment_id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <Avatar src={e.profile_picture_url} name={e.student_name} size={32} />
                          <span style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.875rem" }}>
                            {e.student_name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: "var(--color-text-secondary)", fontSize: "0.84rem" }}>{e.student_email}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${e.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`} style={{ padding: "3px 8px", fontSize: "0.72rem" }}>
                          {e.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => setRemarksFor(e)}
                          className="btn-remarks"
                          title="View or add remarks for this student"
                        >
                          <span className="remarks-pencil-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </span>
                          <span>Remarks</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {page < totalPages && (
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <button className="btn btn-secondary" onClick={loadMore} disabled={loadingMore} style={{ minWidth: "140px" }}>
                {loadingMore ? "Loading..." : "Load More Students"}
              </button>
            </div>
          )}

          {remarksFor && (
            <RemarksModal
              student={remarksFor}
              courseOfferingId={offeringId}
              courseName={courseName}
              courseCode={courseCode}
              onClose={() => setRemarksFor(null)}
            />
          )}
        </>
      )}
    </>
  );
}
