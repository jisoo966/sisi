# Sísí — Constellations Components

> Production-ready component sketches for Phase F.
> Paste into `src/components/cosmos/` in soul-seed-manifest.
> Vite + React 19 + Tailwind.

---

## 1 · `Moon.tsx` — Sísí, top-right of sky

```tsx
type MoonProps = {
  className?: string;
};

export function Moon({ className = '' }: MoonProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`absolute top-12 right-6 w-20 h-20 ${className}`}
      aria-label="sisi"
    >
      {/* soft halos */}
      <circle cx="60" cy="60" r="56" fill="var(--night-star)" opacity="0.025" />
      <circle cx="60" cy="60" r="46" fill="var(--night-star)" opacity="0.04" />

      {/* moon body */}
      <circle cx="60" cy="60" r="32" fill="var(--night-star)" opacity="0.97" />

      {/* craters */}
      <circle cx="52" cy="50" r="3" fill="var(--night-sky)" opacity="0.13" />
      <circle cx="66" cy="66" r="2.5" fill="var(--night-sky)" opacity="0.12" />
      <circle cx="48" cy="68" r="1.8" fill="var(--night-sky)" opacity="0.12" />
      <circle cx="70" cy="54" r="1.5" fill="var(--night-sky)" opacity="0.1" />

      {/* tiny italic s — Sísí's signature */}
      <text
        x="60"
        y="65"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, serif"
        fontStyle="italic"
        fontSize="14"
        fill="var(--night-sky)"
        opacity="0.45"
      >
        s
      </text>
    </svg>
  );
}
```

**Notes:**
- Position via `absolute top-12 right-6` — sits at upper right of sky
- Halos are *radial cream glow at low opacity* — subtle, not Disney
- The `s` inside is on purpose almost invisible — user discovers it after few opens

---

## 2 · `StarlightGrain.tsx` — sky texture

```tsx
const GRAIN_POSITIONS = [
  { cx: 38, cy: 156, r: 0.6 },
  { cx: 124, cy: 118, r: 0.6 },
  { cx: 58, cy: 232, r: 0.5 },
  { cx: 328, cy: 268, r: 0.5 },
  { cx: 20, cy: 346, r: 0.4 },
  { cx: 358, cy: 386, r: 0.4 },
  { cx: 232, cy: 170, r: 0.4 },
  { cx: 98, cy: 426, r: 0.5 },
  { cx: 304, cy: 486, r: 0.4 },
  { cx: 160, cy: 510, r: 0.4 },
  { cx: 36, cy: 588, r: 0.5 },
  { cx: 346, cy: 610, r: 0.4 },
  { cx: 78, cy: 138, r: 0.4 },
  { cx: 262, cy: 216, r: 0.4 },
  { cx: 200, cy: 60, r: 0.4 },
];

export function StarlightGrain() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 380 800"
      preserveAspectRatio="xMidYMid slice"
    >
      <g fill="var(--night-star)" opacity="0.45">
        {GRAIN_POSITIONS.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} />
        ))}
      </g>
    </svg>
  );
}
```

**Notes:**
- Hardcoded positions = predictable, no flicker on re-render
- Reuse the existing `starTwinkle` keyframe by adding `className="animate-twinkle"` per circle if you want subtle motion (advanced)
- Lowest layer — under all other cosmos elements

---

## 3 · `UserSilhouette.tsx` — small figure at horizon

