/**
 * lib/chatSessions — Sísí 대화 세션 관리.
 *
 * 로그인 유저만: Supabase chat_sessions + chat_messages 테이블 사용.
 * 게스트: 세션 개념 없음 (localStorage로 임시 대화만).
 */

import { createClient } from "@/lib/supabase/client";

export type ChatSession = {
  id: string;
  title: string | null;
  lastMessageAt: string;
  createdAt: string;
  /** 첫 user 메시지 (preview용, 세션 리스트에서 표시) */
  firstMessage?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "sisi";
  content: string;
  createdAt: string;
  suggestedSave?: boolean;
  saveReason?: string;
};

// ─── Auth helper ─────────────────────────────────

async function getCurrentUser() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// ─── Sessions ────────────────────────────────────

/** 새 세션 생성 — 채팅 시작 시 호출. */
export async function createSession(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: user.id })
    .select("id")
    .single();

  if (error) {
    console.error("createSession error:", error);
    return null;
  }
  return data.id;
}

/** 최근 세션 리스트 반환 (dashboard용). 각 세션의 첫 user 메시지 포함. */
export async function loadRecentSessions(
  limit = 10,
): Promise<ChatSession[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, last_message_at, created_at")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("loadRecentSessions error:", error);
    return [];
  }

  // 각 세션의 첫 user 메시지 fetch (preview용)
  const sessions: ChatSession[] = await Promise.all(
    data.map(async (s) => {
      const { data: firstMsg } = await supabase
        .from("chat_messages")
        .select("content")
        .eq("session_id", s.id)
        .eq("role", "user")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      return {
        id: s.id,
        title: s.title,
        lastMessageAt: s.last_message_at,
        createdAt: s.created_at,
        firstMessage: firstMsg?.content,
      };
    }),
  );

  return sessions;
}

/** 특정 세션의 메시지들 로드 (past session view). */
export async function loadSessionMessages(
  sessionId: string,
): Promise<ChatMessage[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at, suggested_save, save_reason")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("loadSessionMessages error:", error);
    return [];
  }

  return data.map((m) => ({
    id: m.id,
    role: m.role as "user" | "sisi",
    content: m.content,
    createdAt: m.created_at,
    suggestedSave: m.suggested_save ?? false,
    saveReason: m.save_reason ?? undefined,
  }));
}

/** 세션 삭제 (cascade로 messages도 함께 삭제). */
export async function deleteSession(sessionId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = createClient();
  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) console.error("deleteSession error:", error);
}
