# 🌙 Sísí Design System

*A meditative manifestation app — warm, mystical, gentle-friend voice*

---

## 🎨 Color Palette

### Primary Brand
| Token | HEX | Usage |
|---|---|---|
| **Journey Navy** | `#1F2A44` | Primary text on light bg |
| **Journey Purple** | `#B19CD9` | Primary CTA, active tabs |
| **Warm Gold** | `#FFB570` | Star glow, ✦ symbols, celestial hint |
| **Warm Cream** | `#F5EFE6` | Base cream |
| **Cream Off** | `#FAF6F0` | Slightly lighter cream |
| **Warm Cream Journey** | `#F7F2E3` | Phone-frame bg |

### Journey Palette
| Token | HEX | Usage |
|---|---|---|
| Journey Cream (sky) | `#F2E5B5` | Warm butter-cream sky in scenes |
| Journey Ice | `#B5D5E8` | Icy pale blue |
| Journey Cobalt | `#3B5BB8` | Deep cobalt (user chat bubble) |
| Journey Oxblood | `#7A2E2E` | Error, oxblood emphasis |
| Journey Frost | `#E8F0F8` | Soft frosted card bg |

### Star & Celestial (radial gradients)
```css
Star SVG gradient:
  stop 0%: rgb(255, 248, 225)   /* pale gold center */
  stop 35%: rgb(255, 236, 189)  /* warm gold */
  stop 100%: rgb(251, 198, 106) /* deep gold */

Star halo:
  radial-gradient(rgba(255,181,112,1) 0%, rgba(255,181,112,0.35) 55%, transparent 100%)

Middle glow (behind halo):
  radial-gradient(rgba(238,137,79,0.5) 0%, rgba(238,137,79,0.2) 50%, transparent 90%)
```

### Semantic
| Meaning | Color |
|---|---|
| Success | `#8FA38C` (sage) |
| Warning | `#D4A82A` (mustard gold) |
| Error | `#7A2E2E` (oxblood) |

---

## ✍️ Typography

### Fonts
| Family | Weight | Usage |
|---|---|---|
| **Sentient** (Fontshare) | 200/300/400/500/700 | ALL headings + body — primary brand font |
| **Fraunces** (Google) | 300/400/500/700 | Fallback / vintage moments |
| **EB Garamond** | 400/700 italic | Legacy body |
| **Caveat** | 400 | Sparingly for handwritten accent |
| **Inter** (fallback) | 400/500 | System sans fallback |

**Default letter-spacing on Sentient**: `-0.03em` (tighter for elegant feel)

### Type Scale (as used in Sísí)

| Level | Size | Font | Weight | Usage |
|---|---|---|---|---|
| **H1 Splash** | 42px | Sentient Light (300) | 300 | "SiSi" logo on splash/login |
| **H1 Page** | 22px | Sentient Regular | 400 | Tab page titles (My Stars, Postcards, Messages) |
| **H2** | 28px | Sentient Regular | 400 | Onboarding questions, star wish detail |
| **H3** | 24px | Sentient Regular | 400 | Card headings (Your moment is saved) |
| **H4** | 20px | Sentient Regular | 400 | Prompts, subheadings |
| **Body Large** | 18px | Sentient Regular | 400 | Input text, wish text |
| **Body** | 16px | Sentient Regular | 400 | Chat messages, buttons |
| **Body Small** | 15px | Sentient Regular | 400 | Card subheadings, subtle body |
| **Small** | 14px | Sentient Regular | 400 | Nav labels, secondary CTAs |
| **Caption** | 13px | Sentient Italic | 400 | Italic captions, tagline |
| **Meta** | 12px | Sentient Regular | 400 | Timestamps, labels |
| **Meta Small** | 11px | Sentient Regular | 400 | Legal, uppercase labels |
| **Micro** | 10px | Sentient / mono | 400 | Char counters, tiniest labels |

### Special Type Patterns

**Tagline (italic)**:
```css
font: Sentient Italic 400
size: 15px
letter-spacing: 0
color: journey-navy or white/60
example: "your companion is here"
```

**Uppercase label (CAP tracking)**:
```css
font: Sentient Regular 400
size: 11-13px
letter-spacing: 0.15em (tracking-widest)
text-transform: uppercase
example: "TODAY'S CHECK-IN"
```

**Voice Rules (Sísí)**:
- **Lowercase everywhere** — 앱 전체 톤 (친구가 이야기하는 느낌)
- **Exception**: 표준 문법 대소문자가 필요할 때 (I, Sísí, page titles)
- **No emojis** — ✦ symbol만 사용
- **No abbreviations** — u → you
- **No teen interjections** — bestie, wait, ok so

---

## 📏 Spacing Scale

Based on tailwind default + custom used values:

