import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isValidPasswordAuth } from "@/lib/password-auth";

export async function middleware(request: NextRequest) {
  // Check password-based auth first (simple shared password)
  const passwordCookie = request.cookies.get("eventiq_password_auth")?.value;
  const isPasswordAuthed = isValidPasswordAuth(passwordCookie);

  // If password-authed and on login page, redirect to home
  if (isPasswordAuthed && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // If password-authed, allow through (skip Supabase check)
  if (isPasswordAuthed) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, skip auth (allow full access)
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes("YOUR_PROJECT")
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated and not on the login or auth callback page, redirect to login
  if (!user && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If authenticated, verify @hyperverge.co domain
  if (user && user.email && !user.email.endsWith("@hyperverge.co")) {
    // Sign out and redirect to login with error
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "unauthorized_domain");
    return NextResponse.redirect(url);
  }

  // If authenticated and on login page, redirect to home
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip static files, SW, manifest, favicon, and API routes
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon-192.png|icon-512.png|api/).*)",
  ],
};
