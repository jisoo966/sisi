import { ChoiceButton } from 'sisi-app';

export function Filled() {
  return (
    <div style={{ background: '#F5EFE6', padding: 20 }}>
      <ChoiceButton variant="filled">yes, let's begin</ChoiceButton>
    </div>
  );
}

export function Outline() {
  return (
    <div style={{ background: '#F5EFE6', padding: 20 }}>
      <ChoiceButton variant="outline">not yet</ChoiceButton>
    </div>
  );
}

export function Pair() {
  return (
    <div style={{ background: '#F5EFE6', padding: 20, display: 'flex', gap: 10 }}>
      <ChoiceButton variant="outline">remind me later</ChoiceButton>
      <ChoiceButton variant="filled">continue</ChoiceButton>
    </div>
  );
}
