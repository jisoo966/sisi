import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 항상 공개 (로그인 안 해도 접근 가능)
const ALWAYS_PUBLIC = [
  "/",           // splash
  "/intro",      // 3-slide intro before login
  "/login",
  "/auth",       // /auth/confirm
  "/privacy",
  "/terms",
];

// 로그인 필수 (Phase E: MVP data 페이지들)
const AUTH_REQUIRED = [
  "/journey",
  "/gallery",
  "/messages",
  "/my-stars",
  "/moment",
  "/postcard",
  "/postcards",
  "/me",
  "/onboarding",
  "/chat",
];

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  // 항상 공개인 라우트는 통과
  if (matchesRoute(pathname, ALWAYS_PUBLIC)) {
    return supabaseResponse;
  }

  // Supabase keys 없으면 그냥 통과 (dev 편의)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("xxxxx")
  ) {
    return supabaseResponse;
  }

  // Supabase 호출은 try/catch로 감싸서, 네트워크 에러 시 통과
  try {
    let mutableResponse = supabaseResponse;
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options?: Record<string, unknown>;
            }[]
          ) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            mutableResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              mutableResponse.cookies.set(
                name,
                value,
                options as Parameters<typeof mutableResponse.cookies.set>[2]
              )
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 로그인 필수 라우트인데 로그인 안 됨 → /login으로
    if (!user && matchesRoute(pathname, AUTH_REQUIRED)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // 이미 로그인했는데 /login 접근 → 홈(/journey)으로
    if (user && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/journey";
      return NextResponse.redirect(url);
    }

    // 로그인은 됐는데 온보딩 안 됨 → /onboarding으로
    // (단, /onboarding 자체와 auth/api 라우트는 예외)
    if (
      user &&
      !pathname.startsWith("/onboarding") &&
      !pathname.startsWith("/api") &&
      matchesRoute(pathname, AUTH_REQUIRED)
    ) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.onboarded) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
    }

    return mutableResponse;
  } catch (err) {
    // Supabase 네트워크 에러 (project paused 등) — 그냥 통과
    console.warn("[middleware] supabase unreachable, skipping auth:", err);
    return supabaseResponse;
  }
}
