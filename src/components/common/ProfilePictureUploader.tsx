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
  requestUploadUrl: (contentType: string) => Promise<ProfilePictureUploadUrlResponse>;
  confirmUpload: (key: string) => Promise<ProfilePictureUrlResponse>;
  removePicture: () => Promise<void>;
  onChange: (url: string | null) => void;
}

// Self-service "my profile picture" widget: file picker -> pre-signed S3
// upload -> backend confirmation -> updated avatar. Shared by the Student and
// Teacher profile pages so both follow the exact same upload/remove flow.
export function ProfilePictureUploader({
  name,
  imageUrl,
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

  // Revoke the local preview's object URL on unmount/replacement so it
  // doesn't leak - it's only ever needed while an upload is in flight.
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

      // Direct browser-to-S3 upload via the pre-signed url - the image bytes
      // never pass through our own Django server.
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
      <Avatar src={previewUrl || imageUrl} name={name} size={120} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          className="btn btn-outline"
          disabled={uploading || removing}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Uploading..." : imageUrl ? "Change Picture" : "Upload Picture"}
        </button>

        {imageUrl && (
          <button
            type="button"
            className="btn btn-danger"
            disabled={uploading || removing}
            onClick={() => setConfirmRemove(true)}
          >
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
