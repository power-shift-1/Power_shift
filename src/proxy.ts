import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const MEMBER_PREFIXES = ["/dashboard", "/courses", "/chat", "/account", "/admin"];
const GUEST_PATHS = ["/sign-in", "/sign-up"];

/**
 * Refreshes the member's session before member pages render, sends signed-out visitors to
 * sign in, and sends signed-in members past the sign-in pages. Pages check again themselves.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, extraHeaders) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        for (const [header, value] of Object.entries(extraHeaders ?? {})) response.headers.set(header, value);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  let destination: URL | null = null;
  if (!signedIn && MEMBER_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    destination = new URL("/sign-in", request.url);
    destination.searchParams.set("next", path + request.nextUrl.search);
  } else if (signedIn && GUEST_PATHS.includes(path)) {
    destination = new URL("/dashboard", request.url);
  }
  if (!destination) return response;

  // Keep any refreshed session cookies on the redirect.
  const redirect = NextResponse.redirect(destination);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/courses/:path*",
    "/chat/:path*",
    "/account/:path*",
    "/admin/:path*",
    "/sign-in",
    "/sign-up",
  ],
};
