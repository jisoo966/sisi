/**
 * Deterministic torn / deckled paper edge as a CSS clip-path polygon.
 * Shared by every paper panel so they all tear the same quiet way.
 */
export function tornEdge(seed = 0, n = 28, depth = 1.2): string {
  const pts: string[] = [];
  const jag = (i: number, s: number) =>
    0.9 * Math.abs((Math.sin(i * 12.9898 + s + seed * 7.13) * 43758.5453) % 1);
  for (let i = 0; i <= n; i++) pts.push(`${((i / n) * 100).toFixed(2)}% ${(jag(i, 1) * depth).toFixed(2)}%`);
  for (let i = 1; i <= n; i++) pts.push(`${(100 - jag(i, 2) * depth).toFixed(2)}% ${((i / n) * 100).toFixed(2)}%`);
  for (let i = n - 1; i >= 0; i--) pts.push(`${((i / n) * 100).toFixed(2)}% ${(100 - jag(i, 3) * depth).toFixed(2)}%`);
  for (let i = n - 1; i >= 1; i--) pts.push(`${(jag(i, 4) * depth).toFixed(2)}% ${((i / n) * 100).toFixed(2)}%`);
  return `polygon(${pts.join(", ")})`;
}
