import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { askAiAssistant } from "../../services/entities";
import { getCurrentUser } from "../../services/auth";
import { useToast } from "../../context/ToastContext";
import type { AiAssistantSource } from "../../types/user";

const MAX_QUESTION_LENGTH = 2000;

interface SuggestionItem {
  icon: React.ReactNode;
  themeClass: string;
  label: string;
  prompt: string;
}

const SUGGESTIONS: SuggestionItem[] = [
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m9 16 2 2 4-4" />
      </svg>
    ),
    themeClass: "suggestion-theme-attendance",
    label: "How is my attendance?",
    prompt: "How is my attendance?",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
      </svg>
    ),
    themeClass: "suggestion-theme-assignments",
    label: "What assignments do I have?",
    prompt: "What assignments do I have?",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <line x1="9" y1="9" x2="15" y2="9" />
        <line x1="9" y1="13" x2="13" y2="13" />
      </svg>
    ),
    themeClass: "suggestion-theme-remarks",
    label: "Teacher feedback & remarks",
    prompt: "What are my weaknesses according to my teachers?",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    themeClass: "suggestion-theme-overall",
    label: "How am I doing overall?",
    prompt: "How am I doing overall?",
  },
];

const ASSIGNMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  overdue: "Overdue",
  submitted: "Submitted",
};

const ASSIGNMENT_STATUS_BADGE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  pending: { bg: "var(--color-warning-bg)", color: "var(--color-warning-text)", border: "var(--color-warning-border)" },
  overdue: { bg: "var(--color-danger-bg)", color: "var(--color-danger-text)", border: "var(--color-danger-border)" },
  submitted: { bg: "var(--color-success-bg)", color: "var(--color-success-text)", border: "var(--color-success-border)" },
};

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: AiAssistantSource[];
  isError?: boolean;
}

function formatSourceDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

let messageIdCounter = 0;
function nextMessageId(): string {
  messageIdCounter += 1;
  return `float-msg-${messageIdCounter}`;
}

