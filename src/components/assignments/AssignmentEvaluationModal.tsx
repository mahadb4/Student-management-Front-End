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

const CONFIDENCE_STYLES: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  high: { bg: "var(--color-success-bg)", color: "var(--color-success-text)", border: "var(--color-success-border)", dot: "var(--color-success)" },
  medium: { bg: "var(--color-warning-bg)", color: "var(--color-warning-text)", border: "var(--color-warning-border)", dot: "var(--color-warning)" },
  low: { bg: "var(--color-danger-bg)", color: "var(--color-danger-text)", border: "var(--color-danger-border)", dot: "var(--color-danger)" },
};

function ConfidenceBadge({ confidence }: { confidence: AssignmentEvaluationConfidence }) {
  if (!confidence) return null;
  const style = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES.medium;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        borderRadius: "999px",
        fontSize: "0.75rem",
        fontWeight: 700,
        textTransform: "capitalize",
        letterSpacing: "0.02em",
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: style.dot,
        }}
      />
      {confidence} Confidence
    </span>
  );
}

function ScoreDial({ score, size = 88 }: { score: number | null; size?: number }) {
  if (score === null) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--color-surface-hover)",
          color: "var(--color-text-secondary)",
          fontSize: "0.75rem",
          fontWeight: 700,
          border: "2px dashed var(--color-border-strong)",
        }}
      >
        N/A
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 70 ? "var(--color-success)" : pct >= 40 ? "var(--color-warning)" : "var(--color-danger)";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `conic-gradient(${color} ${pct * 3.6}deg, var(--color-border) 0deg)`,
        flexShrink: 0,
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          width: size - 14,
          height: size - 14,
          borderRadius: "50%",
          backgroundColor: "var(--color-surface)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <span
          style={{
            fontSize: "1.45rem",
            fontWeight: 800,
            color: "var(--color-text-primary)",
            lineHeight: 1,
            letterSpacing: "-0.03em",
          }}
        >
          {score}
        </span>
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 600,
            color: "var(--color-text-secondary)",
            marginTop: "2px",
          }}
        >
          / 100
        </span>
      </div>
    </div>
  );
}

