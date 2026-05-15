"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Goal = { id: string; content: string };
type GeneratedImage = { imageUrl: string; storagePath: string };

export const dynamic = "force-dynamic";

const STYLES = [
  { id: "vintage", label: "vintage mystical", sub: "warm collage, gold & cream" },
  { id: "surreal", label: "surreal dream", sub: "Magritte-inspired, poetic" },
  { id: "golden", label: "golden hour", sub: "amber light, luxurious" },
  { id: "botanical", label: "botanical", sub: "floral, watercolor, delicate" },
];

export default function VisionBoardPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("vintage");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState(0);
  const [step, setStep] = useState<"setup" | "generating" | "select" | "done">("setup");

  useEffect(() => {
    async function loadGoals() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("goals")
        .select("id, content")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (data) {
        setGoals(data);
        if (data.length > 0) setSelectedGoal(data[0]);
      }
    }
    loadGoals();
  }, []);

  const goalContent = selectedGoal?.content ?? customPrompt;

  async function generateImages() {
    if (!goalContent.trim()) return;
    setGenerating(true);
    setStep("generating");
    setImages([]);

    const generated: GeneratedImage[] = [];

    for (let i = 0; i < 4; i++) {
      setGeneratingIndex(i + 1);
      try {
        const res = await fetch("/api/generate-vision-board", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goalId: selectedGoal?.id ?? null,
            goalContent: goalContent.trim(),
            variationIndex: i,
            style: selectedStyle,
          }),
        });
        const data = await res.json();
        if (data.imageUrl) {
          generated.push({ imageUrl: data.imageUrl, storagePath: data.storagePath });
          setImages([...generated]);
        }
      } catch {
        // 하나 실패해도 계속
      }
    }

    setGenerating(false);
    setStep("select");
  }

  async function confirmSelection() {
    if (!selectedImage) return;
    setSaving(true);

    try {
      const res = await fetch("/api/generate-vision-board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: selectedImage.imageUrl,
          storagePath: selectedImage.storagePath,
          goalId: selectedGoal?.id ?? null,
          goalContent: goalContent.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("done");
        setTimeout(() => router.push("/app"), 2000);
      }
    } catch {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5EFE6]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <Link href="/app" className="font-garamond text-sm text-[#6B5648] hover:text-[#3D2E25] transition-colors">
          ← back
        </Link>
        <span className="font-fraunces text-lg text-[#3D2E25]">vision board</span>
        <div className="w-12" />
      </header>

      <div className="px-6 max-w-lg mx-auto pb-16">
        <AnimatePresence mode="wait">

          {/* STEP: SETUP */}
          {step === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mt-6 mb-10">
                <h1 className="font-fraunces text-4xl text-[#3D2E25] mb-3 leading-snug">
                  create your vision board.
                </h1>
                <p className="font-garamond italic text-[#6B5648] leading-relaxed">
                  sísí will generate 4 images. you choose one. it becomes yours.
                </p>
              </div>

              {/* Goal selection */}
              {goals.length > 0 && (
                <div className="mb-6">
                  <p className="font-garamond text-sm text-[#6B5648] mb-3">
                    what are you manifesting?
                  </p>
                  <div className="flex flex-col gap-2 mb-4">
                    {goals.map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => { setSelectedGoal(goal); setCustomPrompt(""); }}
                        className={`text-left p-4 border transition-all font-garamond ${
                          selectedGoal?.id === goal.id
                            ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                            : "bg-transparent text-[#6B5648] border-[#3D2E25]/20 hover:border-[#3D2E25]/40"
                        }`}
                      >
                        {goal.content}
                      </button>
                    ))}
                  </div>
                  <p className="font-garamond text-xs text-[#8FA38C] mb-2 italic">
                    or describe something different:
                  </p>
                </div>
              )}

              {goals.length === 0 && (
                <p className="font-garamond text-sm text-[#6B5648] mb-3">
                  describe what you are calling in:
                </p>
              )}

              <textarea
                value={customPrompt}
                onChange={(e) => { setCustomPrompt(e.target.value); setSelectedGoal(null); }}
                placeholder="i am calling in..."
                rows={3}
                className="w-full bg-transparent border border-[#3D2E25]/20 focus:border-[#D4A82A] outline-none p-4 font-garamond text-base text-[#3D2E25] placeholder-[#6B5648]/40 transition-colors resize-none mb-8"
              />

              {/* Style selector */}
              <p className="font-garamond text-sm text-[#6B5648] mb-3">
                choose a visual style:
              </p>
              <div className="grid grid-cols-2 gap-2 mb-8">
                {STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`text-left p-3 border transition-all ${
                      selectedStyle === style.id
                        ? "bg-[#3D2E25] text-[#F5EFE6] border-[#3D2E25]"
                        : "bg-transparent text-[#6B5648] border-[#3D2E25]/20 hover:border-[#3D2E25]/40"
                    }`}
                  >
                    <p className="font-garamond text-sm">{style.label}</p>
                    <p className={`font-garamond italic text-xs mt-0.5 ${selectedStyle === style.id ? "text-[#D4A82A]" : "text-[#8FA38C]"}`}>
                      {style.sub}
                    </p>
                  </button>
                ))}
              </div>

              <button
                onClick={generateImages}
                disabled={!goalContent.trim()}
                className="w-full py-4 bg-[#3D2E25] text-[#F5EFE6] font-garamond text-base hover:bg-[#3A302A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                generate 4 visions
              </button>
            </motion.div>
          )}

          {/* STEP: GENERATING */}
          {step === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="font-caveat text-5xl text-[#D4A82A] mb-8"
              >
                ✦
              </motion.div>
              <p className="font-fraunces text-2xl text-[#3D2E25] mb-3">
                creating your vision.
              </p>
              <p className="font-garamond italic text-[#6B5648]">
                image {generatingIndex} of 4...
              </p>

              {/* Preview images as they load */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-8 w-full">
                  {images.map((img, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="aspect-[3/4] bg-[#3D2E25]/10 overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                    </motion.div>
                  ))}
                  {/* Empty placeholders */}
                  {Array.from({ length: 4 - images.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-[3/4] bg-[#3D2E25]/5 animate-pulse" />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP: SELECT */}
          {step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mt-6 mb-6">
                <h2 className="font-fraunces text-3xl text-[#3D2E25] mb-2">
                  choose yours.
                </h2>
                <p className="font-garamond italic text-[#6B5648]">
                  which one feels like your future?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`relative aspect-[3/4] overflow-hidden transition-all ${
                      selectedImage?.imageUrl === img.imageUrl
                        ? "ring-2 ring-[#D4A82A] ring-offset-2 ring-offset-[#F5EFE6]"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                    {selectedImage?.imageUrl === img.imageUrl && (
                      <div className="absolute inset-0 bg-[#D4A82A]/10 flex items-center justify-center">
                        <span className="font-caveat text-3xl text-[#D4A82A]">✦</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep("setup"); setImages([]); setSelectedImage(null); }}
                  className="flex-1 py-4 border border-[#3D2E25]/30 text-[#6B5648] font-garamond text-base hover:border-[#3D2E25] transition-colors"
                >
                  regenerate
                </button>
                <button
                  onClick={confirmSelection}
                  disabled={!selectedImage || saving}
                  className="flex-1 py-4 bg-[#3D2E25] text-[#F5EFE6] font-garamond text-base hover:bg-[#3A302A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "saving..." : "this is mine"}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP: DONE */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="font-caveat text-6xl text-[#D4A82A] mb-6"
              >
                ✦
              </motion.div>
              <p className="font-fraunces text-3xl text-[#3D2E25] mb-3">
                it is set.
              </p>
              <p className="font-garamond italic text-[#6B5648] leading-relaxed">
                your vision board is alive. sísí will remind you of it every day.
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
