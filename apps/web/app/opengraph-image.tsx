import { ImageResponse } from 'next/og';

import { BRAND_CONFIG } from '../lib/brand/brand-config';

export const runtime = 'edge';
export const alt = `${BRAND_CONFIG.displayName} — ${BRAND_CONFIG.slogan}`;
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
          background: 'linear-gradient(135deg, #FFF7ED 0%, #F3F4F6 48%, #FFE4E6 100%)',
          color: '#0A0A0A',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              fontWeight: 700,
              backgroundImage: 'linear-gradient(90deg, #F97316 0%, #E11D48 100%)',
              color: 'transparent',
              WebkitBackgroundClip: 'text',
            }}
          >
            al
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '0.02em' }}>
              {BRAND_CONFIG.displayName}
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#404040' }}>
              {BRAND_CONFIG.shortName}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.2, maxWidth: 980 }}>
          {BRAND_CONFIG.tagline}
        </div>
        <div style={{ fontSize: 24, marginTop: 20, color: '#525252', maxWidth: 920 }}>
          {BRAND_CONFIG.slogan}
        </div>
      </div>
    ),
    { ...size },
  );
}
