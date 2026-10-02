import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Modal } from "./Modal";
import { getCroppedImageBlob } from "../../utils/cropImage";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface ProfilePhotoCropperProps {
  isOpen: boolean;
  imageSrc: string | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (croppedBlob: Blob) => void;
}

// Reusable crop + zoom editor shared by Student Profile and Teacher Profile -
// takes a locally selected image and hands back a square, cropped JPEG blob
// for the caller to feed into its own (unchanged) presigned S3 upload flow.
export function ProfilePhotoCropper({ isOpen, imageSrc, saving, onCancel, onSave }: ProfilePhotoCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
  }, []);

  const handleCancel = () => {
    if (processing || saving) return;
    resetState();
    onCancel();
  };

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels || processing || saving) return;

    setProcessing(true);
    setError(null);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      resetState();
      onSave(blob);
    } catch {
      setError("Could not process this image. Please try a different photo.");
    } finally {
      setProcessing(false);
    }
  };

  const busy = processing || saving;

  return (
    <Modal isOpen={isOpen} title="Edit Profile Photo" onClose={handleCancel} maxWidth="440px">
      {imageSrc && (
        <>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "1 / 1",
              backgroundColor: "var(--color-surface-muted)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "18px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Zoom</span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              style={{ flex: 1, accentColor: "var(--color-primary)" }}
            />
          </div>

          {error && (
            <p style={{ color: "var(--color-danger)", fontSize: "0.85rem", marginTop: "10px", marginBottom: 0 }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
            <button type="button" className="btn btn-sm btn-secondary" onClick={handleCancel} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleSave} disabled={busy || !croppedAreaPixels}>
              {busy ? "Saving..." : "Save Photo"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
