# SiSi Moments Trail v2

Final restrained trail and memory-light assets for the horizontal Moments experience.

## Files

- `trail-straight.png`
- `trail-rise.png`
- `trail-dip.png`
- `memory-light-idle.png`
- `memory-light-linked.png`
- `memory-light-selected.png`

## Implementation

- Overlay trails on the existing dark meadow; never use them as a standalone ground platform.
- Render trail assets at approximately 28–40 px visual thickness on a 390 px-wide mobile viewport.
- Use `opacity: 0.48–0.62` depending on the background. Do not add CSS glow or a white outline.
- Alternate segments horizontally and preserve aspect ratio. Do not vertically stretch them.
- Memory lights remain separate from the trail and are positioned at Moment coordinates.
- Suggested rendered sizes: idle 10–14 px, linked 18–24 px, selected 26–34 px.
- Use only one selected light at a time. Most Moments should use no light at all.
- The vertical thread belongs only to memories linked to a Star.
