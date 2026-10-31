import type { UserRole } from '../types/inventory';

export const ROLE_PRIORITY: Record<UserRole, number> = {
  ADMIN: 5,
  INSTITUTION_MANAGER: 4,
  RESOURCE_OWNER: 3,
  STUDENT_LEAD: 2,
  STUDENT_AMBASSADOR: 2,
  STUDENT: 1,
};

export function hasMinimumRole(currentRole: UserRole | null | undefined, minimumRole: UserRole): boolean {
  if (!currentRole) return false;
  return ROLE_PRIORITY[currentRole] >= ROLE_PRIORITY[minimumRole];
}

export function isStudent(role: UserRole | null | undefined): boolean {
  return role === 'STUDENT';
}

export function isStaff(role: UserRole | null | undefined): boolean {
  return (
    role === 'ADMIN' ||
    role === 'INSTITUTION_MANAGER' ||
    role === 'STUDENT_LEAD' ||
    role === 'STUDENT_AMBASSADOR'
  );
}

export function isAmbassador(role: UserRole | null | undefined): boolean {
  return role === 'STUDENT_AMBASSADOR';
}

export function isLead(role: UserRole | null | undefined): boolean {
  return role === 'STUDENT_LEAD';
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canIssueInventory(role: UserRole | null | undefined): boolean {
  return isStaff(role);
}

export function canApproveRequests(role: UserRole | null | undefined): boolean {
  return isStaff(role) || role === 'RESOURCE_OWNER';
}

export function canManageCatalog(role: UserRole | null | undefined): boolean {
  return isStaff(role);
}

export function canManageLocations(role: UserRole | null | undefined): boolean {
  return isStaff(role);
}

export function canManageEquipment(role: UserRole | null | undefined): boolean {
  return isStaff(role) || role === 'RESOURCE_OWNER';
}

export function canManageUsers(role: UserRole | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canApproveNewUsers(role: UserRole | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canReturnOrRepairItems(role: UserRole | null | undefined): boolean {
  return isStaff(role);
}