| Token | px | Common Use |
|---|---|---|
| `1` | 4px | Icon padding, tiny gap |
| `2` | 8px | Chip gap, small margin |
| `3` | 12px | Standard gap between elements |
| `4` | 16px | Section spacing, card padding |
| `6` | 24px | **Horizontal page padding** (모든 페이지 통일) |
| `[24px]` | 24px | Card padding |
| `[36px]` | 36px | Section separation |
| `[42px]` | 42px | Footer bottom padding |
| `[52px]` | 52px | **Top padding for status bar** (모든 페이지 통일) |

**Universal padding rule**:
- All pages: `pt-[52px] px-[24px]`
- Nav clearance bottom: `pb-[100px]` (nav takes 80px + 20px gap)

---

## 🔲 Border Radius Scale

| Token | Value | Usage |
|---|---|---|
| `sm` | 4px | Nothing much |
| `md` | 8px | Small elements |
| `[12px]` | 12px | Cards, chips |
| `[14px]` | 14px | Timeline entries |
| `[16px]` | 16px | Option cards |
| `[20px]` | 20px | Sheet cards, chat bubbles |
| `[24px]` | 24px | Primary buttons, modals |
| `[25px]` | 25px | Bottom nav pill |
| `[28px]` | 28px | Input pill, primary CTA |
| `[30px]` | 30px | Message continue buttons |
| `full` | 9999px | Chevron buttons, circles |

**Rules**:
- Bigger radius = softer, more sacred/meditative
- Sharp radius (< 12px) rarely used

---

## 🎭 Glass Morphic System (핵심 브랜드)

### Formula
```
Container: bg-white/[opacity] + backdrop-blur-md + border border-white/[opacity]
Shadow: shadow-sm/md/lg (Tailwind default)
```

### Variants

| Element | Opacity | Border | Shadow | Bg Type |
|---|---|---|---|---|
| **Primary button (purple pill)** | 85% | white/40 | lg | Journey Purple |
| **Nav pill (light)** | 60% | white/60 | lg | White |
| **Nav pill (dark)** | 10% | white/15 | lg | White |
| **Input pill** | 40% | white/50 | sm | White |
| **Icon button (36px)** | 40% | white/40 | sm | White |
| **Chat bubble (sísí)** | 60% | white/50 | sm | White |
| **Chat bubble (user)** | 85% | white/40 | sm | Journey Purple |
| **Card (dashboard)** | 60% | white/50 | sm | White |
| **Sheet (bottom)** | solid | - | 2xl | Warm Cream |
| **Modal (dark, my-stars)** | solid gradient | warm gold/14% | 2xl | Dark navy gradient |

### Tailwind classes ready-to-use
```html
<!-- Primary CTA -->
class="bg-journey-purple/85 backdrop-blur-md border border-white/40 text-journey-navy shadow-lg"

<!-- Nav pill (light) -->
class="bg-white/60 backdrop-blur-md border border-white/60 shadow-lg"

<!-- Input pill -->
class="bg-white/40 backdrop-blur-md border border-white/50 shadow-sm"

<!-- Icon button -->
class="bg-white/40 backdrop-blur-md border border-white/40 shadow-sm h-9 w-9 rounded-full"

<!-- Card -->
class="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[20px]"
```

### Backdrop blur value
- `backdrop-blur-sm` = 4px
- `backdrop-blur-md` = 12px ← **표준값**
- `backdrop-blur-lg` = 16px

---

## 🌟 Shadow Tokens

| Class | Value | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` | Subtle lift, cards |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.10)` | Icon buttons |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.10)` | Nav, primary CTA |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.10)` | Modals, sheets |
| `shadow-2xl` | `0 25px 50px -12px rgba(0,0,0,0.25)` | Highest elevation |

**Custom warm shadows** (in inline styles):
```css
/* Purple glow for ritual celebration */
box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(177,156,217,0.12);

/* Star sparkle glow */
box-shadow: 0 8px 20px rgba(255,181,112,0.4);

/* Dark modal soft border */
border: 1px solid rgba(255,236,189,0.14); // warm gold subtle
```

---

## 🎬 Motion & Timing

### Easing curves
```css
Standard smooth:  [0.22, 1, 0.36, 1]     ← 가장 많이 씀 (natural feel)
Ease in-out:      easeInOut               ← 반복 애니메이션 (breathing, twinkle)
Linear:           linear                   ← 균등 속도 (walking fox path)
Explosive:        [0.16, 1, 0.3, 1]       ← easeOutExpo (star spawn, celebration)
```

### Durations
| Duration | Use |
|---|---|
| 0.2s (200ms) | UI micro-transitions (hover, toggle) |
| 0.3s | Sheet slide, modal fade |
| 0.4s | Chat bubble appear |
| 0.5s - 0.7s | Card entrance |
| 1.4s | Star spawn burst |
| 3.2s | Star breathing |
| 5s+ | Ambient loops |

