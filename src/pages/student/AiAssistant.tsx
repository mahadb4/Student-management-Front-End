import { useEffect, useRef, useState } from "react";
import { askAiAssistant } from "../../services/entities";
import { getCurrentUser } from "../../services/auth";
import { useToast } from "../../context/ToastContext";
import { Avatar } from "../../components/common/Avatar";
import type { AiAssistantSource } from "../../types/user";

const MAX_QUESTION_LENGTH = 2000;

interface PromptCard {
  icon: React.ReactNode;
  themeClass: string;
  title: string;
  subtitle: string;
  prompt: string;
}

const MODERN_PROMPT_CARDS: PromptCard[] = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m9 16 2 2 4-4" />
      </svg>
    ),
    themeClass: "card-theme-attendance",
    title: "How is my attendance?",
    subtitle: "Check attendance percentage & recent classes",
    prompt: "How is my attendance?",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
      </svg>
    ),
    themeClass: "card-theme-assignments",
    title: "What assignments do I have?",
    subtitle: "Review upcoming deadlines & pending tasks",
    prompt: "What assignments do I have?",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <line x1="9" y1="9" x2="15" y2="9" />
        <line x1="9" y1="13" x2="13" y2="13" />
      </svg>
    ),
    themeClass: "card-theme-remarks",
    title: "Teacher evaluation & remarks",
    subtitle: "Synthesize teacher feedback & advice",
    prompt: "What are my weaknesses according to my teachers?",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    themeClass: "card-theme-overall",
    title: "How am I doing overall?",
    subtitle: "Comprehensive summary across all courses",
    prompt: "How am I doing overall?",
  },
];

const QUICK_TOPICS = [
  { label: "Attendance Analysis", prompt: "How is my attendance?" },
  { label: "Active Assignments", prompt: "What assignments do I have?" },
  { label: "Teacher Feedback", prompt: "What are my weaknesses according to my teachers?" },
  { label: "Course Guide", prompt: "Who teaches me?" },
  { label: "Overall Progress", prompt: "How am I doing overall?" },
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
  return `msg-${messageIdCounter}`;
}

