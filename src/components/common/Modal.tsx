import React from "react";

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ isOpen, title, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} className="btn-icon" style={{ padding: 0 }}>
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
