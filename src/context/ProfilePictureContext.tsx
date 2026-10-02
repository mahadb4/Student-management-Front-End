import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getCurrentUser } from "../services/auth";
import { getMyStudentIdentity, getMyTeacherIdentity } from "../services/entities";

interface ProfilePictureContextValue {
  profilePictureUrl: string | null;
  setProfilePictureUrl: (url: string | null) => void;
}

const ProfilePictureContext = createContext<ProfilePictureContextValue | null>(null);

// The authenticated session user (services/auth.ts's User, cached in
// localStorage at login) doesn't carry profile_picture_url - only the
// Student/Teacher identity endpoints do. Rather than touching the login
// response/auth architecture just to thread one field through, this fetches
// each role's lightweight "me/identity" endpoint (name + picture only, not
// the full profile) exactly once per DashboardLayout mount (i.e. once per
// session, not once per render/page), purely to seed the Navbar avatar.
// Admin/staff have no profile picture concept, so nothing is fetched for them.
export function ProfilePictureProvider({ children }: { children: ReactNode }) {
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;

    if (user.role === "student") {
      getMyStudentIdentity().then(p => setProfilePictureUrl(p.profile_picture_url)).catch(() => {});
    } else if (user.role === "teacher") {
      getMyTeacherIdentity().then(p => setProfilePictureUrl(p.profile_picture_url)).catch(() => {});
    }
  }, []);

  return (
    <ProfilePictureContext.Provider value={{ profilePictureUrl, setProfilePictureUrl }}>
      {children}
    </ProfilePictureContext.Provider>
  );
}

export function useProfilePicture(): ProfilePictureContextValue {
  const ctx = useContext(ProfilePictureContext);
  if (!ctx) {
    throw new Error("useProfilePicture must be used within a ProfilePictureProvider");
  }
  return ctx;
}