export default function FloatingAiAssistant() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const user = getCurrentUser();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, asking, isOpen]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Handle Escape key to close window
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Cancel in-flight request on unmount
  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const validate = (value: string): string | null => {
    if (!value.trim()) return "Please enter a question.";
    if (value.length > MAX_QUESTION_LENGTH) return `Question must be at most ${MAX_QUESTION_LENGTH} characters.`;
    return null;
  };

  const sendQuestion = (raw: string) => {
    if (asking) return;

    const trimmed = raw.trim();
    const validation = validate(trimmed);
    if (validation) {
      setValidationError(validation);
      return;
    }
    setValidationError(null);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setMessages(prev => [...prev, { id: nextMessageId(), role: "user", text: trimmed }]);
    setQuestion("");
    setAsking(true);

    askAiAssistant(trimmed, controller.signal)
      .then((response) => {
        setMessages(prev => [
          ...prev,
          { id: nextMessageId(), role: "assistant", text: response.answer, sources: response.sources },
        ]);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Sorry, I couldn't process that request right now. Please try again.";
        setMessages(prev => [...prev, { id: nextMessageId(), role: "assistant", text: message, isError: true }]);
        showToast("AI Assistant request failed", "error");
      })
      .finally(() => setAsking(false));
  };

  const handleAsk = () => sendQuestion(question);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const handleExpandToFullPage = () => {
    setIsOpen(false);
    navigate("/student/ai-assistant");
  };

  const handleClearChat = () => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setQuestion("");
    setValidationError(null);
    setAsking(false);
  };

  const firstName = user?.name ? user.name.split(" ")[0] : "";

  return (
    <aside aria-label="Student AI Assistant Widget">
      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className="floating-ai-window"
          role="dialog"
          aria-modal="false"
          aria-labelledby="floating-ai-title"
        >
          {/* Header */}
          <div className="floating-ai-header">
            <div className="floating-ai-header-info">
              <div className="floating-ai-avatar" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </div>
              <div>
                <h3 id="floating-ai-title" className="floating-ai-title">Academic Assistant</h3>
                <span className="floating-ai-status">
                  <span className="floating-ai-status-dot" />
                  Online · Instant Insights
                </span>
              </div>
            </div>

            <div className="floating-ai-header-actions">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="floating-ai-header-btn"
                  title="Clear conversation"
                  aria-label="Clear conversation"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>
              )}

              <button
                type="button"
                onClick={handleExpandToFullPage}
                className="floating-ai-header-btn"
                title="Open full assistant"
                aria-label="Open full assistant"
                data-tooltip="Open full assistant"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="floating-ai-header-btn"
                title="Close assistant"
                aria-label="Close assistant"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="floating-ai-body">
            {messages.length === 0 ? (
              <div className="floating-ai-welcome">
                <div className="floating-ai-welcome-badge" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    <path d="M5 3v4" />
                    <path d="M3 5h4" />
                  </svg>
                </div>
                <h4 className="floating-ai-welcome-title">
                  Hi, {firstName || "there"}
                </h4>
                <p className="floating-ai-welcome-desc">
                  Ask anything about your courses, attendance records, assignments, and teacher feedback.
                </p>

                <div className="floating-ai-suggestions-label">Suggested questions:</div>
                <div className="floating-ai-suggestions">
                  {SUGGESTIONS.map((item) => (
                    <button
                      key={item.prompt}
                      type="button"
                      className={`floating-ai-suggestion-chip ${item.themeClass}`}
                      onClick={() => sendQuestion(item.prompt)}
                      disabled={asking}
                    >
                      <div className="floating-ai-suggestion-icon-box" aria-hidden="true">
                        {item.icon}
                      </div>
                      <span style={{ fontWeight: 500 }}>{item.label}</span>
                      <span className="floating-ai-suggestion-arrow" aria-hidden="true">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="7" y1="17" x2="17" y2="7" />
                          <polyline points="7 7 17 7 17 17" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="floating-ai-messages-list">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`floating-ai-msg-row ${message.role === "user" ? "floating-ai-msg-user" : "floating-ai-msg-assistant"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="floating-ai-msg-avatar" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        </svg>
                      </div>
                    )}

                    <div
                      className={`floating-ai-bubble ${
                        message.role === "user"
                          ? "floating-ai-bubble-user"
                          : message.isError
                            ? "floating-ai-bubble-error"
                            : "floating-ai-bubble-bot"
                      }`}
                    >
                      {message.role === "assistant" && !message.isError && (
                        <div className="floating-ai-bubble-header">
                          <div className="floating-ai-bubble-identity">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                            </svg>
                            <span>AI Assistant</span>
                          </div>
                          <button
                            type="button"
                            className="floating-ai-copy-btn"
                            onClick={() => handleCopy(message.id, message.text)}
                            title="Copy response"
                          >
                            {copiedId === message.id ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                      )}

                      <div className="floating-ai-bubble-text">{message.text}</div>

                      {/* Source Chips */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="floating-ai-sources">
                          <div className="floating-ai-sources-title">Verified Sources</div>
                          <div className="floating-ai-sources-list">
                            {message.sources.map((source, idx) => {
                              if (source.type === "attendance") {
                                return (
                                  <div key={`src-att-${idx}`} className="floating-ai-source-item">
                                    <span className="floating-ai-source-tag" style={{ backgroundColor: "var(--color-success-bg)", color: "var(--color-success-text)", borderColor: "var(--color-success-border)" }}>
                                      Attendance
                                    </span>
                                    <span className="floating-ai-source-name">{source.course_name}</span>
                                    <span className="floating-ai-source-detail">{source.detail}</span>
                                  </div>
                                );
                              }
                              if (source.type === "assignment") {
                                const st = ASSIGNMENT_STATUS_BADGE_STYLE[source.status] || { bg: "var(--color-surface-hover)", color: "var(--color-text-strong)", border: "var(--color-border)" };
                                return (
                                  <div key={`src-asg-${idx}`} className="floating-ai-source-item">
                                    <span className="floating-ai-source-tag" style={{ backgroundColor: st.bg, color: st.color, borderColor: st.border }}>
                                      Assignment
                                    </span>
                                    <span className="floating-ai-source-name">
                                      {source.title}{source.attachment_available ? " 📎" : ""}
                                    </span>
                                    <span className="floating-ai-source-detail">
                                      {ASSIGNMENT_STATUS_LABEL[source.status] || source.status}
                                    </span>
                                  </div>
                                );
                              }
                              if (source.type === "remark") {
                                return (
                                  <div key={`src-rem-${idx}`} className="floating-ai-source-item">
                                    <span className="floating-ai-source-tag" style={{ backgroundColor: "var(--color-purple-bg)", color: "var(--color-purple-text)", borderColor: "var(--color-purple-border)" }}>
                                      Feedback
                                    </span>
                                    <span className="floating-ai-source-name">{source.course_name}</span>
                                    <span className="floating-ai-source-detail">{formatSourceDate(source.created_at)}</span>
                                  </div>
                                );
                              }
                              return (
                                <div key={`src-crs-${idx}`} className="floating-ai-source-item">
                                  <span className="floating-ai-source-tag" style={{ backgroundColor: "var(--color-info-bg)", color: "var(--color-info-text)", borderColor: "var(--color-info-border)" }}>
                                    Course
                                  </span>
                                  <span className="floating-ai-source-name">{source.course_name}</span>
                                  <span className="floating-ai-source-detail">{source.teacher_name || source.course_code}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {asking && (
                  <div className="floating-ai-msg-row floating-ai-msg-assistant" role="status" aria-live="polite" aria-label="Assistant is thinking">
                    <div className="floating-ai-msg-avatar" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                      </svg>
                    </div>
                    <div className="floating-ai-bubble floating-ai-bubble-bot">
                      <div className="floating-ai-typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Footer Input */}
          <div className="floating-ai-footer">
            <div className="floating-ai-input-wrap">
              <label htmlFor="floating-ai-input" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                Ask EduPortal Assistant a question
              </label>
              <textarea
                id="floating-ai-input"
                ref={inputRef}
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about courses, attendance, assignments..."
                rows={1}
                maxLength={MAX_QUESTION_LENGTH}
                disabled={asking}
                aria-invalid={!!validationError}
                aria-describedby={validationError ? "floating-ai-error" : undefined}
              />
              <button
                type="button"
                className="floating-ai-send-btn"
                onClick={handleAsk}
                disabled={asking || !question.trim()}
                aria-label="Send message"
                title="Send message (Enter)"
              >
                {asking ? (
                  <span className="floating-ai-btn-spinner" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                )}
              </button>
            </div>
            {validationError && (
              <p id="floating-ai-error" role="alert" className="floating-ai-error-text">
                {validationError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Floating Bottom-Right Launcher Button */}
      <button
        type="button"
        className={`floating-ai-launcher ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? "Close AI Assistant" : "AI Academic Assistant"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={isOpen ? "Close AI Assistant" : "AI Academic Assistant"}
      >
        <span className="floating-ai-launcher-icon" aria-hidden="true">
          {isOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" />
              <path d="M3 5h4" />
            </svg>
          )}
        </span>
        {!isOpen && <span className="floating-ai-launcher-ping" aria-hidden="true" />}
      </button>
    </aside>
  );
}