```tsx
type UserSilhouetteProps = {
  hasUnplantedWish?: boolean;
};

export function UserSilhouette({ hasUnplantedWish = false }: UserSilhouetteProps) {
  return (
    <svg
      viewBox="0 0 380 200"
      className="absolute bottom-32 left-0 right-0 w-full h-48 pointer-events-none"
      preserveAspectRatio="xMidYEnd meet"
    >
      {/* horizon hill */}
      <path
        d="M -10 120 Q 190 80 390 120 L 390 200 L -10 200 Z"
        fill="#1A2238"
        opacity="0.95"
      />
      <path
        d="M -10 120 Q 190 80 390 120"
        stroke="var(--night-olive)"
        strokeWidth="0.4"
        fill="none"
        opacity="0.5"
      />

      {/* small grass tufts */}
      <g stroke="var(--night-olive)" strokeWidth="0.4" fill="none" opacity="0.45">
        <line x1="40" y1="118" x2="42" y2="110" />
        <line x1="68" y1="110" x2="70" y2="102" />
        <line x1="98" y1="108" x2="100" y2="100" />
        <line x1="260" y1="108" x2="262" y2="100" />
        <line x1="296" y1="110" x2="298" y2="102" />
        <line x1="340" y1="116" x2="342" y2="108" />
      </g>

      {/* the user — sitting silhouette */}
      <g transform="translate(190, 96)">
        {/* lap */}
        <ellipse cx="0" cy="14" rx="14" ry="4" fill="var(--night-sky)" />
        {/* torso */}
        <path
          d="M -8 14 q 0 -22 8 -22 q 8 0 8 22 Z"
          fill="var(--night-sky)"
        />
        {/* head */}
        <circle cx="0" cy="-12" r="5" fill="var(--night-sky)" />

        {/* a wish in lap (only if planting) */}
        {hasUnplantedWish && (
          <>
            <circle cx="0" cy="6" r="1.6" fill="var(--night-gold)" />
            {/* dotted gold trail rising into sky */}
            <line
              x1="0"
              y1="4"
              x2="0"
              y2="-30"
              stroke="var(--night-gold)"
              strokeWidth="0.4"
              strokeDasharray="1 3"
              opacity="0.55"
            />
            <line
              x1="0"
              y1="-30"
              x2="-4"
              y2="-60"
              stroke="var(--night-gold)"
              strokeWidth="0.4"
              strokeDasharray="1 3"
              opacity="0.55"
            />
          </>
        )}
      </g>
    </svg>
  );
}
```

**Notes:**
- `hasUnplantedWish` = `true` if user just submitted a Collect entry and the wish hasn't been rendered as a star yet
- The dotted trail visually completes the *planting → cosmos* metaphor in real-time
- Position via `bottom-32` so it sits above the bottom nav

---

## 4 · `ConstellationCluster.tsx` — named star groups

```tsx
type Star = {
  x: number;
  y: number;
  size?: number;   // 2-5
  isNewest?: boolean;
};

type ClusterState = 'active' | 'forming' | 'resting';

type ClusterProps = {
  stars: Star[];
  threads: Array<[number, number]>; // pairs of star indices
  name: string;
  count: number;
  metadata?: string;  // "since may 8" etc
  state: ClusterState;
  labelPosition: { x: number; y: number };
};

const STATE_COLORS = {
  active: { thread: 'var(--night-gold)', halo: 'var(--night-gold)' },
  forming: { thread: 'var(--night-olive)', halo: 'var(--night-olive)' },
  resting: { thread: 'var(--night-star)', halo: 'transparent' },
};

const STATE_OPACITY = {
  active: 1,
  forming: 0.92,
  resting: 0.45,
};

export function ConstellationCluster({
  stars,
  threads,
  name,
  count,
  metadata,
  state,
  labelPosition,
}: ClusterProps) {
  const colors = STATE_COLORS[state];
  const opacity = STATE_OPACITY[state];

  return (
    <g style={{ opacity }}>
      {/* halo for active clusters */}
      {state === 'active' && (
        <>
          <circle
            cx={centroid(stars).x}
            cy={centroid(stars).y}
            r="74"
            fill={colors.halo}
            opacity="0.04"
          />
          <circle
            cx={centroid(stars).x}
            cy={centroid(stars).y}
            r="50"
            fill={colors.halo}
            opacity="0.05"
          />
        </>
      )}

      {/* threads */}
      <g stroke={colors.thread} strokeWidth={state === 'active' ? 0.7 : 0.5} opacity="0.85" fill="none">
        {threads.map(([a, b], i) => (
          <line
            key={i}
            x1={stars[a].x}
            y1={stars[a].y}
            x2={stars[b].x}
            y2={stars[b].y}
          />
        ))}
      </g>

      {/* stars */}
      {stars.map((s, i) => (
        <g key={i}>
          <circle
            cx={s.x}
            cy={s.y}
            r={s.size ?? 3.5}
            fill="var(--night-star)"
          />
          {/* extra halo on newest */}
          {s.isNewest && state === 'active' && (
            <circle
              cx={s.x}
              cy={s.y}
              r="9"
              fill="none"
              stroke={colors.halo}
              strokeWidth="0.5"
              opacity="0.6"
            />
          )}
        </g>
      ))}

      {/* label */}
      <text
        x={labelPosition.x}
        y={labelPosition.y}
        textAnchor="middle"
        fontFamily="Cormorant Garamond, serif"
        fontStyle="italic"
        fontSize={state === 'active' ? 17 : 14}
        fill="var(--night-text)"
      >
        {name}
      </text>
      {metadata && (
        <text
          x={labelPosition.x}
          y={labelPosition.y + 16}
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="8"
          fill={state === 'active' ? 'var(--night-gold)' : 'var(--night-olive)'}
          letterSpacing="1.5"
        >
          {count} · {metadata.toUpperCase()}
        </text>
      )}
    </g>
  );
}

function centroid(stars: Star[]) {
  const x = stars.reduce((sum, s) => sum + s.x, 0) / stars.length;
  const y = stars.reduce((sum, s) => sum + s.y, 0) / stars.length;
  return { x, y };
}
```

