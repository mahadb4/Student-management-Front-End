import React from "react";

interface ModalProps {
  isOpen: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string | number;
  className?: string;
}

export function Modal({ isOpen, title, onClose, children, maxWidth, className }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div
        className={`modal-content ${className || ""}`}
        style={maxWidth ? { maxWidth } : undefined}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>{title}</h3>
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
