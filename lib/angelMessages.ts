/**
 * lib/angelMessages — Angel Message client helpers.
 *
 * Angel Message = Sísí가 가끔 남기고 가는 짧은 편지.
 * 서버에서 Claude로 생성, DB(angel_messages)에 저장, read_at 관리.
 */

export type AngelMessage = {
  id: string;
  content: string;
  sent_at: string;
  read_at: string | null;
  related_star_id: string | null;
};

/** 안 읽은 최근 message 하나 반환 (없으면 null). */
export async function getUnreadMessage(): Promise<AngelMessage | null> {
  try {
    const res = await fetch("/api/angel-message", {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.message ?? null;
  } catch {
    return null;
  }
}

/**
 * 새 message 생성 (24시간 내 이미 있으면 그거 반환).
 * 오늘 처음 앱 여는 순간 호출하면 좋음.
 */
export async function ensureTodaysMessage(): Promise<AngelMessage | null> {
  try {
    const res = await fetch("/api/angel-message", {
      method: "POST",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.message ?? null;
  } catch {
    return null;
  }
}

/** Message를 읽었다고 mark. */
export async function markAsRead(id: string): Promise<boolean> {
  try {
    const res = await fetch("/api/angel-message", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
