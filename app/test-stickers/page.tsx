"use client";

import PaperBackground from "@/components/sisi/PaperBackground";
import Sticker from "@/components/sisi/Sticker";
import {
  StarSticker, MoonSticker, EyeSticker, HandSticker,
  HeartSticker, SunSticker, CrystalSticker, LeafSticker,
  RoseSticker, ButterflySticker, CandleSticker, KeySticker,
} from "@/components/sisi/stickers";
import Link from "next/link";

const LIBRARY = [
  { name: "star",      Component: StarSticker,      variant: "gold"  as const, rot: -4  },
  { name: "moon",      Component: MoonSticker,      variant: "plum"  as const, rot: 5   },
  { name: "eye",       Component: EyeSticker,       variant: "gold"  as const, rot: -2  },
  { name: "hand",      Component: HandSticker,       variant: "rose"  as const, rot: 6   },
  { name: "heart",     Component: HeartSticker,     variant: "rose"  as const, rot: -5  },
  { name: "sun",       Component: SunSticker,       variant: "gold"  as const, rot: 3   },
  { name: "crystal",   Component: CrystalSticker,   variant: "sage"  as const, rot: -3  },
  { name: "leaf",      Component: LeafSticker,      variant: "sage"  as const, rot: 7   },
  { name: "rose",      Component: RoseSticker,      variant: "coral" as const, rot: -6  },
  { name: "butterfly", Component: ButterflySticker, variant: "plum"  as const, rot: 4   },
  { name: "candle",    Component: CandleSticker,    variant: "gold"  as const, rot: -2  },
  { name: "key",       Component: KeySticker,       variant: "plum"  as const, rot: 8   },
];

export default function TestStickersPage() {
  return (
    <PaperBackground className="min-h-screen paper-edge">
      <div className="max-w-lg mx-auto px-6 py-12">

        <Link href="/app" className="font-garamond text-sm text-[#6B5648]/60 hover:text-[#3D2E25] transition-colors">
          ← back
        </Link>

        <h1 className="font-fraunces text-4xl text-[#3D2E25] mt-8 mb-1">sticker library</h1>
        <p className="font-garamond italic text-[#6B5648]/50 text-sm mb-10">hover each to see it lift.</p>

        {/* ── Full sticker library grid ── */}
        <section className="mb-14">
          <p className="font-garamond text-xs text-[#6B5648]/50 uppercase tracking-widest mb-6">all stickers — lg size</p>
          <div className="grid grid-cols-4 gap-6">
            {LIBRARY.map(({ name, Component, variant, rot }) => (
              <div key={name} className="flex flex-col items-center gap-2">
                <Sticker variant={variant} size="lg" rotation={rot} onClick={() => {}}>
                  <Component className="w-[55%] h-[55%]" />
                </Sticker>
                <span className="font-garamond text-xs text-[#6B5648]/40">{name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Multi-size demo ── */}
        <section className="mb-14">
          <p className="font-garamond text-xs text-[#6B5648]/50 uppercase tracking-widest mb-5">sizes</p>
          <div className="flex gap-5 items-end">
            {(["sm", "md", "lg"] as const).map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <Sticker variant="gold" size={s} rotation={-3}>
                  <SunSticker className="w-[55%] h-[55%]" />
                </Sticker>
                <span className="font-garamond text-xs text-[#6B5648]/40">{s}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Journal scatter scene ── */}
        <section className="mb-14">
          <p className="font-garamond text-xs text-[#6B5648]/50 uppercase tracking-widest mb-5">journal scatter</p>
          <div className="relative bg-[#FAF6F0] paper-shadow border border-[#3D2E25]/5 p-8 min-h-[280px]">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="absolute w-full border-b border-[#3D2E25]/5"
                style={{ top: `${36 + i * 26}px`, left: 0 }} />
            ))}
            <p className="font-fraunces text-xl text-[#3D2E25] relative z-10 mb-2">i am already her.</p>
            <p className="font-garamond italic text-[#6B5648]/60 text-sm relative z-10 leading-6">
              the version of me who has it all exists right now.<br/>
              i am not waiting. i am becoming.
            </p>
            <div className="absolute top-3 right-3 z-20">
              <Sticker variant="gold" size="sm" rotation={14}>
                <StarSticker className="w-[55%] h-[55%]" />
              </Sticker>
            </div>
            <div className="absolute bottom-5 right-6 z-20">
              <Sticker variant="rose" size="md" rotation={-9}>
                <HeartSticker className="w-[55%] h-[55%]" />
              </Sticker>
            </div>
            <div className="absolute top-6 right-16 z-20">
              <Sticker variant="sage" size="sm" rotation={5}>
                <LeafSticker className="w-[55%] h-[55%]" />
              </Sticker>
            </div>
            <div className="absolute bottom-8 left-5 z-20">
              <Sticker variant="plum" size="sm" rotation={-7}>
                <MoonSticker className="w-[55%] h-[55%]" />
              </Sticker>
            </div>
          </div>
        </section>

        {/* ── Variant tints ── */}
        <section>
          <p className="font-garamond text-xs text-[#6B5648]/50 uppercase tracking-widest mb-5">color variants</p>
          <div className="flex flex-wrap gap-4 items-end">
            {(["gold", "rose", "sage", "plum", "coral"] as const).map((v, i) => (
              <div key={v} className="flex flex-col items-center gap-2">
                <Sticker variant={v} size="md" rotation={(i % 2 === 0 ? -1 : 1) * (i + 2)}>
                  <CandleSticker className="w-[55%] h-[55%]" />
                </Sticker>
                <span className="font-garamond text-xs text-[#6B5648]/40">{v}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </PaperBackground>
  );
}
