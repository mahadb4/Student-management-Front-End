import { getCurrentUser } from "../services/auth";
import type { Permission, UserRole } from "../types/user";

export function usePermissions() {
  const user = getCurrentUser();

  const role = user?.role as UserRole | undefined;
  const permissions = user?.permissions || [];

  const isAdmin = role === "admin";
  const isStudent = role === "student";
  const isTeacher = role === "teacher";
  const isStaff = role === "staff";

  // Admins always have all permissions.
  // Others check their permissions array.
  const hasPermission = (permission: Permission): boolean => {
    if (isAdmin) return true;
    return permissions.includes(permission);
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
    permissions,
    hasPermission,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
  };
}
