import { BookGallery, BookCard } from 'sisi-app';

export function ThreeColumns() {
  return (
    <div style={{ width: 420 }}>
      <BookGallery label="your library" cols={3}>
        <BookCard title="The Gifts of Imperfection" accent="gold" label="self-worth" />
        <BookCard title="Big Magic" accent="rose" label="creativity" listened />
        <BookCard title="Daring Greatly" accent="sage" label="courage" />
        <BookCard title="The Untethered Soul" accent="plum" locked />
        <BookCard title="Atlas of the Heart" accent="coral" label="emotions" />
        <BookCard title="Radical Acceptance" accent="gold" listened />
      </BookGallery>
    </div>
  );
}

export function TwoColumns() {
  return (
    <div style={{ width: 300 }}>
      <BookGallery cols={2}>
        <BookCard title="Big Magic" accent="rose" />
        <BookCard title="Daring Greatly" accent="sage" />
      </BookGallery>
    </div>
  );
}
