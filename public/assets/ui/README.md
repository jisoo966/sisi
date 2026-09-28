# Sísí Speech UI Assets

Use `sisi-speech.css` for the responsive speech bubble. Do not stretch a complete bubble PNG.

```html
<div class="sisi-speech" data-tail="right">
  Tap Sísí whenever you want to talk.
</div>
```

Tail values: `right`, `left`, `center`, or `none`.

- `paper-grain.webp`: repeating paper texture for the bubble background
- `paper-grain.svg`: editable source
- `sparkle-small.svg`: tiny accent
- `sparkle-medium.svg`: focal sparkle
- `sparkle-cluster.svg`: ambient decorative group
- `sisi-speech.css`: responsive bubble, tail, and entrance motion

The bubble uses `width: fit-content`, wraps at `290px`, and grows vertically with text. Keep Sísí dialogue in a tailed bubble; use a tail-free paper card for system messages.
