import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyAssignments, getStudentAssignmentDetail, requestSubmissionUploadUrl, confirmSubmission } from "../../services/entities";
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

// Detail + upload for one assignment. Fetches fresh (rather than reusing the
// list row) so submission status reflects the very latest state.
function AssignmentDetailModal({ assignmentId, onClose, onSubmitted }: { assignmentId: number; onClose: () => void; onSubmitted: () => void }) {
  const { showToast } = useToast();
  const [assignment, setAssignment] = useState<AssignmentStudentListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    getStudentAssignmentDetail(assignmentId)
      .then(setAssignment)
      .catch(err => showToast(err instanceof Error ? err.message : "Failed to load assignment.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const { upload_url, key, content_type } = await requestSubmissionUploadUrl(assignmentId, file.type);
      const s3Response = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": content_type }, body: file });
      if (!s3Response.ok) throw new Error("Failed to upload submission. Please try again.");

      await confirmSubmission(assignmentId, key);
      showToast("Submission uploaded successfully.", "success");
      load();
      onSubmitted();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to upload submission.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen title={assignment?.title || "Assignment"} onClose={onClose}>
      {loading || !assignment ? (
        <div style={{ padding: "16px", textAlign: "center" }}>Loading...</div>
      ) : (
        <>
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

            <label className="btn btn-primary" style={{ display: "inline-block", cursor: uploading ? "not-allowed" : "pointer" }}>
              {uploading ? "Uploading..." : assignment.status === "SUBMITTED" ? "Replace Submission" : "Upload Submission"}
              <input type="file" accept=".pdf,.doc,.docx,.zip" style={{ display: "none" }} disabled={uploading} onChange={handleFileSelected} />
            </label>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function StudentAssignments() {
  const user = getCurrentUser();

  const [assignments, setAssignments] = useState<AssignmentStudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [openAssignmentId, setOpenAssignmentId] = useState<number | null>(null);

  const loadAssignments = () => {
    getMyAssignments(1, 10)
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
  }, []);

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    getMyAssignments(page + 1, 10).then(r => {
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
        <h2>My Assignments</h2>
        <p>Assignments from your enrolled classes</p>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Student record not found.
        </div>
      ) : (
        <>
          <div className="table-responsive content-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Course</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: "24px" }}>No assignments yet.</td></tr>
                ) : (
                  assignments.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.title}</strong></td>
                      <td>{a.course_name} ({a.course_code})</td>
                      <td>{formatDate(a.due_at)}</td>
                      <td>
                        <span className={`badge ${a.status === "SUBMITTED" ? "badge-success" : "badge-warning"}`}>
                          {a.status === "SUBMITTED" ? "Submitted" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => setOpenAssignmentId(a.id)} className="btn btn-outline" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
                          View Assignment
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {page < totalPages && (
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}

          {openAssignmentId !== null && (
            <AssignmentDetailModal
              assignmentId={openAssignmentId}
              onClose={() => setOpenAssignmentId(null)}
              onSubmitted={loadAssignments}
            />
          )}
        </>
      )}
    </>
  );
}
