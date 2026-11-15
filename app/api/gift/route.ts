import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { noteForUser, previewNote } from "@/lib/server/gifts";

/** GET → the gift note for the signed-in account (guests included), or { ok: false }. */
export async function GET(req: Request) {
  // development only: /api/gift?preview=1 shows the note to anyone (for a look)
  if (process.env.NODE_ENV === "development" && new URL(req.url).searchParams.get("preview")) {
    const note = previewNote();
    if (note) return NextResponse.json({ ok: true, note });
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const note = user ? noteForUser(user.id) : null;
    if (!note) return NextResponse.json({ ok: false });
    return NextResponse.json({ ok: true, note });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
