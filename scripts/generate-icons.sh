#!/bin/bash
# scripts/generate-icons.sh
#
# 사용법:
#   1. public/icons/source-fox.png 에 정사각형 소스 이미지 놓기 (권장: 1024x1024 이상)
#   2. `bash scripts/generate-icons.sh` 실행
#
# 결과: public/icons/ 에 모든 사이즈 자동 생성 (Android + iOS)

set -e

SRC="public/icons/source-fox.png"
OUT="public/icons"
CREAM="#f7f2e3"  # sísí background_color

if [ ! -f "$SRC" ]; then
  echo "❌ source not found: $SRC"
  echo "   먼저 source-fox.png 를 public/icons/ 폴더에 놓아줘"
  exit 1
fi

if ! command -v convert &> /dev/null; then
  echo "❌ ImageMagick (convert) 없음"
  echo "   Mac: brew install imagemagick"
  exit 1
fi

echo "🦊 sísí icon generator"
echo "   source: $SRC"
echo ""

# ─── Standard icons (any purpose) ─────────────────────
echo "▸ standard icons..."
convert "$SRC" -resize 192x192 "$OUT/icon-192.png"
convert "$SRC" -resize 512x512 "$OUT/icon-512.png"
convert "$SRC" -resize 180x180 "$OUT/apple-touch-icon.png"
convert "$SRC" -resize 32x32 "$OUT/favicon-32.png"
convert "$SRC" -resize 16x16 "$OUT/favicon-16.png"

# ─── Maskable icons (safe zone padding for Android adaptive) ──
# Android crops maskable icons — outer 20%가 잘릴 수 있으므로 안쪽 80%에 그림 배치.
# 방법: source를 80%로 리사이즈 후 cream 배경 위에 중앙 정렬.
echo "▸ maskable icons (safe zone padding)..."
for SIZE in 192 512; do
  INNER=$(($SIZE * 80 / 100))
  convert "$SRC" -resize ${INNER}x${INNER} \
    -gravity center -background "$CREAM" -extent ${SIZE}x${SIZE} \
    "$OUT/icon-maskable-${SIZE}.png"
done

# ─── iOS splash screens ───────────────────────────────
# 각 device 사이즈에 맞춰 cream 배경 + 여우 아이콘 중앙 (아이콘 크기 = 화면 짧은 쪽의 40%)
echo "▸ iOS splash screens..."
generate_splash() {
  local W=$1
  local H=$2
  local NAME="splash-${W}x${H}.png"
  local ICON_SIZE=$(($W * 40 / 100))
  convert -size ${W}x${H} "xc:${CREAM}" \
    \( "$SRC" -resize ${ICON_SIZE}x${ICON_SIZE} \) \
    -gravity center -composite \
    "$OUT/${NAME}"
  echo "   → $NAME"
}

# iPhone 14 Pro Max / 15 Plus / 16 Plus
generate_splash 1290 2796
# iPhone 14 Pro / 15 / 15 Pro / 16
generate_splash 1179 2556
# iPhone 12 / 13 / 14
generate_splash 1170 2532
# iPhone SE (2/3)
generate_splash 750 1334
# iPhone 8 / older
generate_splash 640 1136

echo ""
echo "✅ done! generated icons in $OUT/"
ls -lah "$OUT/"
