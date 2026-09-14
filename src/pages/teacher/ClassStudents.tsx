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

  return (
    <Modal isOpen title={`Student Remarks - ${student.student_name}`} onClose={onClose}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        backgroundColor: "#f8fafc",
        borderRadius: "var(--radius-md)",
        border: "1px solid #f1f5f9",
        marginBottom: "16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>Course:</span>
          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text-primary)" }}>
            {courseName}
          </span>
          <span className="badge" style={{ backgroundColor: "var(--color-primary-light)", color: "var(--color-primary)", fontSize: "0.72rem", padding: "2px 8px" }}>
            {courseCode}
          </span>
        </div>
        <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
          {remarks.length} {remarks.length === 1 ? "Remark" : "Remarks"}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: "24px", textAlign: "center", color: "var(--color-text-secondary)" }}>Loading remarks...</div>
      ) : remarks.length === 0 ? (
        <div style={{ padding: "32px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.95rem" }}>
            No remarks recorded yet
          </div>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.82rem", margin: 0, maxWidth: "300px" }}>
            Add academic feedback, observations, or private performance notes for {student.student_name}.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "340px", overflowY: "auto", paddingRight: "4px" }}>
          {remarks.map(r => (
            <div key={r.id} style={{
              backgroundColor: "#ffffff",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "14px 16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {new Date(r.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {r.visibility === "STUDENT_VISIBLE" ? (
                    <span className="badge badge-success" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>Visible to Student</span>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>Private Note</span>
                  )}
                </div>

                {isOwnRemark(r) && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button onClick={() => handleOpenEditForm(r)} className="btn btn-sm btn-secondary" style={{ padding: "3px 8px", fontSize: "0.74rem" }}>
                      Edit
                    </button>
                    <button onClick={() => setDeleteConfirm(r)} className="btn btn-sm btn-subtle-danger" style={{ padding: "3px 8px", fontSize: "0.74rem" }}>
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div style={{
                backgroundColor: "#f8fafc",
                borderLeft: "3px solid var(--color-primary)",
                borderRadius: "0 6px 6px 0",
                padding: "10px 14px",
                fontSize: "0.875rem",
                color: "var(--color-text-primary)",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap"
              }}>
                {r.remark_text}
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormOpen ? (
        <div style={{ marginTop: "18px", padding: "16px", backgroundColor: "#f8fafc", borderRadius: "var(--radius-lg)", border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--color-text-primary)", marginBottom: "12px" }}>
            {editingRemark ? "Edit Academic Remark" : "New Academic Remark"}
          </div>

          <form onSubmit={handleSave}>
            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label className="form-label">Observation / Feedback</label>
              <textarea
                required
                className="form-control"
                rows={3}
                placeholder="Write feedback, behavior notes, or academic observations for this student..."
                value={formData.remark_text}
                onChange={(e) => setFormData({ ...formData, remark_text: e.target.value })}
                style={{ resize: "vertical", fontSize: "0.875rem" }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label className="form-label">Visibility Setting</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div
                  onClick={() => setFormData({ ...formData, visibility: "PRIVATE" })}
                  style={{
                    padding: "9px 12px",
                    border: `1.5px solid ${formData.visibility === "PRIVATE" ? "var(--color-primary)" : "var(--color-border)"}`,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: formData.visibility === "PRIVATE" ? "var(--color-primary-light)" : "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>Private Note</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", marginTop: "2px" }}>Only you and teachers can view</div>
                </div>
                <div
                  onClick={() => setFormData({ ...formData, visibility: "STUDENT_VISIBLE" })}
                  style={{
                    padding: "9px 12px",
                    border: `1.5px solid ${formData.visibility === "STUDENT_VISIBLE" ? "var(--color-primary)" : "var(--color-border)"}`,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: formData.visibility === "STUDENT_VISIBLE" ? "var(--color-primary-light)" : "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>Student Visible</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", marginTop: "2px" }}>Student can read on their portal</div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting} style={{ minWidth: "90px" }}>
                {isSubmitting ? "Saving..." : editingRemark ? "Update Remark" : "Post Remark"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleOpenAddForm} className="btn btn-primary btn-sm" style={{ fontWeight: 600, padding: "8px 16px" }}>
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
      <div className="page-header">
        <Link to="/teacher/courses" style={{ fontSize: "0.82rem", color: "var(--color-primary)", fontWeight: 600, textDecoration: "none", marginBottom: "4px", display: "inline-block" }}>
          ← Back to My Classes
        </Link>
        <h2>{courseName}{courseCode ? ` (${courseCode})` : ""}</h2>
        <p>{sectionName ? `Section ${sectionName} · ` : ""}Students enrolled in this class</p>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Unable to load students for this class.
        </div>
      ) : (
        <>
          <div className="content-card" style={{ marginBottom: "18px", padding: "12px 20px", display: "flex", justifyContent: "flex-end" }}>
            <span className="badge" style={{ backgroundColor: "var(--color-primary-light)", color: "var(--color-primary)", fontWeight: 700, padding: "5px 12px", fontSize: "0.78rem" }}>
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
                          className="btn btn-sm btn-subtle-primary"
                          style={{ fontWeight: 600, padding: "4px 11px", fontSize: "0.78rem" }}
                          title="View or add remarks for this student"
                        >
                          Remarks
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
