import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * /auth/confirm — magic link 클릭 후 진입점.
 *   1. Session 교환 (PKCE 또는 OTP)
 *   2. Profile onboarded 상태 확인
 *      - 신규 유저 → /onboarding
 *      - 온보딩 완료 → /journey
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const explicitNext = searchParams.get("next");

  const supabase = await createClient();

  // Session 교환
  let sessionOk = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    sessionOk = !error;
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    sessionOk = !error;
  }

  if (!sessionOk) {
    return NextResponse.redirect(
      new URL("/login?error=link_expired", request.url),
    );
  }

  // 명시적 next 있으면 그대로
  if (explicitNext) {
    return NextResponse.redirect(new URL(explicitNext, request.url));
  }

  // 온보딩 상태 보고 판단
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user.id)
    .maybeSingle();

  const dest = profile?.onboarded ? "/journey" : "/onboarding";
  return NextResponse.redirect(new URL(dest, request.url));
}
