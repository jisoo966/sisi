/**
 * lib/sisiConversation — one continuous conversation with Sísí.
 *
 *   - one conversationId stays active while the talk continues; reopening
 *     the paper resumes it (a new one starts only after a long pause, or
 *     when the person chooses "Start a new conversation")
 *   - the thread lives on this device for the browser session only
 *     (sessionStorage): the conversation itself is never saved to Moments
 *     or the server; only words the person chooses to keep
 *   - every request carries the ordered history (last 12 turns), a rolling
 *     summary, the entities and topic Sísí is tracking, and the stage
 *   - Sísí's hidden metadata (§META {...}) is stripped from what is shown
 */

export type ConversationStage = "opening" | "understanding" | "deepening" | "supporting" | "optional_action" | "closing";

export type ConversationMeta = {
  stage: ConversationStage;
  /** short notes: "Ahri — the user's dog, beside them right now" */
  entities: string[];
  topic: string;
  /** rolling summary of everything so far (≤ ~60 words) */
  summary: string;
};

export type ChatTurn = { role: "user" | "assistant"; content: string; at: number };

export type Conversation = {
  id: string;
  startedAt: number;
  updatedAt: number;
  turns: ChatTurn[];
  meta: ConversationMeta | null;
};

const KEY = "sisi:conversation";
/** after this long without a word, the next opening starts fresh */
const IDLE_MS = 3 * 60 * 60 * 1000;
/** complete turns sent with each request (a turn = the person + Sísí) */
export const HISTORY_TURNS = 12;

const STAGES: ConversationStage[] = ["opening", "understanding", "deepening", "supporting", "optional_action", "closing"];

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function newConversation(): Conversation {
  const now = Date.now();
  const c: Conversation = { id: uid(), startedAt: now, updatedAt: now, turns: [], meta: null };
  saveConversation(c);
  return c;
}

/** The active conversation (resumed), or a new one after a long pause. */
export function activeConversation(): Conversation {
  if (typeof window === "undefined") return { id: "ssr", startedAt: 0, updatedAt: 0, turns: [], meta: null };
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw) as Conversation;
      if (c?.id && Array.isArray(c.turns) && Date.now() - c.updatedAt < IDLE_MS) {
        c.turns.sort((a, b) => a.at - b.at);
        return c;
      }
    }
  } catch {
    // start fresh
  }
  return newConversation();
}

export function saveConversation(c: Conversation) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // storage full / blocked: the talk still works in memory
  }
}

/** Append a turn (no duplicates: the same role + text within 2s is ignored). */
export function addTurn(c: Conversation, role: ChatTurn["role"], content: string): Conversation {
  const text = content.trim();
  if (!text) return c;
  const last = c.turns[c.turns.length - 1];
  if (last && last.role === role && last.content === text && Date.now() - last.at < 2000) return c;
  const next: Conversation = { ...c, updatedAt: Date.now(), turns: [...c.turns, { role, content: text, at: Date.now() }] };
  saveConversation(next);
  return next;
}

export function setMeta(c: Conversation, meta: ConversationMeta | null): Conversation {
  if (!meta) return c;
  const next = { ...c, meta, updatedAt: Date.now() };
  saveConversation(next);
  return next;
}

/**
 * The request body for /api/chat: ordered, alternating history (last N
 * complete turns, ending with the newest user message) plus the state.
 */
export function requestPayload(c: Conversation, extra: Record<string, unknown> = {}) {
  const ordered = [...c.turns].sort((a, b) => a.at - b.at);
  // keep the last HISTORY_TURNS user messages and everything after the first of them
  let users = 0;
  let start = ordered.length;
  for (let i = ordered.length - 1; i >= 0; i--) {
    if (ordered[i].role === "user") users++;
    if (users > HISTORY_TURNS) break;
    start = i;
  }
  const messages = ordered.slice(start).map(({ role, content }) => ({ role, content }));
  return {
    conversationId: c.id,
    messages,
    summary: c.meta?.summary ?? "",
    entities: c.meta?.entities ?? [],
    topic: c.meta?.topic ?? "",
    stage: c.meta?.stage ?? "opening",
    earlierTurnsOmitted: start > 0,
    ...extra,
  };
}

/* ── the reply text ───────────────────────────────────────────────── */

/** Invisible markers Sísí may add: stripped from the text. */
export const MARKERS = /\[(?:SAVE|MOOD|ACTION|VISIT):[a-z0-9_]+\]|\[CHIPS:[^\]]*\]/gi;
/** a marker still arriving mid-stream ("[CHIPS:I don…") is never shown */
const PARTIAL = /\[[A-Z]{0,6}(?::[^\]]*)?$/;
const META_AT = /§\s*META[\s\S]*$/;
const META_PARTIAL = /§[\s\S]*$/;

/** What the person sees: no markers, no metadata (also mid-stream). */
export function visibleText(acc: string): string {
  return acc.replace(META_AT, "").replace(META_PARTIAL, "").replace(MARKERS, "").replace(PARTIAL, "").trim();
}

/** The reply without its metadata block (markers kept, for parsing). */
export function withoutMeta(acc: string): string {
  return acc.replace(META_AT, "").trim();
}

export function parseMeta(acc: string): ConversationMeta | null {
  const m = /§\s*META\s*(\{[\s\S]*\})\s*$/.exec(acc);
  if (!m) return null;
  try {
    const j = JSON.parse(m[1]);
    const stage = STAGES.includes(j.stage) ? (j.stage as ConversationStage) : "understanding";
    const entities = Array.isArray(j.entities)
      ? j.entities.filter((e: unknown) => typeof e === "string").map((e: string) => e.slice(0, 120)).slice(0, 10)
      : [];
    return {
      stage,
      entities,
      topic: typeof j.topic === "string" ? j.topic.slice(0, 160) : "",
      summary: typeof j.summary === "string" ? j.summary.slice(0, 600) : "",
    };
  } catch {
    return null;
  }
}

/** Actions are earned: only once Sísí herself says the talk has reached that point. */
export function actionAllowed(kind: "save" | "step" | "visit" | "walk", stage: ConversationStage | undefined): boolean {
  if (!stage) return false;
  if (kind === "step" || kind === "visit") return stage === "optional_action";
  if (kind === "walk") return stage === "supporting" || stage === "closing" || stage === "optional_action";
  return stage !== "opening" && stage !== "understanding";
}
