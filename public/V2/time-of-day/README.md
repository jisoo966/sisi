# SiSi time-of-day and parallax assets

## Time states

- `sky-morning.png`: 05:00–11:59 — `Good morning, {name}.`
- `sky-afternoon.png`: 12:00–16:59 — `Good afternoon, {name}.`
- `sky-evening.png`: 17:00–21:59 — `Good evening, {name}.`

After 22:00, keep the Good evening greeting but progressively darken the evening sky with a deep inky-blue overlay (approximately 18–32% by 00:00). Do not show the coral horizon at full strength overnight. Before 05:00, the overlay can reach 38% and then crossfade into morning.

Use the user's local time. Crossfade sky layers over 2.5–4 seconds; never hard-swap them. Keep only two sky layers mounted during a transition.

## Parallax layers

1. Sky: fixed, no horizontal movement.
2. Far trees (`tree-far-*`): 0.12–0.18× world speed; 35–55% opacity.
3. Ground/current meadow: 1× world speed.
4. Grass accents (`grass-*`): 1.15–1.35× world speed.
5. Foreground trees (`tree-front-*`): 1.55–1.9× world speed.
6. SiSi: fixed screen anchor.

## Rhythm

- A far tree may appear every 2–4 viewport widths.
- A foreground tree should pass only every 5–8 viewport widths.
- Leave long empty intervals between foreground objects.
- Do not show more than one foreground tree at once on mobile.
- Randomize assets without repeating the same tree or grass cluster consecutively.
- Preserve aspect ratio and keep the walking baseline unchanged.
- Foreground objects may briefly occlude part of SiSi, but never the entire character or UI.

## Color behavior

- Tint far trees slightly toward the active sky using `mix-blend-mode: multiply` only if it remains subtle.
- Morning grass may be 8–12% lighter.
- Afternoon uses the original colors.
- Evening may be 10–16% darker and 5–8% less saturated.
- Never recolor the SiSi character or ivory UI surfaces.

## Performance

- Export sky backgrounds to WebP for runtime if desired; retain PNG masters.
- Keep transparent tree and grass PNGs individually reusable.
- Recycle parallax nodes only after they are fully outside the viewport.
