/**
 * lib/myStars — Wish 데이터 모델 + hybrid persistence.
 *
 * *별* = 소원(wish). 하늘의 특정 position(x, y)에 자리잡음.
 * *Sign* = 그 별에 대한 journey entry.
 *
 * Persistence: 로그인 상태면 Supabase, 아니면 localStorage.
 * 모든 read/write 함수는 async.
 */

import { createMoment, detachStar, loadMoments, loadStarMoments, toMomentType, updateMoment, type Moment } from "@/lib/momentStore";
import { createClient } from "@/lib/supabase/client";
import { LOCAL_ONLY } from "@/lib/dataMode";

export type Timeframe = "this month" | "this season" | "this year" | "someday";

export type Star = {
  id: string;
  wish: string;
  timeframe: Timeframe;
  /** Sky position (0-100%) — sky 배경 이미지 상 x, y 위치 */
  x: number;
  y: number;
  /** 별 크기 (스몰/미디엄/라지, 시각적 다양성) */
  size: "sm" | "md" | "lg";
  createdAt: string; // ISO
  /** 도착 시각 — null이면 아직 Following, 있으면 Constellation에 속함 */
  fulfilledAt?: string | null;
  /**
   * "Let this Star rest" — leaves the Star path but stays in Moments.
   * null/undefined = still walking toward it.
   */
  restedAt?: string | null;
};

/**
 * Entries on a Star after its wish (never new wishes):
 *   something_good  "Something good" — a hopeful thing, gratitude, a kind
 *                   word, a small opportunity, a meaningful coincidence
 *   small_step      "A step I took" — a real action toward the wish
 * Older entries (reflections, captured moments) have no kind.
 * The same record is the Star's timeline entry AND the Moment — never copied.
 */
export type EntryKind = "something_good" | "small_step";

/** Read older saved entries ("good" / "step") in the current form. */
export function normalizeKind(k: unknown): EntryKind | undefined {
  const t = toMomentType(k);
  return t === "something_good" || t === "small_step" ? t : undefined;
}

export type Sign = {
  id: string;
  starId: string;
  text: string;
  createdAt: string; // ISO
  kind?: EntryKind;
  /** owner (null on this device before sign-in) */
  userId?: string | null;
  /** a photo, when the entry is a connected Journey Moment */
  image?: string;
  /** companion_note / general entries keep their own label */
  momentType?: string;
};

const STARS_KEY = "sisi:stars";
// Star entries now live in lib/momentStore ("sisi:signs" is kept as a backup).

// ─── Auth helper ─────────────────────────────────

/**
 * 현재 로그인 유저 반환 (없으면 null).
 * Supabase 응답 실패해도 조용히 null 반환 (오프라인 대응).
 */
