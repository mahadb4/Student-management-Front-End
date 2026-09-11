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

export function Avatar({ src, name, size = 40 }: AvatarProps) {
  const [failed, setFailed] = useState(false);

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
