/** Client-only browser family for OAuth QA analytics. */
export function getBrowserFamily(): string {
  if (typeof navigator === 'undefined') return 'server';

  const ua = navigator.userAgent;

  if (/Android/.test(ua) && /Chrome/.test(ua)) return 'android_chrome';
  if (/iPhone|iPad/.test(ua)) return 'ios_safari';
  if (/Edg\//.test(ua)) return 'edge';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Chrome\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';

  return 'other';
}