async function getCurrentUser() {
  if (LOCAL_ONLY) return null; // redesign branch: device-only data
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

// ─── DB row ↔ Type mappers ───────────────────────

type StarRow = {
  id: string;
  wish: string;
  timeframe: Timeframe;
  x: string | number;
  y: string | number;
  size: "sm" | "md" | "lg";
  created_at: string;
  fulfilled_at?: string | null;
  rested_at?: string | null;
};

function dbToStar(row: StarRow): Star {
  return {
    id: row.id,
    wish: row.wish,
    timeframe: row.timeframe,
    x: Number(row.x),
    y: Number(row.y),
    size: row.size,
    createdAt: row.created_at,
    fulfilledAt: row.fulfilled_at ?? null,
    restedAt: row.rested_at ?? null,
  };
}


// ─── Stars ─────────────────────────────────

/** 모든 별 반환 (최신 순). */
export async function loadStars(): Promise<Star[]> {
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("stars")
      // "*" so this keeps working before/after the rested_at migration.
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadStars error:", error);
      return [];
    }
    return withLocalRest((data as StarRow[]).map(dbToStar));
  }

  // localStorage fallback (익명 사용자)
  if (typeof window === "undefined") return [];
  try {
    return withLocalRest(JSON.parse(localStorage.getItem(STARS_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

// ─── Resting stars ─────────────────────────────
// A resting star leaves the Star path but stays in Moments; it can return
// to the sky at any time. Stored in stars.rested_at (migration
// 002_star_rest.sql). Until that column exists — or for guests — the rest
// state is kept in localStorage so the feature works either way.

const RESTED_KEY = "sisi:rested-stars";

function readLocalRest(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(RESTED_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function writeLocalRest(map: Record<string, string>) {
  try {
    localStorage.setItem(RESTED_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
function withLocalRest(stars: Star[]): Star[] {
  const local = readLocalRest();
  return stars.map((s) => (s.restedAt || !local[s.id] ? s : { ...s, restedAt: local[s.id] }));
}

/** Let a star rest (leaves the Star path, stays in Moments). */
export async function restStar(id: string): Promise<void> {
  const now = new Date().toISOString();
  const user = await getCurrentUser();
  if (user) {
    const supabase = createClient();
    const { error } = await supabase
      .from("stars")
      .update({ rested_at: now, updated_at: now })
      .eq("id", id)
      .eq("user_id", user.id);
    if (!error) {
      const local = readLocalRest();
      delete local[id];
      writeLocalRest(local);
      return;
    }
    console.warn("restStar: falling back to local rest state:", error.message);
  }
  writeLocalRest({ ...readLocalRest(), [id]: now });
}

/** Return a resting star to the sky. */
export async function unrestStar(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    const supabase = createClient();
    const { error } = await supabase
      .from("stars")
      .update({ rested_at: null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) console.warn("unrestStar (db):", error.message);
  }
  const local = readLocalRest();
  delete local[id];
  writeLocalRest(local);
}

/** Stars still on the path (walking toward them), newest first. */
export function walkingStars(stars: Star[]): Star[] {
  return stars.filter((s) => !s.restedAt);
}
/** Stars resting in Moments, newest first. */
export function restingStars(stars: Star[]): Star[] {
  return stars.filter((s) => !!s.restedAt);
}

/** 별 저장. */
export async function saveStar(star: Star): Promise<void> {
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { error } = await supabase.from("stars").insert({
      id: star.id,
      user_id: user.id,
      wish: star.wish,
      timeframe: star.timeframe,
      x: star.x,
      y: star.y,
      size: star.size,
    });
    if (error) console.error("saveStar error:", error);
    return;
  }

  // localStorage fallback
  const stars = await loadStars();
  stars.unshift(star);
  localStorage.setItem(STARS_KEY, JSON.stringify(stars));
}

/** ID로 별 하나 가져오기. */
export async function getStarById(id: string): Promise<Star | undefined> {
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("stars")
      .select("id, wish, timeframe, x, y, size, created_at, fulfilled_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) return undefined;
    return dbToStar(data as StarRow);
  }

  const stars = await loadStars();
  return stars.find((s) => s.id === id);
}

/** 별 삭제 (그 별의 signs도 CASCADE로 자동 삭제). */
export async function deleteStar(id: string): Promise<void> {
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { error } = await supabase
      .from("stars")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) console.error("deleteStar error:", error);
    await detachStar(id);
    return;
  }

  // localStorage fallback
  const stars = await loadStars();
  const filtered = stars.filter((s) => s.id !== id);
  localStorage.setItem(STARS_KEY, JSON.stringify(filtered));
  // Its Moments stay (they are the user's life, not the Star's property).
  await detachStar(id);
}

/**
 * 별을 "도착"으로 마킹 — Constellation으로 이동.
 * fulfilled_at을 현재 시각으로 설정.
 */
export async function fulfillStar(id: string): Promise<void> {
  const now = new Date().toISOString();
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { error } = await supabase
      .from("stars")
      .update({ fulfilled_at: now })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) console.error("fulfillStar error:", error);
    return;
  }

  // localStorage fallback
  const stars = await loadStars();
  const updated = stars.map((s) =>
    s.id === id ? { ...s, fulfilledAt: now } : s,
  );
  localStorage.setItem(STARS_KEY, JSON.stringify(updated));
}

/** 별 부분 업데이트 (wish + timeframe 지원). */
export async function updateStar(
  id: string,
  updates: { wish?: string; timeframe?: Timeframe },
): Promise<void> {
  const trimmed = {
    ...(updates.wish !== undefined ? { wish: updates.wish.trim() } : {}),
    ...(updates.timeframe !== undefined ? { timeframe: updates.timeframe } : {}),
  };
  if (Object.keys(trimmed).length === 0) return;

  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { error } = await supabase
      .from("stars")
      .update({ ...trimmed, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) console.error("updateStar error:", error);
    return;
  }

  // localStorage fallback
  const stars = await loadStars();
  const updated = stars.map((s) =>
    s.id === id ? { ...s, ...trimmed } : s,
  );
  localStorage.setItem(STARS_KEY, JSON.stringify(updated));
}

// ─── Signs ─────────────────────────────────

/*
 * Star entries are Moments (lib/momentStore) — the ONE saved record that
 * Moments and a Star's Full Journey both show. These functions keep their
 * old shape so every existing caller works unchanged.
 */
function toSign(m: Moment): Sign {
  const kind = m.type === "something_good" || m.type === "small_step" ? m.type : undefined;
  return {
    id: m.id,
    starId: m.starId ?? "",
    text: m.text ?? "",
    createdAt: m.createdAt,
    ...(kind ? { kind } : {}),
    userId: m.userId,
    ...(m.image ? { image: m.image } : {}),
    momentType: m.type,
  };
}

/** Every Moment connected to a Star, newest first. */
export async function loadSigns(): Promise<Sign[]> {
  return (await loadMoments()).filter((m) => m.starId).map(toSign);
}

/** One Star's entries (its Full Journey), newest first. */
export async function loadSignsForStar(starId: string): Promise<Sign[]> {
  return (await loadStarMoments(starId)).map(toSign);
}

export async function addSign(
  starId: string,
  text: string,
  /** Where it came from — "chat" is an insight kept from a talk with Sísí. */
  source: "manual" | "chat" | "postcard" = "manual",
  kind?: EntryKind,
): Promise<Sign> {
  const m = await createMoment({
    source: source === "chat" ? "sisi_conversation" : source === "postcard" ? "journey_capture" : "star_check_in",
    type: kind ?? "general",
    text,
    starId,
  });
  return toSign(m);
}

/** Edit the words of an entry — everywhere it appears. */
export async function updateSign(id: string, text: string): Promise<void> {
  await updateMoment(id, { text });
}

export function generateStarPosition(existingStars: Star[]): {
  x: number;
  y: number;
  size: Star["size"];
} {
  const MAX_ATTEMPTS = 20;
  const MIN_DISTANCE = 12; // %

  const safeX = { min: 10, max: 88 };
  const safeY = { min: 10, max: 55 }; // 하단은 fox 영역 → 피함

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const x = safeX.min + Math.random() * (safeX.max - safeX.min);
    const y = safeY.min + Math.random() * (safeY.max - safeY.min);

    const tooClose = existingStars.some((s) => {
      const dx = s.x - x;
      const dy = s.y - y;
      return Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE;
    });

    if (!tooClose) {
      const sizes: Star["size"][] = ["sm", "md", "md", "lg"];
      return {
        x,
        y,
        size: sizes[Math.floor(Math.random() * sizes.length)],
      };
    }
  }

  // Fallback: 그냥 랜덤 (많은 별 있을 때)
  return {
    x: safeX.min + Math.random() * (safeX.max - safeX.min),
    y: safeY.min + Math.random() * (safeY.max - safeY.min),
    size: "md",
  };
}

// ─── Helpers ──────────────────────────────

/**
 * 새 별 객체 생성 (아직 저장 안 됨 — sending 애니메이션 중 후에 saveStar 호출).
 * existingStars는 caller가 이미 로드한 state에서 전달 (position 겹침 방지용).
 */
export function createStar(
  wish: string,
  timeframe: Timeframe,
  existingStars: Star[] = [],
): Star {
  const pos = generateStarPosition(existingStars);
  return {
    id: crypto.randomUUID(),
    wish: wish.trim(),
    timeframe,
    x: pos.x,
    y: pos.y,
    size: pos.size,
    createdAt: new Date().toISOString(),
  };
}

/** 시간대별 정렬 (최신 위) */
export function starsByTimeframe(stars: Star[]): Record<Timeframe, Star[]> {
  const map: Record<Timeframe, Star[]> = {
    "this month": [],
    "this season": [],
    "this year": [],
    "someday": [],
  };
  for (const s of stars) {
    if (map[s.timeframe]) map[s.timeframe].push(s);
  }
  return map;
}

/** Following = 아직 도착 안 한 별 (활성) */
export function followingStars(stars: Star[]): Star[] {
  return stars.filter((s) => !s.fulfilledAt);
}

/** Constellation = 이미 도착한 별 (완료) */
export function constellationStars(stars: Star[]): Star[] {
  return stars.filter((s) => !!s.fulfilledAt);
}
