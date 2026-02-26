import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "Kiket123";
const AUTH_SALT = "eventiq-password-auth-2026";

/** Generate a token from the password for cookie verification */
export function generateAuthToken(): string {
  return createHash("sha256")
    .update(AUTH_PASSWORD + AUTH_SALT)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || password !== AUTH_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = generateAuthToken();
    const response = NextResponse.json({ success: true });

    // Set HTTP-only cookie, valid for 30 days
    response.cookies.set("eventiq_password_auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("eventiq_password_auth");
  return response;
}
