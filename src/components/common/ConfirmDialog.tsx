

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
  confirmDisabled?: boolean;
  // Button text while idle/pending - defaults match the original Delete-only
  // usage so every existing call site is unaffected. A caller with a
  // different pending action (e.g. deactivating, not deleting) overrides both.
  confirmLabel?: string;
  pendingLabel?: string;
  // "warning": an amber icon + tinted message banner, for a consequential but
  // non-destructive action (e.g. deactivating an entity - existing data isn't
  // deleted, but the change still affects what's usable elsewhere). Overrides
  // isDanger's button color with .btn-warning. Omit for the original plain
  // Delete-dialog look (isDanger still controls that button color).
  variant?: "warning";
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDanger = true,
  confirmDisabled = false,
  confirmLabel = "Confirm",
  pendingLabel = "Deleting...",
  variant,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const confirmButtonClass =
    variant === "warning" ? "btn btn-warning" : isDanger ? "btn btn-danger" : "btn btn-primary";

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: "420px" }}>
        {variant === "warning" ? (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "20px" }}>
            <span
              aria-hidden
              style={{
                flexShrink: 0, width: "36px", height: "36px", borderRadius: "50%",
                backgroundColor: "var(--color-warning-bg)", color: "var(--color-warning)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.1rem", fontWeight: 700,
              }}
            >
              !
            </span>
            <div>
              <h3 style={{ margin: "0 0 8px 0" }}>{title}</h3>
              <p
                style={{
                  margin: 0, padding: "10px 12px", borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-warning-bg)", color: "var(--color-text-primary)",
                  borderLeft: "3px solid var(--color-warning)", fontSize: "0.9rem",
                }}
              >
                {message}
              </p>
            </div>
          </div>
        ) : (
          <>
            <h3 style={{ margin: "0 0 16px 0" }}>{title}</h3>
            <p style={{ margin: "0 0 24px 0", color: "var(--color-text-secondary)" }}>
              {message}
            </p>
          </>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button onClick={onCancel} className="btn btn-outline" disabled={confirmDisabled}>
            Cancel
          </button>
          <button onClick={onConfirm} className={confirmButtonClass} disabled={confirmDisabled}>
            {confirmDisabled ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