---

## 5 · Star positioning helper — `lib/cosmos-layout.ts`

The hardest part of Constellations is *not* drawing — it's *where to put each star so clusters don't overlap and the layout feels natural.*

Simple deterministic approach (no collision detection, but seeded by cluster ID for stability across renders):

```ts
type ClusterLayout = {
  centerX: number;
  centerY: number;
  radius: number;
};

export function layoutClusters(
  clusterIds: string[],
  viewBox = { w: 380, h: 480 },  // the sky area
): Record<string, ClusterLayout> {
  // Divide the sky into a 3x2 grid; each cluster takes one cell.
  // First cluster goes to top-left, second to top-center, etc.
  const cells = [
    { x: 0.25, y: 0.25 },  // top-left
    { x: 0.75, y: 0.25 },  // top-right
    { x: 0.25, y: 0.55 },  // mid-left
    { x: 0.75, y: 0.55 },  // mid-right
    { x: 0.5, y: 0.8 },    // bottom-center
    { x: 0.5, y: 0.4 },    // center fallback
  ];

  const result: Record<string, ClusterLayout> = {};
  clusterIds.slice(0, cells.length).forEach((id, i) => {
    result[id] = {
      centerX: cells[i].x * viewBox.w,
      centerY: cells[i].y * viewBox.h,
      radius: 50,
    };
  });
  return result;
}

export function layoutStarsInCluster(
  starCount: number,
  center: { x: number; y: number },
  radius: number,
  seed: number,
): Array<{ x: number; y: number }> {
  // Pseudo-random but deterministic by seed
  const rand = mulberry32(seed);
  return Array.from({ length: starCount }, () => {
    const angle = rand() * Math.PI * 2;
    const r = rand() * radius;
    return {
      x: center.x + Math.cos(angle) * r,
      y: center.y + Math.sin(angle) * r,
    };
  });
}

// Tiny seeded PRNG
function mulberry32(seed: number) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateThreadsAroundCentroid(starCount: number): Array<[number, number]> {
  // Connect each star to its 1-2 nearest neighbors. Simple chain + occasional cross.
  const threads: Array<[number, number]> = [];
  for (let i = 0; i < starCount - 1; i++) {
    threads.push([i, i + 1]);
  }
  // Add a few cross-connections for visual richness
  if (starCount >= 4) threads.push([0, 2]);
  if (starCount >= 5) threads.push([1, 3]);
  return threads;
}
```

**Notes:**
- Hardcoded 6-cell grid handles MVP scale (up to 6 clusters). Beyond that, add a 4x3 grid.
- `seed` = hash of cluster ID. Same cluster = same star pattern every time. Important so user doesn't see "stars moved" on reload.

---

## 6 · The route — `src/routes/constellations.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PhoneFrame } from '@/components/PhoneFrame';
import { Moon } from '@/components/cosmos/Moon';
import { StarlightGrain } from '@/components/cosmos/StarlightGrain';
import { ConstellationCluster } from '@/components/cosmos/ConstellationCluster';
import { UserSilhouette } from '@/components/cosmos/UserSilhouette';
import { layoutClusters, layoutStarsInCluster, generateThreadsAroundCentroid } from '@/lib/cosmos-layout';
import { useClusters } from '@/hooks/useClusters'; // your data hook
import { NavFooter } from '@/components/NavFooter';

