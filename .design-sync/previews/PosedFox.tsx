import { PosedFox } from 'sisi-app';

export function Walking() {
  return (
    <div style={{ background: '#F5EFE6', padding: 20 }}>
      <PosedFox posing={false} size={140} />
    </div>
  );
}

export function Posed() {
  return (
    <div style={{ background: '#F5EFE6', padding: 20 }}>
      <PosedFox posing size={140} posedSize={130} poseSrc="/foxcapture/sitting-front.png" />
    </div>
  );
}
