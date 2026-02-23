import { NextResponse, type NextRequest } from "next/server";
import { authenticateAdmin } from "@/lib/api-helpers";

/**
 * GET /api/credentials
 * Returns GTM tool credentials (Apollo, Lusha) to authenticated @hyperverge.co users only.
 * Credentials are stored in environment variables, never in the client bundle.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateAdmin(request);
  if ("error" in auth) return auth.error;

  const credentials = [
    {
      id: "apollo",
      title: "Apollo Credentials",
      username: process.env.APOLLO_USERNAME || "",
      password: process.env.APOLLO_PASSWORD || "",
    },
    {
      id: "lusha",
      title: "Lusha Credentials",
      username: process.env.LUSHA_USERNAME || "",
      password: process.env.LUSHA_PASSWORD || "",
    },
  ].filter((c) => c.username && c.password);

  return NextResponse.json({ credentials });
}
