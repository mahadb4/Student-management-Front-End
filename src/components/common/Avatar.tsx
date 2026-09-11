import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  return initials || "?";
}

// Shows the profile picture when one is set, otherwise falls back to an
// initials circle (same look the Navbar/Profile pages already use). Also
// falls back if the image fails to load - e.g. an expired pre-signed URL.
export function Avatar({ src, name, size = 40 }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  // A fresh src (new picture, or a re-signed URL after a refetch) deserves a
  // fresh attempt to load it.
  useEffect(() => setFailed(false), [src]);

  const baseStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        style={{ ...baseStyle, objectFit: "cover" }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        backgroundColor: "var(--color-primary)",
        color: "white",
        fontWeight: 600,
        fontSize: size * 0.4,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
