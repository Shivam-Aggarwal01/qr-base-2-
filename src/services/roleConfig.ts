import type { UserRole } from '../types/inventory';

// Add or remove emails here. There is no fixed limit on how many admins or ambassadors you can have.
// Everyone else will automatically fall back to STUDENT.
export const ADMIN_EMAILS: string[] = [
  'shivamafterall111@gmail.com'
];

export const AMBASSADOR_EMAILS: string[] = [
  'ambassador1@college.edu',
  'ambassador2@college.edu'
];


export function normalizeEmail(email?: string | null): string {
  return (email ?? '').trim().toLowerCase();
}


export function resolveRoleFromEmail(email?: string | null): UserRole | undefined {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return undefined;
  }


  if (ADMIN_EMAILS.some((allowedEmail) => normalizeEmail(allowedEmail) === normalized)) {
    return 'ADMIN';
  }

  if (AMBASSADOR_EMAILS.some((allowedEmail) => normalizeEmail(allowedEmail) === normalized)) {
    return 'STUDENT_AMBASSADOR';
  }

  return undefined;
}