### Reusable patterns
```jsx
// Card fade-in
{ opacity: 0, y: 12 } → { opacity: 1, y: 0 }
transition: 0.6s, ease [0.22, 1, 0.36, 1]

// Sheet slide up
{ y: "100%" } → { y: 0 }
transition: 0.35s, ease [0.22, 1, 0.36, 1]

// Star twinkle (loop)
{ opacity: [0.85, 1, 0.85], scale: [1, 1.05, 1] }
duration: 4s, ease: easeInOut

// Ambient star breathing
{ opacity: [0.4, 1, 0.4] }
duration: 3-5s (random per star), easeInOut, delay random
```

---

## 📱 Layout Grid

### Mobile (default)
- **Phone-frame width**: 100% (< 500px), 430px max (≥ 500px)
- **Horizontal padding**: 24px 통일
- **Top padding** (status bar): 52px 통일
- **Nav clearance** (bottom): 100px

### Desktop
- Phone-frame: 430px centered, `min-h-svh`, `bg-[#f7f2e3]`
- Body bg: `#e8e0cf` (neutral cream)
- Phone-frame gets `transform: translate(0)` (for fixed containment)

### Safe areas
- `pt-[52px]` = status bar clearance
- `pb-[100px]` = nav clearance
- Modal `top-1/2 -translate-y-1/2` = centered

---

## 🔣 Icon System

### Sizes
- `14px` - Small icons in circular buttons (back, share, menu items)
- `16px` - Send arrows, chevrons
- `20px` - Option cards, sheet icons
- `22px` - FAB icons (camera, postcard)
- `24px` - Larger action icons
- `28px` - ✦ symbols in headers

### Style
- Stroke width: `1.5` - `2.4` (1.8 most common)
- Stroke-linecap: `round`
- Stroke-linejoin: `round`
- Color: currentColor (inherits from container)

### Custom SVGs
- **✦ Star (4-point)**: `M50 12 L60 42 L90 42 L66 60 L76 90 L50 72 L24 90 L34 60 L10 42 L40 42 Z`
- **⭐ Star (5-point)**: `M50 5 L61 39 L95 39 L68 60 L79 95 L50 74 L21 95 L32 60 L5 39 L39 39 Z`

---

## 🧩 Component Inventory

### Buttons
- **Primary Pill** (purple, 56px tall) — Talk to sísí, Send magic link
- **Secondary Pill** (white translucent, 52px) — Continue as guest, Cancel
- **Ghost/Text** (no bg) — Cancel, Skip
- **Icon Button** (36px circle) — Back, Share, Menu, Bell
- **FAB** (51-56px circle) — Camera, +, Postcard
- **Chip** (63px card) — Prompt starters (removed but was there)
- **Choice Button** (42px pill) — Yes save this / Not this one

### Cards
- **Glass Card** — Dashboard "Today's check-in"
- **Timeline Entry** — Postcards & sessions list items
- **Postcard** (polaroid) — 3:4 ratio, warm cream frame
- **Angel Message Envelope** — SVG letter shape

### Modals & Sheets
- **Bottom Sheet** — Menu, Postcard options
- **Dark Modal** — Wish modal, arrival ritual, delete confirm
- **Light Modal** — Onboarding steps
- **Full-page Overlay** — Arrival celebration, image detail

### Nav
- **BottomNav** — 4 tabs with active pill
- **Tab Switcher** — Following | Constellation

---

## 📋 Real Design Tokens Summary (Figma-ready)

```json
{
  "colors": {
    "primary/journey-navy": "#1F2A44",
    "primary/journey-purple": "#B19CD9",
    "accent/warm-gold": "#FFB570",
    "accent/star-gold-deep": "#FBC66A",
    "accent/star-cream": "#FFECBD",
    "surface/cream": "#F5EFE6",
    "surface/warm-cream": "#F7F2E3",
    "surface/frost": "#E8F0F8",
    "surface/desktop-body": "#E8E0CF",
    "text/on-light": "#1F2A44",
    "text/on-dark": "#FFFFFF"
  },
  "typography": {
    "font-primary": "Sentient",
    "letter-spacing-sentient": "-0.03em"
  },
  "radius": {
    "sm": "4px",
    "md": "12px",
    "lg": "20px",
    "xl": "24px",
    "pill": "28px",
    "nav": "25px",
    "full": "9999px"
  },
  "spacing": {
    "page-x": "24px",
    "page-top": "52px",
    "nav-clearance": "100px"
  },
  "blur": {
    "sm": "4px",
    "md": "12px",
    "lg": "16px"
  }
}
```

---

## 🎯 Voice & Tone (Copy System)

**Grammar**: Always lowercase (except sentence-start "I", proper nouns "Sísí")

**Style examples**:
- ✅ "here. what stayed with you today?"
- ✅ "let me remember your journey"
- ❌ "Welcome! How was your day?"  (too corporate)
- ❌ "Hey bestie! ✨✨✨"  (too teen)

**Sacred moments** get slightly formal language:
- "you've arrived at this star"
- "kept in your constellation"
- "your moment is safely kept"

**Question ending**:
- Prefer curious open questions: "what stayed?" not "did you have a good day?"

---

*Generated from actual codebase tokens as of Jul 2026.*