export function AssignmentEvaluationModal({
  assignmentId,
  assignmentTitle,
  studentId,
  studentName,
  loading,
  error,
  evaluation,
  onClose,
  onEvaluationUpdated,
}: AssignmentEvaluationModalProps) {
  const { showToast } = useToast();
  const [finalScore, setFinalScore] = useState<string>(
    evaluation?.final_score != null
      ? String(evaluation.final_score)
      : evaluation?.suggested_score != null
      ? String(evaluation.suggested_score)
      : ""
  );
  const [teacherFeedback, setTeacherFeedback] = useState<string>(
    evaluation?.teacher_feedback || ""
  );
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
      const effectiveStatus =
        status === "APPROVED" && scoreValue !== evaluation.suggested_score
          ? "EDITED"
          : status;
      const updated = await reviewAssignmentEvaluation(assignmentId, studentId, {
        status: effectiveStatus,
        final_score: scoreValue,
        teacher_feedback: teacherFeedback,
      });
      onEvaluationUpdated(updated);
      showToast(
        status === "APPROVED" ? "Evaluation approved." : "Evaluation rejected.",
        "success"
      );
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : "Failed to save the review."
      );
    } finally {
      setReviewing(null);
    }
  };

  const header = (
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
          fontSize: "1.15rem",
          boxShadow: "0 2px 6px rgba(15, 23, 42, 0.15)",
        }}
      >
        ✨
      </div>
      <div>
        <div
          style={{
            fontSize: "1.15rem",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            lineHeight: 1.2,
          }}
        >
          AI Assignment Evaluation
        </div>
        <div
          style={{
            fontSize: "0.78rem",
            color: "var(--color-text-secondary)",
            fontWeight: 500,
          }}
        >
          Automated analysis & instructor review
        </div>
      </div>
    </div>
  );

  return (
    <Modal isOpen title={header} onClose={onClose} maxWidth="740px">
      <div className="ai-eval-modal-container">
        {/* Student & Assignment Meta Banner */}
        <div className="ai-eval-header-meta">
          <span className="ai-eval-header-chip">{studentName}</span>
          <span>•</span>
          <span style={{ fontWeight: 500 }}>{assignmentTitle}</span>
        </div>

        {loading && (
          <div
            style={{
              padding: "54px 24px",
              textAlign: "center",
              background: "#fafbfc",
              borderRadius: "16px",
              border: "1px dashed var(--color-border-strong)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(99, 102, 241, 0.1)",
                color: "#4f46e5",
                fontSize: "1.8rem",
                marginBottom: "14px",
                animation: "pulse 1.5s infinite",
              }}
            >
              🤖
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "1.05rem",
                color: "var(--color-text-primary)",
                marginBottom: "6px",
              }}
            >
              Analyzing submission with AI...
            </div>
            <div
              style={{
                fontSize: "0.86rem",
                color: "var(--color-text-secondary)",
              }}
            >
              Evaluating content against assignment criteria. Please wait.
            </div>
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "12px",
              backgroundColor: "var(--color-danger-bg)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "var(--color-danger)",
              fontSize: "0.88rem",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && evaluation && (
          <>
            {/* AI Suggestion Card */}
            <div className="ai-eval-suggestion-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "22px",
                      height: "22px",
                      borderRadius: "6px",
                      background: "#e0e7ff",
                      color: "#4338ca",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                    }}
                  >
                    AI
                  </span>
                  <span
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#4338ca",
                    }}
                  >
                    Suggestion &middot; Not Final
                  </span>
                </div>
                <ConfidenceBadge confidence={evaluation.confidence} />
              </div>

              {/* Score & Dial Display */}
              <div className="ai-eval-score-card">
                <ScoreDial score={evaluation.suggested_score} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "var(--color-text-secondary)",
                      marginBottom: "4px",
                    }}
                  >
                    Suggested Score
                  </div>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                      marginBottom: "2px",
                    }}
                  >
                    Preliminary automated assessment
                  </div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.4,
                    }}
                  >
                    Designed as a starting baseline for instructor grading. You can override or adjust this score below.
                  </div>
                </div>
              </div>

              {/* Strengths */}
              {evaluation.strengths.length > 0 && (
                <div className="ai-eval-card-section" style={{ borderLeft: "4px solid var(--color-success)" }}>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "var(--color-success-text)",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>✓</span> Strengths
                  </div>
                  <div style={{ margin: 0 }}>
                    {evaluation.strengths.map((s, i) => (
                      <div key={i} className="ai-eval-list-item strength">
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Areas for Improvement */}
              {evaluation.weaknesses.length > 0 && (
                <div className="ai-eval-card-section" style={{ borderLeft: "4px solid var(--color-warning)" }}>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "var(--color-warning-text)",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>⚠</span> Areas for Improvement
                  </div>
                  <div style={{ margin: 0 }}>
                    {evaluation.weaknesses.map((w, i) => (
                      <div key={i} className="ai-eval-list-item improvement">
                        {w}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Comprehensive Feedback */}
              {evaluation.ai_feedback && (
                <div className="ai-eval-card-section">
                  <div
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "var(--color-text-primary)",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>💬</span> AI Detailed Analysis
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.86rem",
                      lineHeight: 1.6,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {evaluation.ai_feedback}
                  </p>
                </div>
              )}
            </div>

            {/* Teacher Review & Decision Card */}
            <div className="ai-eval-teacher-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-primary)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--color-primary)",
                    }}
                  >
                    Teacher Review & Finalization
                  </span>
                </div>
                {alreadyDecided && (
                  <span
                    className={`badge ${
                      evaluation.status === "REJECTED"
                        ? "badge-danger"
                        : "badge-success"
                    }`}
                    style={{ padding: "4px 10px", fontSize: "0.76rem" }}
                  >
                    {evaluation.status === "APPROVED"
                      ? "Approved"
                      : evaluation.status === "EDITED"
                      ? "Edited & Approved"
                      : "Rejected"}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Final Recorded Score
                  </label>
                  <div className="ai-eval-score-input-wrapper">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="form-control"
                      style={{ maxWidth: "160px" }}
                      placeholder="e.g. 85"
                      value={finalScore}
                      onChange={(e) => setFinalScore(e.target.value)}
                    />
                    <span className="score-suffix">/ 100</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Teacher Feedback (Optional notes for student)
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Add personalized feedback, guidance, or specific notes for this student..."
                    value={teacherFeedback}
                    onChange={(e) => setTeacherFeedback(e.target.value)}
                    style={{ resize: "vertical", minHeight: "80px" }}
                  />
                </div>
              </div>

              {reviewError && (
                <div
                  style={{
                    color: "var(--color-danger)",
                    fontSize: "0.84rem",
                    marginTop: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>⚠️</span> {reviewError}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "20px",
                  paddingTop: "16px",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={reviewing !== null}
                  onClick={() => submitReview("REJECTED")}
                  style={{ minWidth: "100px" }}
                >
                  {reviewing === "reject" ? "Rejecting..." : "Reject"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={reviewing !== null}
                  onClick={() => submitReview("APPROVED")}
                  style={{
                    minWidth: "140px",
                  }}
                >
                  {reviewing === "approve" ? "Saving..." : "Approve & Save"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

