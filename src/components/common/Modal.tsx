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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} className="btn-icon" style={{ padding: 0 }} aria-label="Close modal">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
