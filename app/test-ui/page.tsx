"use client";

import PaperBackground from "@/components/sisi/PaperBackground";
import PaperPage from "@/components/sisi/PaperPage";
import MinimalAudioPlayer from "@/components/sisi/MinimalAudioPlayer";
import BookGallery, { BookCard } from "@/components/sisi/BookGallery";
import VintageDateMark from "@/components/sisi/VintageDateMark";
import Link from "next/link";

const DEMO_BOOKS = [
  { title: "rest in the knowing.", subtitle: "sleep meditation", label: "sleep", accent: "plum" as const },
  { title: "calling in love.", subtitle: "heart opening", label: "love", accent: "rose" as const, listened: true },
  { title: "already abundant.", subtitle: "morning practice", label: "abundance", accent: "gold" as const },
  { title: "the quiet self.", subtitle: "inner peace", label: "peace", accent: "sage" as const },
  { title: "she who knows.", subtitle: "self-worth", label: "self", accent: "coral" as const, locked: true },
  { title: "live in the end.", subtitle: "assumption work", label: "manifest", accent: "plum" as const },
];

export default function TestUIPage() {
  const today = new Date();

  return (
    <PaperBackground className="min-h-screen paper-edge">
      <div className="max-w-lg mx-auto px-6 py-12 space-y-16">

        <div>
          <Link href="/app" className="font-garamond text-sm text-[#6B5648]/50 hover:text-[#3D2E25] transition-colors">
            ← back
          </Link>
          <h1 className="font-fraunces text-3xl text-[#3D2E25] mt-6">ui components</h1>
          <p className="font-garamond italic text-[#6B5648]/50 text-sm mt-1">skeuomorphic — sophisticated</p>
        </div>

        {/* ── VintageDateMark ── */}
        <section>
          <p className="font-garamond text-xs text-[#6B5648]/40 uppercase tracking-widest mb-5">
            VintageDateMark
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            <VintageDateMark date={today} format="short" />
            <VintageDateMark date={today} format="long" />
            <VintageDateMark date={today} format="chapter" />
            <VintageDateMark date={today} format="chapter" tint />
          </div>
        </section>

        {/* ── PaperPage ── */}
        <section>
          <p className="font-garamond text-xs text-[#6B5648]/40 uppercase tracking-widest mb-5">
            PaperPage
          </p>
          <div className="space-y-4">
            <PaperPage variant="card" accent="gold" className="p-6">
              <VintageDateMark date={today} format="chapter" />
              <p className="font-fraunces text-xl text-[#3D2E25] mt-3 mb-2">
                i noticed something today.
              </p>
              <p className="font-garamond italic text-[#6B5648] text-sm leading-relaxed">
                the way light came through the window at exactly the right time.
                that felt like a sign.
              </p>
            </PaperPage>

            <PaperPage variant="page" accent="rose" className="p-8 mx-auto">
              <p className="font-garamond text-xs text-[#C4847C]/60 uppercase tracking-widest mb-6">
                capture
              </p>
              <p className="font-fraunces text-2xl text-[#3D2E25] leading-snug mb-4">
                what did you notice today?
              </p>
              <p className="font-garamond italic text-[#6B5648]/60 text-sm leading-relaxed">
                the universe keeps records. so do we.
              </p>
            </PaperPage>
          </div>
        </section>

        {/* ── MinimalAudioPlayer ── */}
        <section>
          <p className="font-garamond text-xs text-[#6B5648]/40 uppercase tracking-widest mb-5">
            MinimalAudioPlayer
          </p>
          <div className="space-y-4">
            <MinimalAudioPlayer
              title="rest in the knowing."
              category="sleep · 18 min"
              src=""
              accent="gold"
            />
            <MinimalAudioPlayer
              title="calling in love."
              category="love · 12 min"
              src=""
              accent="rose"
            />
          </div>
        </section>

        {/* ── BookGallery ── */}
        <section>
          <p className="font-garamond text-xs text-[#6B5648]/40 uppercase tracking-widest mb-5">
            BookGallery
          </p>
          <BookGallery cols={3} label="meditation library">
            {DEMO_BOOKS.map((b, i) => (
              <BookCard
                key={b.title}
                title={b.title}
                subtitle={b.subtitle}
                label={b.label}
                accent={b.accent}
                listened={b.listened}
                locked={b.locked}
                index={i}
                onClick={() => {}}
              />
            ))}
          </BookGallery>
        </section>

        {/* ── Shadow scale reference ── */}
        <section>
          <p className="font-garamond text-xs text-[#6B5648]/40 uppercase tracking-widest mb-5">
            shadow scale
          </p>
          <div className="flex gap-4 items-end">
            {[
              { label: "sm", shadow: "0 1px 2px rgba(61,46,37,0.04)" },
              { label: "md", shadow: "0 2px 6px rgba(61,46,37,0.06)" },
              { label: "lg", shadow: "0 4px 12px rgba(61,46,37,0.08)" },
            ].map(({ label, shadow }) => (
              <div key={label} className="flex flex-col items-center gap-3 flex-1">
                <div
                  className="w-full h-14 bg-[#FAF6F0]"
                  style={{ boxShadow: shadow }}
                />
                <span className="font-garamond text-xs text-[#6B5648]/40">{label}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </PaperBackground>
  );
}
