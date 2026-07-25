'use client';

import Script from 'next/script';

import { env } from '@repo/core/env';

type ClarityScriptProps = {
  enabled: boolean;
};

export function ClarityScript({ enabled }: ClarityScriptProps) {
  const projectId = env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  if (!enabled || !projectId) return null;

  return (
    <Script id="clarity-init" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${projectId}");
      `}
    </Script>
  );
}

export function isClarityConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_CLARITY_PROJECT_ID);
}
