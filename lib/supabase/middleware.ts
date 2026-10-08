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

    // Guest 모드 체크 — sisi_guest 쿠키 있으면 로그인 없이도 통과.
    // 익명 계정(lib/cloudSave)은 게스트와 같다: 로그인한 사용자로 보지 않음
    // (/onboarding 으로 보내지 않고, /login 에서 이메일을 연결할 수 있게).
    const anonymous = !!user?.is_anonymous;
    const isGuest = request.cookies.get("sisi_guest")?.value === "1" || anonymous;
    const member = user && !anonymous ? user : null;

    // 로그인도 게스트도 아니면 → "/" (그곳에서 게스트로 시작해 들판으로; 로그인 화면을 먼저 보이지 않음)
    if (!user && !isGuest && matchesRoute(pathname, AUTH_REQUIRED)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // 이미 로그인했는데 /login 접근 → 홈(/journey)으로
    if (member && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/journey";
      return NextResponse.redirect(url);
    }

    // 로그인은 됐는데 온보딩 안 됨 → /onboarding으로
    // (단, /onboarding 자체와 auth/api 라우트는 예외)
    if (
      member &&
      !pathname.startsWith("/onboarding") &&
      !pathname.startsWith("/api") &&
      matchesRoute(pathname, AUTH_REQUIRED)
    ) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", member.id)
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
