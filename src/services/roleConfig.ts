import type { UserRole } from "../types/inventory";

// Admins can then assign other users (STUDENT, STUDENT_AMBASSADOR, STUDENT_LEAD) in the Users directory.
export const ADMIN_EMAILS: string[] = [
  "shivamafterall111@gmail.com",
  "mohitdavar2004@gmail.com",
];

export function normalizeEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

export function isAdminAccount(
  email?: string | null,
  role?: UserRole | null,
): boolean {
  return role === "ADMIN" || resolveRoleFromEmail(email) === "ADMIN";
}

export function resolveRoleFromEmail(
  email?: string | null,
): UserRole | undefined {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return undefined;
  }
  if (
    ADMIN_EMAILS.some(
      (allowedEmail) => normalizeEmail(allowedEmail) === normalized,
    )
  ) {
    return "ADMIN";
  }
  // All other users will just fall back to whatever is set for them in the db or "STUDENT" upon first registration.
  return undefined;
}
