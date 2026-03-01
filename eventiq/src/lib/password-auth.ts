/**
 * Password auth — Edge Runtime compatible (no Node.js crypto)
 * Uses Web Crypto API (SubtleCrypto) which works in both Edge and Node.js runtimes.
 */

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "Kiket123";
const AUTH_SALT = "eventiq-password-auth-2026";

/** Generate SHA-256 hex token using Web Crypto API */
async function generateAuthToken(): Promise<string> {
  const data = new TextEncoder().encode(AUTH_PASSWORD + AUTH_SALT);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Check if a cookie value matches the valid password auth token */
export async function isValidPasswordAuth(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await generateAuthToken();
  return cookieValue === expected;
}
