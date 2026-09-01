import type { UserRole } from "../types/inventory";

export const ROLE_PRIORITY: Record<UserRole, number> = {
  ADMIN: 3,
  STUDENT_LEAD: 2,
  STUDENT_AMBASSADOR: 2,
  STUDENT: 1,
};

export function hasMinimumRole(
  currentRole: UserRole | null | undefined,
  minimumRole: UserRole,
): boolean {
  if (!currentRole) return false;
  return ROLE_PRIORITY[currentRole] >= ROLE_PRIORITY[minimumRole];
}

export function isStudent(role: UserRole | null | undefined): boolean {
  return (
    role === "STUDENT" ||
    role === "STUDENT_LEAD" ||
    role === "STUDENT_AMBASSADOR"
  );
}

export function isAmbassador(role: UserRole | null | undefined): boolean {
  return role === "STUDENT_AMBASSADOR";
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "ADMIN";
}

export function canIssueInventory(role: UserRole | null | undefined): boolean {
  // Students can browse/scan and request items, but they must not issue inventory.
  return hasMinimumRole(role, "STUDENT_LEAD");
}

export function canApproveRequests(role: UserRole | null | undefined): boolean {
  return hasMinimumRole(role, "STUDENT_AMBASSADOR");
}

export function canManageCatalog(role: UserRole | null | undefined): boolean {
  return hasMinimumRole(role, "STUDENT_AMBASSADOR");
}

export function canManageUsers(role: UserRole | null | undefined): boolean {
  return hasMinimumRole(role, "ADMIN");
}

export function canReturnOrRepairItems(
  role: UserRole | null | undefined,
): boolean {
  return hasMinimumRole(role, "STUDENT_AMBASSADOR");
}
