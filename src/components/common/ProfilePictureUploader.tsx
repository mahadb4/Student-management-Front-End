import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "../../context/ToastContext";
import type { ProfilePictureUploadUrlResponse, ProfilePictureUrlResponse } from "../../services/entities";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB frontend limit (backend keeps its own 5MB safety limit)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Please choose a JPEG, PNG or WebP image.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Image must be 2 MB or smaller.";
  }

  return null;
}

interface ProfilePictureUploaderProps {
  name: string;
  imageUrl: string | null;
  size?: number;
  requestUploadUrl: (contentType: string) => Promise<ProfilePictureUploadUrlResponse>;
  confirmUpload: (key: string) => Promise<ProfilePictureUrlResponse>;
  removePicture: () => Promise<void>;
  onChange: (url: string | null) => void;
}

export function ProfilePictureUploader({
  name,
  imageUrl,
  size = 120,
  requestUploadUrl,
  confirmUpload,
  removePicture,
  onChange,
}: ProfilePictureUploaderProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file again later
    if (!file || uploading) return;

    const validationError = validateFile(file);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploading(true);

    try {
      const { upload_url, key, content_type } = await requestUploadUrl(file.type);

      const s3Response = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": content_type },
        body: file,
      });

      if (!s3Response.ok) {
        throw new Error("Failed to upload image. Please try again.");
      }

      const { profile_picture_url } = await confirmUpload(key);
      onChange(profile_picture_url);
      showToast("Profile picture updated.", "success");
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to update profile picture.", "error");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
    }
  };

  const handleRemove = async () => {
    if (removing) return;
    setRemoving(true);

    try {
      await removePicture();
      onChange(null);
      setConfirmRemove(false);
      showToast("Profile picture removed.", "success");
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to remove profile picture.", "error");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
      <Avatar src={previewUrl || imageUrl} name={name} size={size} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          className="btn btn-sm btn-subtle-primary"
          disabled={uploading || removing}
          onClick={() => fileInputRef.current?.click()}
          style={{ fontWeight: 600, gap: "6px", boxShadow: "var(--shadow-sm)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          {uploading ? "Uploading..." : imageUrl ? "Change Photo" : "Upload Photo"}
        </button>

        {imageUrl && (
          <button
            type="button"
            className="btn btn-sm btn-subtle-danger"
            disabled={uploading || removing}
            onClick={() => setConfirmRemove(true)}
            style={{ fontWeight: 600, gap: "4px" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Remove
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmRemove}
        title="Remove Profile Picture"
        message="Are you sure you want to remove your profile picture?"
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(false)}
        confirmDisabled={removing}
        confirmLabel="Remove"
        pendingLabel="Removing..."
      />
    </div>
  );
}
