import { ImageResponse } from 'next/og';

import { BRAND_CONFIG } from '../lib/brand/brand-config';

export const runtime = 'edge';
export const alt = `${BRAND_CONFIG.displayName} — ${BRAND_CONFIG.secondaryTagline}`;
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
        <div style={{ fontSize: 28, color: '#d4af37', marginBottom: 16 }}>
          {BRAND_CONFIG.displayName}
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15, maxWidth: 960 }}>
          {BRAND_CONFIG.tagline}
        </div>
        <div style={{ fontSize: 28, marginTop: 24, color: '#a8a29e' }}>
          {BRAND_CONFIG.secondaryTagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
