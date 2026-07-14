/**
 * lib/postcards — Postcard 데이터 모델 + hybrid persistence.
 *
 * Postcard = journey에서 캡쳐한 순간 (사진 + reflection text + stamp + date).
 *
 * Persistence:
 *   - 로그인 시 → Supabase Storage (postcards bucket) + postcards 테이블
 *   - 익명 시 → localStorage (dataURL 그대로)
 *
 * 모든 read/write 함수는 async.
 */

import { createClient } from "@/lib/supabase/client";

export type Postcard = {
  id: string;
  text: string;
  /** dataURL (익명) 또는 signed URL (로그인) — 둘 다 <img src>에 그대로 사용 가능 */
  image: string;
  width?: number;
  height?: number;
  takenAt?: string;
  createdAt: string;
};

const STORAGE_KEY = "sisi:postcards";
const BUCKET = "postcards";
const SIGNED_URL_TTL = 60 * 60 * 24; // 24시간 (재로드 시 새로 발급)

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

// ─── Image conversion ─────────────────────────────

async function dataURLToBlob(dataURL: string): Promise<Blob> {
  const res = await fetch(dataURL);
  return await res.blob();
}

// ─── DB row → Postcard mapper ─────────────────────

type PostcardRow = {
  id: string;
  text: string | null;
  image_url: string;
  image_width: number | null;
  image_height: number | null;
  taken_at: string | null;
  created_at: string;
};

async function rowToPostcard(
  row: PostcardRow,
  supabase: ReturnType<typeof createClient>,
): Promise<Postcard> {
  const { data: urlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.image_url, SIGNED_URL_TTL);

  return {
    id: row.id,
    text: row.text ?? "",
    image: urlData?.signedUrl ?? "",
    width: row.image_width ?? undefined,
    height: row.image_height ?? undefined,
    takenAt: row.taken_at ?? undefined,
    createdAt: row.created_at,
  };
}

// ─── CRUD ─────────────────────────────────────────

/** 모든 postcard 반환 (최신 순). */
export async function loadPostcards(): Promise<Postcard[]> {
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("postcards")
      .select(
        "id, text, image_url, image_width, image_height, taken_at, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadPostcards error:", error);
      return [];
    }

    return Promise.all(
      (data as PostcardRow[]).map((row) => rowToPostcard(row, supabase)),
    );
  }

  // localStorage fallback
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** 최근 postcard 하나 (savedReveal 페이지용). */
export async function getLatestPostcard(): Promise<Postcard | null> {
  const list = await loadPostcards();
  return list[0] ?? null;
}

/** 새 postcard 저장 (image + text). */
export async function savePostcard(input: {
  text: string;
  imageDataURL: string;
  width?: number;
  height?: number;
  takenAt?: string;
}): Promise<Postcard> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();

    // 1. dataURL → Blob
    const blob = await dataURLToBlob(input.imageDataURL);

    // 2. Storage upload — path: {user_id}/{postcard_id}.jpg
    const path = `${user.id}/${id}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        contentType: blob.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("upload failed:", uploadError);
      throw uploadError;
    }

    // 3. postcards 테이블에 row 삽입
    const { error: insertError } = await supabase.from("postcards").insert({
      id,
      user_id: user.id,
      image_url: path,
      image_width: input.width ?? null,
      image_height: input.height ?? null,
      text: input.text || null,
      taken_at: input.takenAt || createdAt,
    });

    if (insertError) {
      console.error("insert failed:", insertError);
      // Rollback: storage cleanup
      await supabase.storage.from(BUCKET).remove([path]);
      throw insertError;
    }

    // 4. Signed URL for immediate display
    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);

    return {
      id,
      text: input.text,
      image: urlData?.signedUrl ?? "",
      width: input.width,
      height: input.height,
      takenAt: input.takenAt ?? createdAt,
      createdAt,
    };
  }

  // localStorage fallback (dataURL 그대로 저장)
  const postcard: Postcard = {
    id,
    text: input.text,
    image: input.imageDataURL,
    width: input.width,
    height: input.height,
    takenAt: input.takenAt ?? createdAt,
    createdAt,
  };

  const existing: Postcard[] = JSON.parse(
    localStorage.getItem(STORAGE_KEY) ?? "[]",
  );
  existing.unshift(postcard);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return postcard;
}

/** Postcard 삭제 (Storage 파일도 함께 정리). */
export async function deletePostcard(id: string): Promise<void> {
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();

    // 이미지 path 먼저 얻어야 storage에서 지울 수 있음
    const { data: row } = await supabase
      .from("postcards")
      .select("image_url")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (row?.image_url) {
      await supabase.storage.from(BUCKET).remove([row.image_url]);
    }

    const { error } = await supabase
      .from("postcards")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) console.error("deletePostcard error:", error);
    return;
  }

  // localStorage fallback
  const existing: Postcard[] = JSON.parse(
    localStorage.getItem(STORAGE_KEY) ?? "[]",
  );
  const filtered = existing.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
