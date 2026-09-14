import { useState } from "react";
import { Modal } from "../common/Modal";
import { reviewAssignmentEvaluation } from "../../services/entities";
import { useToast } from "../../context/ToastContext";
import type { AssignmentEvaluation, AssignmentEvaluationConfidence } from "../../types/user";

interface AssignmentEvaluationModalProps {
  assignmentId: number;
  assignmentTitle: string;
  studentId: number;
  studentName: string;
  loading: boolean;
  error: string | null;
  evaluation: AssignmentEvaluation | null;
  onClose: () => void;
  onEvaluationUpdated: (evaluation: AssignmentEvaluation) => void;
}

const CONFIDENCE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  high: { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
  medium: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  low: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
};

function ConfidenceBadge({ confidence }: { confidence: AssignmentEvaluationConfidence }) {
  if (!confidence) return null;
  const style = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES.medium;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px",
        borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, textTransform: "capitalize",
        backgroundColor: style.bg, color: style.color, border: `1px solid ${style.border}`,
      }}
    >
      {confidence} confidence
    </span>
  );
}

function ScoreDial({ score, size = 88 }: { score: number | null; size?: number }) {
  if (score === null) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "#f1f5f9", color: "var(--color-text-secondary)", fontSize: "0.75rem", fontWeight: 600, textAlign: "center",
      }}>
        N/A
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 70 ? "#059669" : pct >= 40 ? "#d97706" : "#dc2626";
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        background: `conic-gradient(${color} ${pct * 3.6}deg, #e5e7eb 0deg)`, flexShrink: 0,
      }}
    >
      <div style={{
        width: size - 14, height: size - 14, borderRadius: "50%", backgroundColor: "#fff",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-text-primary)", lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: "0.65rem", color: "var(--color-text-secondary)" }}>/ 100</span>
      </div>
    </div>
  );
}

export function AssignmentEvaluationModal({
  assignmentId, assignmentTitle, studentId, studentName, loading, error, evaluation, onClose, onEvaluationUpdated,
}: AssignmentEvaluationModalProps) {
  const { showToast } = useToast();
  const [finalScore, setFinalScore] = useState<string>(evaluation?.final_score != null ? String(evaluation.final_score) : (evaluation?.suggested_score != null ? String(evaluation.suggested_score) : ""));
  const [teacherFeedback, setTeacherFeedback] = useState<string>(evaluation?.teacher_feedback || "");
  const [reviewing, setReviewing] = useState<"approve" | "reject" | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const alreadyDecided = evaluation && evaluation.status !== "AI_SUGGESTED";

  const submitReview = async (status: "APPROVED" | "REJECTED") => {
    if (!evaluation || reviewing) return;
    setReviewError(null);

    let scoreValue: number | null = null;
    if (finalScore.trim() !== "") {
      const parsed = Number(finalScore);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
        setReviewError("Score must be a whole number between 0 and 100.");
        return;
      }
      scoreValue = parsed;
    }

    if (status === "APPROVED" && scoreValue === null) {
      setReviewError("Please enter a final score before approving.");
      return;
    }

    setReviewing(status === "APPROVED" ? "approve" : "reject");
    try {
      const effectiveStatus = status === "APPROVED" && scoreValue !== evaluation.suggested_score ? "EDITED" : status;
      const updated = await reviewAssignmentEvaluation(assignmentId, studentId, {
        status: effectiveStatus,
        final_score: scoreValue,
        teacher_feedback: teacherFeedback,
      });
      onEvaluationUpdated(updated);
      showToast(status === "APPROVED" ? "Evaluation approved." : "Evaluation rejected.", "success");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to save the review.");
    } finally {
      setReviewing(null);
    }
  };

  const header = (
    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "1.2rem" }}>🤖</span>
      AI Assignment Evaluation
    </span>
  );

  return (
    <Modal isOpen title={header} onClose={onClose} maxWidth="720px">
      <div style={{ marginTop: "-10px" }}>
        <p style={{ margin: "0 0 18px", fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
          {studentName} &middot; {assignmentTitle}
        </p>

        {loading && (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "10px" }}>🤖</div>
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>Analyzing submission...</div>
            <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>This can take a few seconds. Please wait.</div>
          </div>
        )}

        {!loading && error && (
          <div style={{
            padding: "18px", borderRadius: "10px", backgroundColor: "var(--color-danger-bg)",
            border: "1px solid rgba(239, 68, 68, 0.25)", color: "var(--color-danger)", fontSize: "0.88rem",
          }}>
            {error}
          </div>
        )}

        {!loading && !error && evaluation && (
          <>
            {/* AI-generated section */}
            <div style={{
              border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "12px", padding: "18px",
              backgroundColor: "rgba(99, 102, 241, 0.04)", marginBottom: "16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#4f46e5" }}>
                  AI Suggestion &middot; Not Final
                </span>
                <ConfidenceBadge confidence={evaluation.confidence} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                <ScoreDial score={evaluation.suggested_score} />
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "2px" }}>AI Suggested Score</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                    This is a starting point for your review, not the recorded grade.
                  </div>
                </div>
              </div>

              {evaluation.strengths.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#065f46", marginBottom: "6px" }}>✓ Strengths</div>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.85rem", color: "var(--color-text-primary)" }}>
                    {evaluation.strengths.map((s, i) => <li key={i} style={{ marginBottom: "3px" }}>{s}</li>)}
                  </ul>
                </div>
              )}

              {evaluation.weaknesses.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#92400e", marginBottom: "6px" }}>⚠ Areas for Improvement</div>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.85rem", color: "var(--color-text-primary)" }}>
                    {evaluation.weaknesses.map((w, i) => <li key={i} style={{ marginBottom: "3px" }}>{w}</li>)}
                  </ul>
                </div>
              )}

              {evaluation.ai_feedback && (
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "6px" }}>AI Feedback</div>
                  <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.55, color: "var(--color-text-primary)" }}>
                    {evaluation.ai_feedback}
                  </p>
                </div>
              )}
            </div>

            {/* Teacher-controlled section */}
            <div style={{
              border: "1px solid var(--color-border)", borderRadius: "12px", padding: "18px", backgroundColor: "#fff",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-primary)" }}>
                  Teacher Review
                </span>
                {alreadyDecided && (
                  <span className={`badge ${evaluation.status === "REJECTED" ? "badge-danger" : "badge-success"}`}>
                    {evaluation.status === "APPROVED" ? "Approved" : evaluation.status === "EDITED" ? "Edited & Approved" : "Rejected"}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Final Score</label>
                <input
                  type="number" min={0} max={100} className="form-control" style={{ maxWidth: "140px" }}
                  placeholder="e.g. 82" value={finalScore}
                  onChange={e => setFinalScore(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Teacher Feedback (optional)</label>
                <textarea
                  className="form-control" rows={3} placeholder="Add your own notes for the student..."
                  value={teacherFeedback} onChange={e => setTeacherFeedback(e.target.value)}
                />
              </div>

              {reviewError && (
                <div style={{ color: "var(--color-danger)", fontSize: "0.82rem", marginBottom: "10px" }}>{reviewError}</div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button" className="btn btn-outline" disabled={reviewing !== null}
                  onClick={() => submitReview("REJECTED")}
                >
                  {reviewing === "reject" ? "Rejecting..." : "Reject"}
                </button>
                <button
                  type="button" className="btn btn-primary" disabled={reviewing !== null}
                  onClick={() => submitReview("APPROVED")}
                >
                  {reviewing === "approve" ? "Saving..." : "Approve / Save"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
