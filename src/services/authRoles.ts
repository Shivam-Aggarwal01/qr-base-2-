import type { UserRole } from '../types/inventory';

export const ROLE_PRIORITY: Record<UserRole, number> = {
  ADMIN: 4,
  STUDENT_AMBASSADOR: 3,
  STUDENT_LEAD: 3,
  STUDENT: 1
};

export function hasMinimumRole(
  currentRole: UserRole | null | undefined,
  minimumRole: UserRole
): boolean {
  if (!currentRole) return false;
  return ROLE_PRIORITY[currentRole] >= ROLE_PRIORITY[minimumRole];
}

export function canIssueInventory(role: UserRole | null | undefined): boolean {
  return hasMinimumRole(role, 'STUDENT');
}

export function canApproveRequests(role: UserRole | null | undefined): boolean {
  return hasMinimumRole(role, 'STUDENT_AMBASSADOR');
}

export function canManageCatalog(role: UserRole | null | undefined): boolean {
  return hasMinimumRole(role, 'ADMIN');
}

export function canManageUsers(role: UserRole | null | undefined): boolean {
  return hasMinimumRole(role, 'ADMIN');
}

export function canReturnOrRepairItems(role: UserRole | null | undefined): boolean {
  return hasMinimumRole(role, 'STUDENT_AMBASSADOR');
}