export const Route = createFileRoute('/constellations')({
  component: ConstellationsPage,
});

function ConstellationsPage() {
  const { clusters, totalEntries, mostActiveId, mostActiveObservation, hasUnplantedWish } = useClusters();

  const layout = layoutClusters(clusters.map((c) => c.id));

  return (
    <PhoneFrame>
      <div className="night relative min-h-screen overflow-hidden">
        {/* sky bg uses --background which night maps to night-sky */}
        <div className="absolute inset-0 bg-[var(--background)]" />

        {/* starlight grain layer */}
        <StarlightGrain />

        {/* moon (Sísí) */}
        <Moon />

        {/* header */}
        <div className="relative z-10 px-6 pt-12 pb-4 text-center">
          <span className="cartouche inline-block text-xs serif italic text-[var(--night-text)]/80 mb-3 border-[var(--night-gold)]/40">
            tonight
          </span>
          <h1 className="text-xl serif italic text-[var(--night-text)] mb-2">
            what you've planted.
          </h1>
          <p className="small-caps text-[10px] text-[var(--night-gold)] tracking-[2px]">
            {totalEntries} WISHES · {clusters.length} GROWING INTO SHAPE
          </p>
          <div className="ornament-rule mt-3" />
        </div>

        {/* the cosmos — single SVG containing all clusters */}
        <svg
          className="absolute inset-x-0"
          style={{ top: 180 }}
          viewBox="0 0 380 480"
          preserveAspectRatio="xMidYMid meet"
        >
          {clusters.map((c) => {
            const cl = layout[c.id];
            const stars = layoutStarsInCluster(c.entryCount, { x: cl.centerX, y: cl.centerY }, cl.radius, hash(c.id));
            const threads = generateThreadsAroundCentroid(stars.length);
            return (
              <ConstellationCluster
                key={c.id}
                stars={stars.map((s, i) => ({ ...s, isNewest: i === stars.length - 1 }))}
                threads={threads}
                name={c.name}
                count={c.entryCount}
                metadata={c.metadata}
                state={c.id === mostActiveId ? 'active' : c.state}
                labelPosition={{ x: cl.centerX, y: cl.centerY + 60 }}
              />
            );
          })}
        </svg>

        {/* user silhouette at horizon */}
        <UserSilhouette hasUnplantedWish={hasUnplantedWish} />

        {/* Sísí's observation — moon's quiet voice */}
        <div className="absolute bottom-32 left-6 right-6 text-center z-10">
          <p className="text-base serif italic text-[var(--night-text)] opacity-85">
            "{mostActiveObservation}"
          </p>
        </div>

        {/* nav (faded for night) */}
        <NavFooter active="constellations" theme="night" />
      </div>
    </PhoneFrame>
  );
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
```

---

## 7 · Empty state (no clusters yet)

For first-time users with 0 entries or only unrooted entries:

```tsx
if (clusters.length === 0) {
  return (
    <PhoneFrame>
      <div className="night relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[var(--background)]" />
        <StarlightGrain />
        <Moon />
        <div className="relative z-10 px-8 pt-32 text-center">
          <h1 className="text-xl serif italic text-[var(--night-text)] mb-4">
            the sky is quiet.
          </h1>
          <p className="text-base serif italic text-[var(--night-text)]/70 mb-12 leading-relaxed">
            plant a few wishes.
            <br />
            sísí will start noticing what returns.
          </p>
          <a href="/collect" className="text-lg serif italic text-[var(--night-gold)]">
            plant something ✦
          </a>
        </div>
        <UserSilhouette hasUnplantedWish={false} />
        <NavFooter active="constellations" theme="night" />
      </div>
    </PhoneFrame>
  );
}
```

---

## Order of build (5-6 hours focused)

1. `Moon.tsx` (15 min) — easiest, immediate visual payoff
2. `StarlightGrain.tsx` (15 min)
3. `UserSilhouette.tsx` (45 min)
4. `cosmos-layout.ts` helpers (30 min)
5. `ConstellationCluster.tsx` (1.5 hr) — most complex single component
6. Wire it all in the route (1 hr)
7. Empty state (15 min)
8. Polish: animation, transitions, edge cases (1 hr)

---

*Production-ready Constellations scaffold for Direction B. All four custom components + layout helpers + the route.*
