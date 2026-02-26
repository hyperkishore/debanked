import { createHash } from "crypto";

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "Kiket123";
const AUTH_SALT = "eventiq-password-auth-2026";

/** Generate the expected token from the password */
function generateAuthToken(): string {
  return createHash("sha256")
    .update(AUTH_PASSWORD + AUTH_SALT)
    .digest("hex");
}

/** Check if a cookie value matches the valid password auth token */
export function isValidPasswordAuth(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  return cookieValue === generateAuthToken();
}
