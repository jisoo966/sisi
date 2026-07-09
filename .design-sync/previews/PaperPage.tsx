import { PaperPage } from 'sisi-app';

export function Page() {
  return (
    <PaperPage variant="page" accent="gold" style={{ padding: 24 }}>
      <p style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 22, color: '#3D2E25', marginBottom: 8 }}>
        chapter fourteen
      </p>
      <p style={{ fontFamily: 'var(--font-eb-garamond), serif', fontSize: 15, color: '#6B5648', lineHeight: 1.6 }}>
        what is meant for you is on its way. you don't have to chase it — only stay open.
      </p>
    </PaperPage>
  );
}

export function Card() {
  return (
    <PaperPage variant="card" accent="rose" style={{ padding: 16, width: 220 }}>
      <p style={{ fontFamily: 'var(--font-eb-garamond), serif', fontSize: 14, color: '#3D2E25' }}>
        a quiet note for today.
      </p>
    </PaperPage>
  );
}
