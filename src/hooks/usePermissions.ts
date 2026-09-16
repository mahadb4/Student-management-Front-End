import { getCurrentUser } from "../services/auth";
import type { Permission, UserRole } from "../types/user";

export function usePermissions() {
  const user = getCurrentUser();

  const role = user?.role as UserRole | undefined;

  const isAdmin = role === "admin";
  const isStudent = role === "student";
  const isTeacher = role === "teacher";
  const isStaff = role === "staff";

  // Admins always have all permissions; no other role has frontend-gated
  // permissions currently, so anything else is denied.
  const hasPermission = (_permission: Permission): boolean => {
    return isAdmin;
  };

  // Helper for resource-level CRUD checks
  const canRead = (resource: string) => hasPermission(`${resource}.view` as Permission);
  const canCreate = (resource: string) => hasPermission(`${resource}.create` as Permission);
  const canUpdate = (resource: string) => hasPermission(`${resource}.update` as Permission);
  const canDelete = (resource: string) => hasPermission(`${resource}.delete` as Permission);

  return {
    role,
    isAdmin,
    isStudent,
    isTeacher,
    isStaff,
    hasPermission,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
  };
}
