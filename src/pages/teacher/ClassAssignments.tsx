import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";
import {
  getTeacherAssignments, assignmentService,
  requestAssignmentAttachmentUploadUrl, confirmAssignmentAttachment, getAssignmentSubmissions,
  runAssignmentAiCheck,
} from "../../services/entities";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { AssignmentEvaluationModal } from "../../components/assignments/AssignmentEvaluationModal";
import { useToast } from "../../context/ToastContext";
import type { AssignmentTeacherListItem, AssignmentTeacherDetail, SubmissionRosterItem, AssignmentEvaluation } from "../../types/user";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB, matches backend MAX_ASSIGNMENT_FILE_SIZE_BYTES
const ALLOWED_TYPES = [
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip", "application/x-zip-compressed",
];

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Please choose a PDF, DOC, DOCX or ZIP file.";
  if (file.size > MAX_FILE_SIZE_BYTES) return "File must be 20 MB or smaller.";
  return null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// datetime-local expects "YYYY-MM-DDTHH:mm" in local time, not an ISO string.
function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// The submissions roster for one assignment - "who submitted, who hasn't".
// Backend-paginated (page_size=10) - only the current page's rows are ever
// fetched, never the whole class roster in one call.
function SubmissionsModal({ assignment, onClose }: { assignment: AssignmentTeacherListItem; onClose: () => void }) {
  const [roster, setRoster] = useState<SubmissionRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // AI Check: which student's evaluation modal is open, plus that request's
  // own loading/error/result state - kept separate from the roster's own
  // loading state since it's a per-row action, not a page reload.
  const [aiCheckTarget, setAiCheckTarget] = useState<{ studentId: number; studentName: string } | null>(null);
  const [aiCheckLoading, setAiCheckLoading] = useState(false);
  const [aiCheckError, setAiCheckError] = useState<string | null>(null);
  const [aiCheckEvaluation, setAiCheckEvaluation] = useState<AssignmentEvaluation | null>(null);
  const [runningStudentId, setRunningStudentId] = useState<number | null>(null);

  const loadPage = (pageNumber: number) => {
    setLoading(true);
    getAssignmentSubmissions(assignment.id, pageNumber)
      .then(r => {
        setRoster(r.results);
        setPage(r.current_page);
        setTotalPages(r.total_pages);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    getAssignmentSubmissions(assignment.id, 1)
      .then(r => {
        if (!active) return;
        setRoster(r.results);
        setPage(r.current_page);
        setTotalPages(r.total_pages);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [assignment.id]);

  const handleAiCheck = async (studentId: number, studentName: string) => {
    if (runningStudentId !== null) return;
    setRunningStudentId(studentId);
    setAiCheckTarget({ studentId, studentName });
    setAiCheckLoading(true);
    setAiCheckError(null);
    setAiCheckEvaluation(null);
    try {
      const evaluation = await runAssignmentAiCheck(assignment.id, studentId);
      setAiCheckEvaluation(evaluation);
    } catch (err) {
      setAiCheckError(err instanceof Error ? err.message : "AI evaluation couldn't be completed right now. Please try again.");
    } finally {
      setAiCheckLoading(false);
      setRunningStudentId(null);
    }
  };

  const closeAiCheckModal = () => {
    setAiCheckTarget(null);
    setAiCheckEvaluation(null);
    setAiCheckError(null);
  };

  const submittedCount = roster.filter(r => r.status === "SUBMITTED").length;
  const pendingCount = roster.filter(r => r.status !== "SUBMITTED").length;

  return (
    <Modal isOpen title={`Submissions — ${assignment.title}`} onClose={onClose} maxWidth="860px">
      {loading ? (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Loading submissions...
        </div>
      ) : (
        <>
          <div className="submissions-summary-strip">
            <div className="submissions-summary-item">
              <span>Class Size:</span>
              <strong>{roster.length}</strong>
            </div>
            <div className="submissions-summary-divider" />
            <div className="submissions-summary-item">
              <span className="status-dot-submitted" />
              <span>Submitted:</span>
              <strong style={{ color: "var(--color-success-text)" }}>{submittedCount}</strong>
            </div>
            <div className="submissions-summary-divider" />
            <div className="submissions-summary-item">
              <span className="status-dot-pending" />
              <span>Pending:</span>
              <strong style={{ color: "var(--color-warning-text)" }}>{pendingCount}</strong>
            </div>
          </div>

          <div className="table-responsive" style={{ border: "1px solid var(--color-border)", borderRadius: "10px", overflow: "hidden" }}>
            <table className="submissions-table">
              <thead>
                <tr>
                  <th style={{ width: "26%" }}>Student</th>
                  <th style={{ width: "16%" }}>Status</th>
                  <th style={{ width: "18%" }}>Submitted</th>
                  <th style={{ width: "20%" }}>File</th>
                  <th style={{ width: "20%", textAlign: "right" }}>AI Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {roster.map(r => (
                  <tr key={r.student_id}>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {r.student_name}
                      </span>
                    </td>
                    <td>
                      {r.status === "SUBMITTED" ? (
                        <span className="status-oval-submitted">
                          <span className="status-dot-submitted" />
                          Submitted
                        </span>
                      ) : (
                        <span className="status-oval-pending">
                          <span className="status-dot-pending" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td>
                      {r.submitted_at ? (
                        <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                          {formatDate(r.submitted_at)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
                      )}
                    </td>
                    <td>
                      {r.file_url ? (
                        <a href={r.file_url} target="_blank" rel="noreferrer" className="btn-file-link">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          View / Download
                        </a>
                      ) : (
                        <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {r.status === "SUBMITTED" ? (
                        <button
                          type="button"
                          className="btn-ai-action"
                          disabled={runningStudentId !== null}
                          onClick={() => handleAiCheck(r.student_id, r.student_name)}
                        >
                          {runningStudentId === r.student_id ? (
                            <>
                              <span className="ai-check-spinner" />
                              <span>Checking...</span>
                            </>
                          ) : (
                            <>
                              <span>🤖</span>
                              <span>AI Check</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span style={{ color: "var(--color-text-tertiary)", display: "inline-block", paddingRight: "16px" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "16px" }}>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page <= 1}
                onClick={() => loadPage(page - 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)" }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page >= totalPages}
                onClick={() => loadPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {aiCheckTarget && (
        <AssignmentEvaluationModal
          assignmentId={assignment.id}
          assignmentTitle={assignment.title}
          studentId={aiCheckTarget.studentId}
          studentName={aiCheckTarget.studentName}
          loading={aiCheckLoading}
          error={aiCheckError}
          evaluation={aiCheckEvaluation}
          onClose={closeAiCheckModal}
          onEvaluationUpdated={setAiCheckEvaluation}
        />
      )}
    </Modal>
  );
}

export default function TeacherClassAssignments() {
  const { courseOfferingId } = useParams<{ courseOfferingId: string }>();
  const offeringId = Number(courseOfferingId);
  const user = getCurrentUser();
  const { showToast } = useToast();

  const [offeringLabel, setOfferingLabel] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AssignmentTeacherListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentTeacherDetail | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AssignmentTeacherListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<AssignmentTeacherListItem | null>(null);

  const [formData, setFormData] = useState({ title: "", description: "", due_at: "" });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // One request serves the whole page: the assignment rows, plus the small
  // `course` summary the header needs. Deriving the header from the same
  // response (rather than a separate course-list call) also means a direct
  // refresh of this URL works with no extra requests.
  const loadAssignments = () => {
    setLoading(true);
    getTeacherAssignments(offeringId)
      .then(r => {
        setAssignments(r.results);
        if (r.course) {
          setOfferingLabel(`${r.course.course_name} (${r.course.course_code}) - ${r.course.section_name || "No Section"}`);
        }
      })
      .catch(err => showToast(err instanceof Error ? err.message : "Failed to load assignments.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    getTeacherAssignments(offeringId)
      .then(r => {
        if (!active) return;
        setAssignments(r.results);
        if (r.course) {
          setOfferingLabel(`${r.course.course_name} (${r.course.course_code}) - ${r.course.section_name || "No Section"}`);
        }
      })
      .catch(err => {
        if (active) showToast(err instanceof Error ? err.message : "Failed to load assignments.", "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeringId]);

  const handleOpenAddModal = () => {
    setEditingAssignment(null);
    setFormData({ title: "", description: "", due_at: "" });
    setAttachmentFile(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (row: AssignmentTeacherListItem) => {
    try {
      const detail = await assignmentService.getById(row.id);
      setEditingAssignment(detail);
      setFormData({ title: detail.title, description: detail.description, due_at: toDatetimeLocalValue(detail.due_at) });
      setAttachmentFile(null);
      setIsModalOpen(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load assignment.", "error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        showToast(validationError, "error");
        e.target.value = "";
        return;
      }
    }
    setAttachmentFile(file);
  };

  const uploadAttachmentIfAny = async (assignmentId: number) => {
    if (!attachmentFile) return;

    const { upload_url, key, content_type } = await requestAssignmentAttachmentUploadUrl(assignmentId, attachmentFile.type);
    const s3Response = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": content_type }, body: attachmentFile });
    if (!s3Response.ok) throw new Error("Failed to upload attachment. Please try again.");
    await confirmAssignmentAttachment(assignmentId, key);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.title.trim()) {
      showToast("Title is required.", "error");
      return;
    }
    if (!formData.due_at) {
      showToast("Due date is required.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAssignment) {
        await assignmentService.update(editingAssignment.id, {
          title: formData.title,
          description: formData.description,
          due_at: new Date(formData.due_at).toISOString(),
        });
        await uploadAttachmentIfAny(editingAssignment.id);
        showToast("Assignment updated successfully.", "success");
      } else {
        const created = await assignmentService.create({
          course_offering: offeringId,
          title: formData.title,
          description: formData.description,
          due_at: new Date(formData.due_at).toISOString(),
        } as unknown as Partial<AssignmentTeacherDetail>);
        await uploadAttachmentIfAny(created.id);
        showToast("Assignment created successfully.", "success");
      }
      setIsModalOpen(false);
      loadAssignments();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to save assignment.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || isDeleting) return;
    setIsDeleting(true);
    try {
      await assignmentService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      showToast("Assignment deleted successfully.", "success");
      loadAssignments();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to delete assignment.", "error");
      setDeleteConfirm(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <><div style={{ padding: "40px", textAlign: "center" }}>Loading assignments...</div></>;
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

      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h2 style={{ margin: 0 }}>Assignments</h2>
            <span className="badge" style={{ backgroundColor: "var(--color-primary-light)", color: "var(--color-primary)", fontWeight: 700 }}>
              {assignments.length} {assignments.length === 1 ? "Assignment" : "Assignments"}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--color-text-secondary)" }}>
            {offeringLabel || "Assignments for this class"}
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="btn btn-primary"
          style={{ fontWeight: 600, padding: "9px 18px", boxShadow: "0 2px 6px rgba(30, 58, 138, 0.25)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Assignment
        </button>
      </div>

      <div className="table-responsive content-card" style={{ boxShadow: "var(--shadow-sm)" }}>
        <table className="data-table" style={{ minWidth: "750px" }}>
          <colgroup>
            <col style={{ width: "32%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "22%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Title</th>
              <th>Due Date</th>
              <th style={{ textAlign: "center" }}>Submitted</th>
              <th style={{ textAlign: "center" }}>Pending</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "48px 24px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-surface-hover)",
                      color: "var(--color-text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "1rem" }}>
                      No assignments created yet
                    </div>
                    <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: "0.875rem" }}>
                      Get started by creating the first assignment for this class.
                    </p>
                    <button onClick={handleOpenAddModal} className="btn btn-primary btn-sm" style={{ marginTop: "6px" }}>
                      + Create Assignment
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              assignments.map(a => (
                <tr key={a.id}>
                  <td>
                    <div className="assignment-title-cell">
                      <div className="assignment-icon-badge">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.95rem" }}>
                          {a.title}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-primary)", fontSize: "0.875rem" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{formatDate(a.due_at)}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="count-badge count-badge-success">
                      {a.submitted_count}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="count-badge count-badge-pending">
                      {a.pending_count}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="assignments-action-group">
                      <button
                        onClick={() => setViewingSubmissionsFor(a)}
                        className="btn btn-sm btn-subtle-primary"
                        title="View Submissions"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>Submissions</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(a)}
                        className="btn btn-sm btn-secondary"
                        title="Edit Assignment"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(a)}
                        className="btn btn-sm btn-subtle-danger"
                        title="Delete Assignment"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} title={editingAssignment ? "Edit Assignment" : "Create Assignment"} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input required className="form-control" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Description / Instructions</label>
            <textarea className="form-control" rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input required type="datetime-local" className="form-control" value={formData.due_at} onChange={e => setFormData({ ...formData, due_at: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Attachment (optional)</label>
            <input type="file" accept=".pdf,.doc,.docx,.zip" className="form-control" onChange={handleFileChange} />
            {editingAssignment?.attachment_url && !attachmentFile && (
              <div style={{ marginTop: "6px", fontSize: "0.85rem" }}>
                <a href={editingAssignment.attachment_url} target="_blank" rel="noreferrer">Current attachment</a>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>

      {viewingSubmissionsFor && (
        <SubmissionsModal assignment={viewingSubmissionsFor} onClose={() => setViewingSubmissionsFor(null)} />
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Assignment"
        message="Are you sure you want to delete this assignment? This will also remove any student submissions."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        confirmDisabled={isDeleting}
      />
    </>
  );
}
