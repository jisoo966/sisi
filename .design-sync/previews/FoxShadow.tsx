import { FoxShadow } from 'sisi-app';

// FoxShadow uses mix-blend-mode: multiply, so it needs a warm, non-white
// backdrop (matching the journey video's golden-hour ground) to read.
function Ground({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 260,
        height: 180,
        background: 'linear-gradient(180deg, #F2E5B5 0%, #E8D9A0 100%)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

export function Default() {
  return (
    <Ground>
      <FoxShadow size={160} />
    </Ground>
  );
}

export function Elongated() {
  return (
    <Ground>
      <FoxShadow size={160} elongation={2} intensity={0.7} />
    </Ground>
  );
}