export default function StudentAiAssistant() {
  const { showToast } = useToast();
  const user = getCurrentUser();
  const firstName = user?.name ? user.name.split(" ")[0] : "there";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  // Cancel any in-flight request if user navigates away
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
        const message = err instanceof Error ? err.message : "Failed to get a response. Please try again.";
        setMessages(prev => [...prev, { id: nextMessageId(), role: "assistant", text: message, isError: true }]);
        showToast(message, "error");
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

  const handleSuggestionClick = (suggestionPrompt: string) => {
    sendQuestion(suggestionPrompt);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleClearChat = () => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setQuestion("");
    setValidationError(null);
  };

  return (
    <div className="chat-container">
      {/* Executive Black Top Bar as requested */}
      <div className="chat-topbar-black">
        <div className="chat-topbar-brand">
          <div className="chat-topbar-avatar" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" />
              <path d="M3 5h4" />
            </svg>
          </div>
          <div>
            <h2 className="chat-topbar-title">AI Academic Assistant</h2>
            <p className="chat-topbar-subtitle">
              Ask questions about your courses, attendance records, upcoming assignments, and teacher feedback.
            </p>
          </div>
        </div>

        <div className="chat-topbar-actions">
          <div className="chat-topbar-status-badge">
            <span className="floating-ai-status-dot" />
            <span>Online & Ready</span>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              className="chat-topbar-reset-btn"
              onClick={handleClearChat}
              title="Clear conversation"
            >
              <span>↺</span>
              <span>New Chat</span>
            </button>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="pro-ai-hero">
            <h1 className="pro-ai-hero-title">
              How can I help with your studies, {firstName}?
            </h1>

            <p className="pro-ai-hero-subtitle">
              Select an inquiry below or ask anything about your courses, assignments, attendance, or instructor evaluations.
            </p>

            <div className="pro-ai-prompts-grid">
              {MODERN_PROMPT_CARDS.map((card) => (
                <button
                  key={card.prompt}
                  type="button"
                  className={`pro-ai-prompt-card ${card.themeClass}`}
                  onClick={() => handleSuggestionClick(card.prompt)}
                  disabled={asking}
                >
                  <div className="pro-ai-card-icon-box" aria-hidden="true">
                    {card.icon}
                  </div>
                  <div className="pro-ai-card-content">
                    <div className="pro-ai-card-header-row">
                      <span className="pro-ai-card-title">{card.title}</span>
                      <span className="pro-ai-card-arrow" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="7" y1="17" x2="17" y2="7" />
                          <polyline points="7 7 17 7 17 17" />
                        </svg>
                      </span>
                    </div>
                    <div className="pro-ai-card-sub">{card.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-bubble-row ${message.role === "user" ? "chat-row-user" : ""}`}
            >
              {message.role === "assistant" ? (
                <div className="pro-chat-avatar-bot" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  </svg>
                </div>
              ) : (
                <Avatar name={user?.name || "You"} size={32} />
              )}

              <div
                className={
                  message.role === "user"
                    ? "modern-chat-bubble-user"
                    : message.isError
                      ? "chat-bubble-error"
                      : "modern-chat-bubble-bot"
                }
                role={message.isError ? "alert" : undefined}
              >
                {message.role === "assistant" && !message.isError && (
                  <div className="pro-chat-bot-header">
                    <div className="pro-chat-bot-identity">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                      </svg>
                      <span>AI Assistant</span>
                    </div>
                    <button
                      type="button"
                      className="modern-chat-copy-btn"
                      onClick={() => handleCopy(message.id, message.text)}
                      title="Copy response"
                    >
                      {copiedId === message.id ? (
                        <>
                          <span style={{ color: "var(--color-success)", fontWeight: 700 }}>✓</span>
                          <span style={{ color: "var(--color-success)", fontWeight: 600 }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="modern-chat-bubble-text">{message.text}</div>

                {message.sources && message.sources.length > 0 && (
                  <div className="modern-chat-sources-panel">
                    <div className="modern-chat-sources-header">
                      <span>📚</span>
                      <span>Academic Sources & Citations</span>
                    </div>
                    {message.sources.map((source, index) => {
                      if (source.type === "remark") {
                        return (
                          <div className="modern-chat-source-item" key={`remark-${source.remark_id}-${index}`}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px",
                              borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, backgroundColor: "var(--color-purple-bg)",
                              color: "var(--color-purple-text)", border: "1px solid var(--color-purple-border)",
                            }}>
                              👨‍🏫 Teacher Remark
                            </span>
                            <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{source.course_name}</span>
                            <span style={{ color: "var(--color-text-secondary)", fontSize: "0.78rem" }}>by {source.teacher_name}</span>
                            <span style={{ marginLeft: "auto", color: "var(--color-text-secondary)", fontSize: "0.76rem" }}>
                              {formatSourceDate(source.created_at)}
                            </span>
                          </div>
                        );
                      }
                      if (source.type === "attendance") {
                        return (
                          <div className="modern-chat-source-item" key={`attendance-${source.course_name}-${index}`}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px",
                              borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, backgroundColor: "var(--color-success-bg)",
                              color: "var(--color-success-text)", border: "1px solid var(--color-success-border)",
                            }}>
                              📊 Attendance Record
                            </span>
                            <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{source.course_name}</span>
                            <span style={{ marginLeft: "auto", color: "var(--color-text-secondary)", fontSize: "0.78rem", fontWeight: 500 }}>
                              {source.detail}
                            </span>
                          </div>
                        );
                      }
                      if (source.type === "assignment") {
                        const style = ASSIGNMENT_STATUS_BADGE_STYLE[source.status] || ASSIGNMENT_STATUS_BADGE_STYLE.pending;
                        return (
                          <div className="modern-chat-source-item" key={`assignment-${source.title}-${index}`}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px",
                              borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, backgroundColor: style.bg,
                              color: style.color, border: `1px solid ${style.border}`,
                            }}>
                              📄 {ASSIGNMENT_STATUS_LABEL[source.status] || source.status}
                            </span>
                            <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
                              {source.title}
                              {source.attachment_available ? " 📎" : ""}
                            </span>
                            <span style={{ marginLeft: "auto", color: "var(--color-text-secondary)", fontSize: "0.76rem" }}>
                              {source.course_name}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div className="modern-chat-source-item" key={`course-${source.course_code}-${index}`}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px",
                            borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, backgroundColor: "var(--color-info-bg)",
                            color: "var(--color-info-text)", border: "1px solid var(--color-info-border)",
                          }}>
                            🎓 Course
                          </span>
                          <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{source.course_name}</span>
                          <span style={{ marginLeft: "auto", color: "var(--color-text-secondary)", fontSize: "0.78rem" }}>
                            {source.teacher_name ? `Instructor: ${source.teacher_name}` : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {asking && (
            <div className="chat-bubble-row" role="status" aria-live="polite" aria-label="Assistant is thinking">
              <div className="pro-chat-avatar-bot" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </div>
              <div className="pro-ai-thinking-card">
                <span className="chat-typing">
                  <span></span><span></span><span></span>
                </span>
                <span className="pro-ai-thinking-text">
                  Synthesizing your academic records...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="pro-ai-input-container">
          <div className="pro-ai-quick-chips">
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginRight: "2px" }}>
              Quick topics:
            </span>
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic.label}
                type="button"
                className="pro-ai-quick-chip"
                onClick={() => sendQuestion(topic.prompt)}
                disabled={asking}
              >
                <span>{topic.label}</span>
              </button>
            ))}
          </div>

          <div className="pro-ai-prompt-box">
            <textarea
              id="ai-assistant-question"
              className="pro-ai-textarea"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your courses, attendance, assignments, or teacher feedback..."
              rows={2}
              maxLength={MAX_QUESTION_LENGTH}
              disabled={asking}
              aria-invalid={!!validationError}
              aria-describedby={validationError ? "ai-assistant-question-error" : undefined}
            />

            <div className="pro-ai-prompt-bottom">
              <div className="pro-ai-prompt-hint">
                <span>↵ Enter to send</span>
                <span style={{ margin: "0 4px", opacity: 0.5 }}>·</span>
                <span>Shift+↵ new line</span>
              </div>

              <button
                type="button"
                className="pro-ai-send-button"
                onClick={handleAsk}
                disabled={asking || !question.trim()}
                aria-busy={asking}
                aria-label="Send question"
              >
                {asking ? (
                  <>
                    <span className="ai-check-spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "var(--color-surface)" }} />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <span>Ask AI</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          {validationError && (
            <p id="ai-assistant-question-error" role="alert" style={{ color: "var(--color-danger)", fontSize: "0.82rem", margin: "2px 0 0 8px" }}>
              {validationError}
            </p>
          )}
        </div>
      </div>
  );
}
