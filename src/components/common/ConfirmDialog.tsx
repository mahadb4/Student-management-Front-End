

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDanger = true,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: "400px" }}>
        <h3 style={{ margin: "0 0 16px 0" }}>{title}</h3>
        <p style={{ margin: "0 0 24px 0", color: "var(--color-text-secondary)" }}>
          {message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button onClick={onCancel} className="btn btn-outline">
            Cancel
          </button>
          <button onClick={onConfirm} className={isDanger ? "btn btn-danger" : "btn btn-primary"}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
