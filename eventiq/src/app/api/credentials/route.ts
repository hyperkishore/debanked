import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * GET /api/credentials
 * Returns GTM tool credentials (Apollo, Lusha) to authenticated @hyperverge.co users only.
 * Credentials are stored in environment variables, never in the client bundle.
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email?.endsWith("@hyperverge.co")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
