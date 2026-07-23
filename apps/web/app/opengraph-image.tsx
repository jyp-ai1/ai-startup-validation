import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'LaunchLens — AI Strategy Consultant';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0f1419 100%)',
          color: '#f5f5f4',
        }}
      >
        <div style={{ fontSize: 28, color: '#d4af37', marginBottom: 16 }}>LaunchLens</div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 900 }}>
          AI Strategy Consultant
        </div>
        <div style={{ fontSize: 28, marginTop: 24, color: '#a8a29e' }}>
          Research · Validation · Executive Reports
        </div>
      </div>
    ),
    { ...size },
  );
}
