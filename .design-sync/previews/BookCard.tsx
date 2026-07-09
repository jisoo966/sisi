import { BookCard } from 'sisi-app';

export function Default() {
  return (
    <div style={{ width: 160 }}>
      <BookCard
        title="The Gifts of Imperfection"
        subtitle="Brené Brown"
        label="self-worth"
        accent="gold"
      />
    </div>
  );
}

export function Accents() {
  const accents = ['gold', 'rose', 'sage', 'coral', 'plum'] as const;
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {accents.map((a) => (
        <div key={a} style={{ width: 120 }}>
          <BookCard title="Big Magic" subtitle="Elizabeth Gilbert" label={a} accent={a} />
        </div>
      ))}
    </div>
  );
}

export function ListenedAndLocked() {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ width: 140 }}>
        <BookCard title="Daring Greatly" accent="sage" listened />
      </div>
      <div style={{ width: 140 }}>
        <BookCard title="The Untethered Soul" accent="plum" locked />
      </div>
    </div>
  );
}
