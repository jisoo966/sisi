import { PaperBackground } from 'sisi-app';

export function Default() {
  return (
    <PaperBackground className="w-[320px] h-[200px] flex items-center justify-center">
      <p style={{ fontFamily: 'var(--font-fraunces), serif', color: '#3D2E25', fontSize: 20 }}>
        your journey begins here
      </p>
    </PaperBackground>
  );
}

export function NoEdge() {
  return <PaperBackground noEdge className="w-[260px] h-[140px]" />;
}
