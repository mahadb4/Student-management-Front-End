import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";
import { getMyAssignments, requestSubmissionUploadUrl, confirmSubmission } from "../../services/entities";
import { Modal } from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import type { AssignmentStudentListItem } from "../../types/user";

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

// Detail + upload for one assignment. Seeded from the already-fetched list
// row (same fields the detail endpoint would return) so opening the modal
// makes no network request; local state is patched from the confirm
// response after a successful upload instead of re-fetching.
function AssignmentDetailModal({ assignment: initialAssignment, onClose, onSubmitted }: {
  assignment: AssignmentStudentListItem;
  onClose: () => void;
  onSubmitted: (updated: AssignmentStudentListItem) => void;
}) {
  const { showToast } = useToast();
  const [assignment, setAssignment] = useState<AssignmentStudentListItem>(initialAssignment);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading) return;

    const validationError = validateFile(file);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    setUploading(true);
    try {
      const { upload_url, key, content_type } = await requestSubmissionUploadUrl(assignment.id, file.type);
      const s3Response = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": content_type }, body: file });
      if (!s3Response.ok) throw new Error("Failed to upload submission. Please try again.");

      const confirmed = await confirmSubmission(assignment.id, key);
      const updated: AssignmentStudentListItem = {
        ...assignment,
        status: confirmed.status,
        submitted_at: confirmed.submitted_at,
      };
      setAssignment(updated);
      setFileUrl(confirmed.file_url);
      showToast("Submission uploaded successfully.", "success");
      onSubmitted(updated);
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to upload submission.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen title={assignment.title || "Assignment"} onClose={onClose}>
      <p style={{ color: "var(--color-text-secondary)", marginTop: 0 }}>{assignment.course_name} ({assignment.course_code})</p>

      {assignment.description && (
        <div style={{ marginBottom: "16px" }}>
          <div className="form-label">Instructions</div>
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{assignment.description}</p>
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <div className="form-label">Due Date</div>
        <div>{formatDate(assignment.due_at)}</div>
      </div>

      {assignment.attachment_url && (
        <div style={{ marginBottom: "16px" }}>
          <a href={assignment.attachment_url} target="_blank" rel="noreferrer">View assignment attachment</a>
        </div>
      )}

      <div className="content-card" style={{ padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span className={`badge ${assignment.status === "SUBMITTED" ? "badge-success" : "badge-warning"}`}>
            {assignment.status === "SUBMITTED" ? "Submitted" : "Pending"}
          </span>
          {assignment.submitted_at && (
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              Submitted on: {formatDate(assignment.submitted_at)}
            </span>
          )}
        </div>

        {fileUrl && (
          <div style={{ marginBottom: "12px" }}>
            <a href={fileUrl} target="_blank" rel="noreferrer">View submitted file</a>
          </div>
        )}

        <label className="btn btn-primary" style={{ display: "inline-block", cursor: uploading ? "not-allowed" : "pointer" }}>
          {uploading ? "Uploading..." : assignment.status === "SUBMITTED" ? "Replace Submission" : "Upload Submission"}
          <input type="file" accept=".pdf,.doc,.docx,.zip" style={{ display: "none" }} disabled={uploading} onChange={handleFileSelected} />
        </label>
      </div>
    </Modal>
  );
}

export default function StudentAssignments() {
  const user = getCurrentUser();
  const [searchParams] = useSearchParams();
  // Present when navigated here from a My Courses card ("Assignments" on one
  // specific course) - absent for the general "My Assignments" nav link,
  // which keeps showing everything across all enrolled classes as before.
  const courseOfferingParam = searchParams.get("course_offering");
  const courseOfferingId = courseOfferingParam ? Number(courseOfferingParam) : undefined;

  const [assignments, setAssignments] = useState<AssignmentStudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [openAssignment, setOpenAssignment] = useState<AssignmentStudentListItem | null>(null);

  const applyAssignmentUpdate = (updated: AssignmentStudentListItem) => {
    setAssignments(prev => prev.map(a => (a.id === updated.id ? updated : a)));
  };

  const loadAssignments = () => {
    setLoading(true);
    getMyAssignments(1, 10, courseOfferingId)
      .then(r => {
        setAssignments(r.results);
        setPage(r.current_page);
        setTotalPages(r.total_pages);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseOfferingId]);

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    getMyAssignments(page + 1, 10, courseOfferingId).then(r => {
      setAssignments(prev => [...prev, ...r.results]);
      setPage(r.current_page);
      setTotalPages(r.total_pages);
    }).finally(() => setLoadingMore(false));
  };

  if (loading) {
    return <><div style={{ padding: "40px", textAlign: "center" }}>Loading assignments...</div></>;
  }

  return (
    <>
      <div className="page-header">
        <h2>{courseOfferingId && assignments[0] ? `${assignments[0].course_name} - Assignments` : "My Assignments"}</h2>
        <p>{courseOfferingId ? "Assignments for this course" : "Assignments from your enrolled classes"}</p>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Student record not found.
        </div>
      ) : (
        <>
          <div className="table-responsive content-card" style={{ boxShadow: "var(--shadow-sm)" }}>
            <table className="data-table table-compact" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px 20px" }}>Assignment Title</th>
                  <th style={{ padding: "12px 20px" }}>Course</th>
                  <th style={{ padding: "12px 20px" }}>Due Date</th>
                  <th style={{ textAlign: "center", padding: "12px 20px" }}>Status</th>
                  <th style={{ textAlign: "right", padding: "12px 20px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "36px 20px", color: "var(--color-text-secondary)" }}>
                      No assignments posted yet.
                    </td>
                  </tr>
                ) : (
                  assignments.map(a => (
                    <tr key={a.id}>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            backgroundColor: "var(--color-primary-light)",
                            color: "var(--color-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                          </div>
                          <strong style={{ color: "var(--color-text-primary)", fontSize: "0.875rem" }}>{a.title}</strong>
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className="teacher-class-code-tag">{a.course_code}</span>
                          <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>{a.course_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          {formatDate(a.due_at)}
                        </div>
                      </td>
                      <td style={{ textAlign: "center", padding: "12px 20px" }}>
                        <span className={`badge ${a.status === "SUBMITTED" ? "badge-success" : "badge-warning"}`} style={{ padding: "4px 10px", fontSize: "0.74rem", fontWeight: 700 }}>
                          {a.status === "SUBMITTED" ? "Submitted" : "Pending"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", padding: "12px 20px" }}>
                        <button
                          type="button"
                          onClick={() => setOpenAssignment(a)}
                          className="btn btn-sm btn-subtle-primary"
                          style={{ padding: "6px 12px", fontSize: "0.78rem", fontWeight: 600 }}
                        >
                          {a.status === "SUBMITTED" ? "View Details" : "Submit"}
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
              <button className="btn btn-secondary btn-sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}

          {openAssignment !== null && (
            <AssignmentDetailModal
              assignment={openAssignment}
              onClose={() => setOpenAssignment(null)}
              onSubmitted={updated => {
                applyAssignmentUpdate(updated);
                setOpenAssignment(updated);
              }}
            />
          )}
        </>
      )}
    </>
  );
}
