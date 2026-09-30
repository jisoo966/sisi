#!/usr/bin/env python3
"""
crop-effects.py — cut the four Sísí effects sheets into separate transparent
sprites under public/sisi-assets/effects/<group>/<name>.webp.

    python3 scripts/crop-effects.py <folder containing the four sheets>

Elements are found as connected components of the alpha channel (dilated so
a star's own loose dots stay with it). Pixels are never recoloured,
flattened or given a background — each crop is the original RGBA, only
padded, optionally downscaled, and saved as lossless-alpha WebP.
Star Birth frames are placed on one shared canvas, all aligned to the
coral centre of the star, so the sequence never jumps.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
OUT = Path(__file__).resolve().parent.parent / "public" / "sisi-assets" / "effects"
PAD = 24
MAX_SIDE = 512

SHEETS = {
    "trail": "Hand-Painted Starlight Trail Elements.png",
    "birth": "Sísí Star Birth Sequence.png",
    "bloom": "Coral-gold halo and ivory petals.png",
    "ambient": "Fireflies, petals, and ambient magic.png",
}


def components(rgba, dilate=22, min_area=150):
    a = rgba[:, :, 3]
    lab, _ = nd.label(nd.binary_dilation(a > 12, iterations=dilate))
    boxes = []
    for i, s in enumerate(nd.find_objects(lab), 1):
        if s is None:
            continue
        mask = (lab[s] == i) & (a[s] > 12)
        if mask.sum() < min_area:
            continue
        y, x = s
        boxes.append((x.start, y.start, x.stop, y.stop, i))
    _LAB[id(rgba)] = lab
    return [b[:4] for b in boxes], lab


_LAB = {}


def own(rgba, box):
    """Hide pixels of *neighbouring* elements that fall inside this crop's padding
    (only alpha of other components is zeroed; this element is untouched)."""
    lab = _LAB.get(id(rgba))
    out = rgba.copy()
    if lab is None:
        return out
    x0, y0, x1, y1 = box
    mine = np.bincount(lab[y0:y1, x0:x1][rgba[y0:y1, x0:x1, 3] > 12].ravel()).argmax()
    other = (lab != mine) & (lab != 0)
    out[other, 3] = 0
    return out


def crop(rgba, box, lab=None):
    h, w = rgba.shape[:2]
    x0, y0, x1, y1 = box
    src = own(rgba, box)
    x0, y0, x1, y1 = max(0, x0 - PAD), max(0, y0 - PAD), min(w, x1 + PAD), min(h, y1 + PAD)
    return Image.fromarray(src[y0:y1, x0:x1])


def save(img, group, name):
    if max(img.size) > MAX_SIDE:
        img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    d = OUT / group
    d.mkdir(parents=True, exist_ok=True)
    img.save(d / f"{name}.webp", "WEBP", quality=90, alpha_quality=100, method=6)
    print(f"  {group}/{name}.webp {img.size}")


def row_sort(boxes, band=150):
    return sorted(boxes, key=lambda b: ((b[1] + b[3]) // 2 // band, b[0]))


def load(name):
    return np.array(Image.open(SRC / name).convert("RGBA"))


def trail():
    im = load(SHEETS["trail"])
    b = row_sort(components(im)[0], band=300)
    # row 1: six motes, large → tiny · row 2: three trails · row 3: two arrival ripples
    motes, trails, ripples = b[0:6], b[6:9], b[9:11]
    for i, bx in enumerate(motes, 1):
        save(crop(im, bx), "trail", f"mote-{i}")
    for name, bx in zip(["trail-long", "trail-medium", "trail-short"], trails):
        save(crop(im, bx), "trail", name)
    for name, bx in zip(["arrival-ripple-large", "arrival-ripple"], ripples):
        save(crop(im, bx), "trail", name)


def coral_centre(rgba):
    r, g, b, a = [rgba[:, :, i].astype(int) for i in range(4)]
    m = (a > 120) & (r > 200) & (g < 160) & (b < 130)
    if m.sum() < 10:
        m = a > 120
    ys, xs = np.nonzero(m)
    return xs.mean(), ys.mean()


def birth():
    im = load(SHEETS["birth"])
    boxes = sorted(components(im)[0], key=lambda b: b[0])
    assert len(boxes) == 6, boxes
    parts = []
    for bx in boxes:
        x0, y0, x1, y1 = max(0, bx[0] - PAD), max(0, bx[1] - PAD), min(im.shape[1], bx[2] + PAD), min(im.shape[0], bx[3] + PAD)
        piece = own(im, bx)[y0:y1, x0:x1]
        cx, cy = coral_centre(piece)
        parts.append((piece, cx, cy))
    # one shared square canvas, centred on the coral heart of every frame
    half = int(max(max(cx, p.shape[1] - cx, cy, p.shape[0] - cy) for p, cx, cy in parts)) + 2
    side = half * 2
    for i, (p, cx, cy) in enumerate(parts, 1):
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        canvas.paste(Image.fromarray(p), (int(round(half - cx)), int(round(half - cy))))
        save(canvas, "birth", f"frame-{i}")


def bloom():
    im = load(SHEETS["bloom"])
    boxes, _ = components(im)
    area = lambda b: (b[2] - b[0]) * (b[3] - b[1])
    big = sorted(boxes, key=area, reverse=True)
    halo = big[0]
    rings = sorted(big[1:3], key=lambda b: b[1])  # upper = small ring, lower = wide ring
    rest = [b for b in boxes if b not in (halo, *rings)]
    grains = [b for b in rest if area(b) < 160 * 160]
    petals = row_sort([b for b in rest if b not in grains], band=200)
    save(crop(im, halo), "bloom", "halo")
    save(crop(im, rings[0]), "bloom", "ripple")
    save(crop(im, rings[1]), "bloom", "ripple-wide")
    for i, bx in enumerate(petals, 1):
        save(crop(im, bx), "bloom", f"petal-{i}")
    for i, bx in enumerate(sorted(grains, key=lambda b: b[0]), 1):
        save(crop(im, bx), "bloom", f"grain-{i}")


def ambient():
    im = load(SHEETS["ambient"])
    b = row_sort(components(im)[0], band=300)
    fireflies, petals, bottom = b[0:3], b[3:5], b[5:]
    for i, bx in enumerate(fireflies, 1):
        save(crop(im, bx), "ambient", f"firefly-{i}")
    for i, bx in enumerate(petals, 1):
        save(crop(im, bx), "ambient", f"petal-{i}")
    area = lambda b: (b[2] - b[0]) * (b[3] - b[1])
    dust = sorted([x for x in bottom if area(x) < 120 * 120], key=lambda x: x[1])
    grass, star = sorted([x for x in bottom if x not in dust], key=lambda x: x[0])
    save(crop(im, grass), "ambient", "grass-glow")
    save(crop(im, star), "ambient", "shooting-star")
    for i, bx in enumerate(dust, 1):
        save(crop(im, bx), "ambient", f"dust-{i}")


if __name__ == "__main__":
    for fn in (trail, birth, bloom, ambient):
        print(fn.__name__)
        fn()
