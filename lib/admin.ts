import "server-only";

function adminEmailSet() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getAdminEmails() {
  return Array.from(adminEmailSet());
}

export function isAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return adminEmailSet().has(email.trim().toLowerCase());
}
