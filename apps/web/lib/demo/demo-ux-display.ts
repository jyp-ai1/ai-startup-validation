/**
 * Founder-facing Demo display fixtures.
 * Separate from seed/engine business context — never use understanding.business.value as a title.
 */

import { CLINICFLOW_DOCUMENT } from './demo-seed-documents';
import { getDemoSeedBundle } from './seed';
import { normalizeDemoSampleSlug } from './demo-isolation';

export type DemoUxDisplay = {
  projectTitle: string;
  projectDescription: string;
  projectFullDescription: string;
};

export const CLINICFLOW_UX_DISPLAY: DemoUxDisplay = {
  projectTitle: '클리닉플로우',
  projectDescription:
    '다양한 병원의 CS를 SaaS 형태로 지원하고 진료와 예약관리를 돕는 서비스입니다.',
  projectFullDescription: CLINICFLOW_DOCUMENT,
};

export function resolveDemoUxDisplay(sampleId?: string | null): DemoUxDisplay | null {
  const slug = normalizeDemoSampleSlug(sampleId);
  if (slug === 'clinicflow') return CLINICFLOW_UX_DISPLAY;
  if (slug === 'custom') return null;
  const bundle = getDemoSeedBundle(slug);
  if (!bundle) return null;
  return {
    projectTitle: bundle.project.displayName,
    projectDescription: bundle.business.oneLiner,
    projectFullDescription: bundle.document.body,
  };
}
