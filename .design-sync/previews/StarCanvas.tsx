import { StarCanvas } from 'sisi-app';

export function Default() {
  return (
    <div style={{ width: 320, background: '#F5EFE6', padding: 16 }}>
      <StarCanvas onComplete={() => {}} onSkip={() => {}} />
    </div>
  );
}
