"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  getStarById,
  loadSignsForStar,
  addSign,
  deleteStar,
  updateStar,
  type Star,
  type Sign,
  type Timeframe,
} from "@/lib/myStars";

export const dynamic = "force-dynamic";

/**
 * /my-stars/[id] — 별 detail view.
 *   - 큰 별 아이콘 + 소원 이름 + timeframe
 *   - Signs timeline
 *   - Add a sign, Edit wish, Release (delete)
 */
export default function StarDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [star, setStar] = useState<Star | null>(null);
  const [signs, setSigns] = useState<Sign[]>([]);
  const [showAddSign, setShowAddSign] = useState(false);
  const [newSignText, setNewSignText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getStarById(params.id);
      if (cancelled) return;
      if (!s) {
        router.push("/my-stars");
        return;
      }
      setStar(s);
      const sgs = await loadSignsForStar(params.id);
      if (!cancelled) setSigns(sgs);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  async function handleAddSign() {
    if (!newSignText.trim() || !star) return;
    const sign = await addSign(star.id, newSignText);
    setSigns([sign, ...signs]);
    setNewSignText("");
    setShowAddSign(false);
  }

  async function handleDelete() {
    if (!star) return;
    await deleteStar(star.id);
    router.push("/my-stars");
  }

  async function handleEditSave(newWish: string, newTimeframe: Timeframe) {
    if (!star) return;
    await updateStar(star.id, { wish: newWish, timeframe: newTimeframe });
    setStar({ ...star, wish: newWish.trim(), timeframe: newTimeframe });
    setShowEdit(false);
  }

  if (!star) return null;

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#1a1737]">
      {/* Video background */}
      <video
        src="/mystars/aftersendingstar.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1737]/60 via-[#1a1737]/40 to-[#1a1737]/70" />

      <div className="relative z-10 flex min-h-screen flex-col text-white">
        {/* Header */}
        <header className="flex items-center justify-between pt-[52px] px-[24px]">
          <Link
            href="/my-stars"
            aria-label="back"
            className="h-9 w-9 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg hover:bg-white/30 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg hover:bg-white/30 transition"
              aria-label="options"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 bg-white/95 backdrop-blur-md rounded-[12px] shadow-2xl overflow-hidden min-w-[170px]"
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowEdit(true);
                    }}
                    className="font-sentient text-[14px] text-journey-navy px-[16px] py-[12px] w-full text-left hover:bg-black/5 flex items-center gap-2"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    Edit wish
                  </button>
                  <div className="h-px bg-journey-navy/10 mx-2" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowConfirmDelete(true);
                    }}
                    className="font-sentient text-[14px] text-journey-oxblood px-[16px] py-[12px] w-full text-left hover:bg-black/5 flex items-center gap-2"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    Release star
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Big star icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center pt-[24px]"
        >
          <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
            {/* Middle glow (warm orange) */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 128,
                height: 128,
                background: "radial-gradient(circle, rgba(238,137,79,0.5) 0%, rgba(238,137,79,0.2) 50%, transparent 90%)",
                filter: "blur(10px)",
                zIndex: 2,
              }}
            />
            {/* Inner halo (warm cream-orange) */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 80,
                height: 80,
                background: "radial-gradient(circle, rgba(255,181,112,1) 0%, rgba(255,181,112,0.35) 55%, transparent 100%)",
                filter: "blur(8px)",
                zIndex: 3,
              }}
            />
            {/* Star — 앞 layer */}
            <svg
              width="80"
              height="80"
              viewBox="0 0 100 100"
              className="relative"
              style={{ zIndex: 4 }}
            >
              <defs>
                <radialGradient id="detail-star-grad" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="rgb(255,248,225)" />
                  <stop offset="35%" stopColor="rgb(255,236,189)" />
                  <stop offset="100%" stopColor="rgb(251,198,106)" />
                </radialGradient>
              </defs>
              <path
                d="M50 5 L61 39 L95 39 L68 60 L79 95 L50 74 L21 95 L32 60 L5 39 L39 39 Z"
                fill="url(#detail-star-grad)"
              />
              <circle cx="50" cy="50" r="7" fill="rgb(255,248,225)" opacity="0.9" />
            </svg>
          </div>
          <h1 className="font-sentient text-[28px] text-white/95 mt-[16px] text-center px-[24px]">
            {star.wish}
          </h1>
          <p className="font-sentient italic text-[16px] text-white/60 mt-[4px]">
            {star.timeframe}
          </p>
        </motion.div>

        {/* Signs section */}
        <div className="flex-1 px-[24px] mt-[32px] mb-[24px] overflow-y-auto">
          <div className="flex items-center justify-between mb-[12px]">
            <p className="font-sentient text-[12px] text-white/70 tracking-widest uppercase">
              Signs gathered
            </p>
            <p className="font-sentient text-[13px] text-white/60">
              {signs.length}
            </p>
          </div>

          <div className="space-y-[10px]">
            {signs.length === 0 ? (
              <p className="font-sentient text-[14px] text-white/50 py-[24px] text-center">
                No signs yet.
                <br />
                Signs will appear as you journey.
              </p>
            ) : (
              signs.map((sign) => <SignCard key={sign.id} sign={sign} />)
            )}
          </div>

          {/* Add sign */}
          {!showAddSign ? (
            <button
              onClick={() => setShowAddSign(true)}
              className="font-sentient text-[14px] w-full rounded-[16px] bg-white/10 border border-dashed border-white/25 text-white/80 py-[14px] mt-[16px] hover:bg-white/15 transition"
            >
              + Add a sign
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-[16px] bg-white/95 backdrop-blur-md rounded-[16px] p-[16px]"
            >
              <textarea
                value={newSignText}
                onChange={(e) => setNewSignText(e.target.value)}
                placeholder="A sign from your journey..."
                rows={2}
                autoFocus
                className="font-sentient w-full text-[15px] text-journey-navy placeholder:text-journey-navy/40 outline-none resize-none bg-transparent leading-snug"
              />
              <div className="flex justify-end gap-[8px] mt-[8px]">
                <button
                  onClick={() => {
                    setShowAddSign(false);
                    setNewSignText("");
                  }}
                  className="font-sentient text-[13px] text-journey-navy/60 px-[12px] py-[6px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSign}
                  disabled={!newSignText.trim()}
                  className="font-sentient text-[14px] rounded-[16px] bg-[#B19CD9] text-journey-navy px-[16px] h-[36px] disabled:opacity-40 transition"
                >
                  Add
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {showEdit && star && (
          <EditWishModal
            star={star}
            onSave={handleEditSave}
            onCancel={() => setShowEdit(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {showConfirmDelete && (
          <ConfirmDeleteModal
            wish={star.wish}
            onConfirm={handleDelete}
            onCancel={() => setShowConfirmDelete(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function SignCard({ sign }: { sign: Sign }) {
  const date = new Date(sign.createdAt);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-[14px] px-[16px] py-[12px] border border-white/10">
      <p className="font-sentient text-[11px] text-white/50 uppercase tracking-wider mb-[4px]">
        {dateStr}
      </p>
      <p className="font-sentient text-[15px] text-white/90 leading-snug">
        {sign.text}
      </p>
    </div>
  );
}

/** Edit wish modal — 소원 이름 + timeframe 편집 */
function EditWishModal({
  star,
  onSave,
  onCancel,
}: {
  star: Star;
  onSave: (wish: string, tf: Timeframe) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(star.wish);
  const [timeframe, setTimeframe] = useState<Timeframe>(star.timeframe);

  const canSave = text.trim().length > 0;

  const timeframes: Timeframe[] = [
    "this month",
    "this season",
    "this year",
    "someday",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-40 flex items-center justify-center px-[24px] bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[340px] rounded-[16px] bg-[#f7f2e3] shadow-2xl p-[24px]"
      >
        <div className="flex items-center justify-between mb-[16px]">
          <h3 className="font-sentient text-[13px] text-journey-navy tracking-widest uppercase">
            Edit wish
          </h3>
          <button onClick={onCancel} aria-label="close" className="text-journey-navy/60">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 80))}
          rows={2}
          autoFocus
          className="font-sentient w-full bg-transparent text-[18px] text-journey-navy placeholder:text-journey-navy/40 outline-none resize-none leading-snug border-b border-journey-navy/20 pb-2"
        />
        <p className="text-[11px] font-mono text-journey-navy/40 text-right mt-1">
          {text.length}/80
        </p>

        <p className="font-sentient text-[12px] text-journey-navy/70 tracking-widest uppercase mt-[16px] mb-[10px]">
          By when?
        </p>
        <div className="grid grid-cols-2 gap-[8px]">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`font-sentient text-[14px] rounded-[10px] h-[42px] transition ${
                timeframe === tf
                  ? "bg-journey-navy text-white"
                  : "bg-white/60 border border-journey-navy/15 text-journey-navy hover:bg-white/90"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-[20px] pt-[12px] border-t border-journey-navy/10">
          <button
            onClick={onCancel}
            className="font-sentient text-[13px] text-journey-navy/60 tracking-widest uppercase"
          >
            Cancel
          </button>
          <button
            onClick={() => canSave && onSave(text, timeframe)}
            disabled={!canSave}
            className="font-sentient text-[15px] rounded-[20px] bg-[#B19CD9] text-journey-navy px-[20px] h-[40px] disabled:opacity-40 transition"
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Confirmation modal — 별 놓아주기 확인 (dark night theme + warm accents) */
function ConfirmDeleteModal({
  wish,
  onConfirm,
  onCancel,
}: {
  wish: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-40 flex items-center justify-center px-[24px] bg-black/70 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[340px] rounded-[24px] p-[28px] text-center"
        style={{
          background:
            "linear-gradient(180deg, rgba(35, 30, 75, 0.96) 0%, rgba(20, 17, 55, 0.96) 100%)",
          border: "1px solid rgba(255, 236, 189, 0.14)",
          boxShadow:
            "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(238, 137, 79, 0.08)",
        }}
      >
        {/* Fading star icon — 놓아주는 별의 시각적 신호 */}
        <div className="flex justify-center mb-[18px]">
          <div className="relative flex items-center justify-center" style={{ width: 60, height: 60 }}>
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 55,
                height: 55,
                background: "radial-gradient(circle, rgba(238,137,79,0.25), transparent 90%)",
                filter: "blur(6px)",
              }}
            />
            <svg width="42" height="42" viewBox="0 0 100 100" className="relative" style={{ opacity: 0.55 }}>
              <defs>
                <radialGradient id="fading-star" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="rgb(255,248,225)" />
                  <stop offset="35%" stopColor="rgb(255,236,189)" />
                  <stop offset="100%" stopColor="rgb(251,198,106)" />
                </radialGradient>
              </defs>
              <path
                d="M50 5 L61 39 L95 39 L68 60 L79 95 L50 74 L21 95 L32 60 L5 39 L39 39 Z"
                fill="url(#fading-star)"
              />
            </svg>
          </div>
        </div>

        <p className="font-sentient text-[22px] text-white/95 mb-[10px] leading-tight">
          Release this star?
        </p>
        <p
          className="font-sentient italic text-[15px] mb-[20px] leading-snug"
          style={{ color: "rgb(255, 236, 189)" }}
        >
          &ldquo;{wish}&rdquo;
        </p>
        <p className="font-sentient text-[13px] text-white/55 mb-[26px] leading-relaxed">
          Once released, this wish and all its signs
          <br />
          will fade away into the sky.
        </p>

        <div className="flex gap-[10px]">
          <button
            onClick={onCancel}
            className="flex-1 font-sentient text-[15px] rounded-full bg-white/10 border border-white/20 text-white h-[48px] backdrop-blur-sm hover:bg-white/15 active:scale-95 transition"
          >
            Keep it
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 font-sentient text-[15px] rounded-full text-white h-[48px] active:scale-95 transition"
            style={{
              background:
                "linear-gradient(135deg, rgb(196, 132, 124) 0%, rgb(122, 46, 46) 100%)",
              boxShadow: "0 8px 20px rgba(122, 46, 46, 0.4)",
            }}
          >
            Release
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
