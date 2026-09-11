import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyTeacherStudents, getCourseOfferingReference, getRemarksForStudentInOffering, remarkService } from "../../services/entities";
import { Avatar } from "../../components/common/Avatar";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { useToast } from "../../context/ToastContext";
import type { EnrollmentTeacherListItem, CourseOfferingReference, RemarkTeacherListItem, RemarkVisibility } from "../../types/user";

// The Remarks modal for one student+class: their remark history plus an
// inline Add Remark form. Kept in this file (not a separate page/route) -
// Remarks is an action on a student row, not a standalone workflow.
function RemarksModal({ enrollment, onClose }: { enrollment: EnrollmentTeacherListItem; onClose: () => void }) {
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
    getRemarksForStudentInOffering(enrollment.student_id, enrollment.course_offering_id)
      .then(r => setRemarks(r.results))
      .catch(err => showToast(err instanceof Error ? err.message : "Failed to load remarks.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRemarks();
    // Only ever runs for the (fixed) student/offering this modal was opened
    // for - re-running on every render would refetch on every keystroke in
    // the form below.
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
        // The POST body needs student/course_offering (the backend requires
        // them), but the response type (RemarkTeacherListItem) doesn't carry
        // them back - same request/response shape mismatch as
        // TeacherAttendance's handleSave.
        await remarkService.create({
          student: enrollment.student_id,
          course_offering: enrollment.course_offering_id,
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

  // UI-only convenience - the backend is the real enforcer of who may edit
  // or delete a given remark (see remarks/api/remark_api.py ownership check).
  const isOwnRemark = (remark: RemarkTeacherListItem) => remark.teacher === user?.teacher_id;

  return (
    <Modal isOpen title={`Student Remarks - ${enrollment.student_name}`} onClose={onClose}>
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
            {enrollment.course_name}
          </span>
          <span className="badge" style={{ backgroundColor: "var(--color-primary-light)", color: "var(--color-primary)", fontSize: "0.72rem", padding: "2px 8px" }}>
            {enrollment.course_code}
          </span>
        </div>
        <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
          {remarks.length} {remarks.length === 1 ? "Remark" : "Remarks"}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: "24px", textAlign: "center", color: "var(--color-text-secondary)" }}>Loading remarks...</div>
      ) : remarks.length === 0 ? (
        <div style={{
          padding: "32px 16px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px"
        }}>
          <div style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            backgroundColor: "#f1f5f9",
            color: "var(--color-text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.95rem" }}>
            No remarks recorded yet
          </div>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.82rem", margin: 0, maxWidth: "300px" }}>
            Add academic feedback, observations, or private performance notes for {enrollment.student_name}.
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
                  <div style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    backgroundColor: "var(--color-primary-light)",
                    color: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>

                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {new Date(r.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </span>

                  {r.visibility === "STUDENT_VISIBLE" ? (
                    <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", padding: "2px 8px" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Visible to Student
                    </span>
                  ) : (
                    <span className="badge badge-warning" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", padding: "2px 8px" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Private Note
                    </span>
                  )}
                </div>

                {isOwnRemark(r) && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      onClick={() => handleOpenEditForm(r)}
                      className="btn btn-sm btn-secondary"
                      style={{ padding: "3px 8px", fontSize: "0.74rem", gap: "4px" }}
                      title="Edit Remark"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(r)}
                      className="btn btn-sm btn-subtle-danger"
                      style={{ padding: "3px 8px", fontSize: "0.74rem", gap: "4px" }}
                      title="Delete Remark"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
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
        <div style={{
          marginTop: "18px",
          padding: "16px",
          backgroundColor: "#f8fafc",
          borderRadius: "var(--radius-lg)",
          border: "1px solid #e2e8f0"
        }}>
          <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--color-text-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-primary)" }}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            {editingRemark ? "Edit Academic Remark" : "New Academic Remark"}
          </div>

          <form onSubmit={handleSave}>
            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                Observation / Feedback
              </label>
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
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                Visibility Setting
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div
                  onClick={() => setFormData({ ...formData, visibility: "PRIVATE" })}
                  style={{
                    padding: "9px 12px",
                    border: `1.5px solid ${formData.visibility === "PRIVATE" ? "var(--color-primary)" : "var(--color-border)"}`,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: formData.visibility === "PRIVATE" ? "var(--color-primary-light)" : "#ffffff",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)"
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.82rem", color: formData.visibility === "PRIVATE" ? "var(--color-primary)" : "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Private Note
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                    Only you and teachers can view
                  </div>
                </div>

                <div
                  onClick={() => setFormData({ ...formData, visibility: "STUDENT_VISIBLE" })}
                  style={{
                    padding: "9px 12px",
                    border: `1.5px solid ${formData.visibility === "STUDENT_VISIBLE" ? "var(--color-primary)" : "var(--color-border)"}`,
                    borderRadius: "var(--radius-md)",
                    backgroundColor: formData.visibility === "STUDENT_VISIBLE" ? "var(--color-primary-light)" : "#ffffff",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)"
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.82rem", color: formData.visibility === "STUDENT_VISIBLE" ? "var(--color-primary)" : "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Student Visible
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                    Student can read on their portal
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting} style={{ minWidth: "90px" }}>
                {isSubmitting ? "Saving..." : editingRemark ? "Update Remark" : "Post Remark"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleOpenAddForm}
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 600, padding: "8px 16px", boxShadow: "0 2px 4px rgba(30, 58, 138, 0.2)", gap: "6px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Remark
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

export default function TeacherStudents() {
  const user = getCurrentUser();

  const [offerings, setOfferings] = useState<CourseOfferingReference[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentTeacherListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState("all");

  const [remarksFor, setRemarksFor] = useState<EnrollmentTeacherListItem | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getCourseOfferingReference(1, 10)
      .then(o => setOfferings(o.results))
      .catch(() => setNotFound(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch scoped to the selected class whenever the filter changes - a
  // class's own roster, or the teacher's full cross-class list on "All
  // Classes", each loaded page by page rather than assumed to fit on page 1.
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const courseOfferingId = courseFilter === "all" ? undefined : Number(courseFilter);

    getMyTeacherStudents(1, 10, courseOfferingId).then(e => {
      setEnrollments(e.results);
      setPage(e.current_page);
      setTotalPages(e.total_pages);
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseFilter]);

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const courseOfferingId = courseFilter === "all" ? undefined : Number(courseFilter);

    getMyTeacherStudents(nextPage, 10, courseOfferingId).then(e => {
      setEnrollments(prev => [...prev, ...e.results]);
      setPage(e.current_page);
      setTotalPages(e.total_pages);
    }).finally(() => setLoadingMore(false));
  };

  const getCourseLabel = (offering: CourseOfferingReference) =>
    `${offering.course_name || "Unknown Course"} (${offering.course_code || "---"}) - ${offering.section_name || "No Section"}`;

  if (loading && enrollments.length === 0) {
    return <><div style={{ padding: "40px", textAlign: "center" }}>Loading students...</div></>;
  }

  return (
    <>
      <div className="page-header">
        <h2>My Students</h2>
        <p>Students enrolled in your classes</p>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Teacher record not found.
        </div>
      ) : (
        <>
          <div className="content-card" style={{ marginBottom: "18px", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 300px", maxWidth: "440px" }}>
              <label style={{ fontWeight: 600, fontSize: "0.84rem", color: "var(--color-text-secondary)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filter by Class:
              </label>
              <select
                className="form-control"
                value={courseFilter}
                onChange={e => setCourseFilter(e.target.value)}
                style={{ fontWeight: 500, backgroundColor: "#ffffff", padding: "7px 10px", fontSize: "0.84rem" }}
              >
                <option value="all">All Classes</option>
                {offerings.map(o => (
                  <option key={o.id} value={o.id}>{getCourseLabel(o)}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="badge" style={{ backgroundColor: "var(--color-primary-light)", color: "var(--color-primary)", fontWeight: 700, padding: "5px 12px", fontSize: "0.78rem" }}>
                {enrollments.length} {enrollments.length === 1 ? "Student" : "Students"} Enrolled
              </span>
            </div>
          </div>

          <div className="table-responsive content-card" style={{ boxShadow: "var(--shadow-sm)" }}>
            <table className="data-table table-compact" style={{ minWidth: "750px" }}>
              <colgroup>
                <col style={{ width: "24%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Class</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "32px 20px", color: "var(--color-text-secondary)" }}>
                      No students found for this selection.
                    </td>
                  </tr>
                ) : (
                  enrollments.map(e => (
                    <tr key={e.enrollment_id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <Avatar src={e.profile_picture_url} name={e.student_name} size={28} />
                          <span style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.875rem" }}>
                            {e.student_name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-secondary)", fontSize: "0.84rem" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                          <span>{e.student_email}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.84rem", color: "var(--color-text-primary)" }}>
                          {e.course_name} ({e.course_code}) - {e.section_name || "No Section"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${
                          e.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'
                        }`} style={{ padding: "3px 8px", fontSize: "0.72rem" }}>
                          {e.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => setRemarksFor(e)}
                          className="btn btn-sm btn-subtle-primary"
                          style={{
                            fontWeight: 600,
                            padding: "4px 11px",
                            fontSize: "0.78rem",
                            borderRadius: "var(--radius-md)",
                            boxShadow: "var(--shadow-sm)",
                            gap: "5px"
                          }}
                          title="View or add remarks for this student"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
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

          {remarksFor && <RemarksModal enrollment={remarksFor} onClose={() => setRemarksFor(null)} />}
        </>
      )}
    </>
  );
}
