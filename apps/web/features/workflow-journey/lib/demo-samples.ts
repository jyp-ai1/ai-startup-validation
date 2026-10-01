import type { DemoProjectSlug } from '@/lib/demo/demo-scenario-types';
import { getDemoSeedBundle } from '@/lib/demo/seed';
import { normalizeDemoSampleSlug } from '@/lib/demo/demo-isolation';

/** @deprecated Legacy shared id — use demoSampleProjectId / demoMyBusinessProjectId. */
export const DEMO_SESSION_PROJECT_ID = 'demo-session';

export type DemoSampleId = DemoProjectSlug | 'custom';

/** @deprecated Use per-session key via demoCustomDocumentKey(projectId). */
export const DEMO_CUSTOM_DOCUMENT_KEY = 'launchlens.demo.customDocument';

export function demoCustomDocumentKey(projectId: string): string {
  return `launchlens.demo.customDocument.${projectId}`;
}

export type DemoSampleDefinition = {
  id: DemoSampleId;
  label: string;
  projectName: string;
  document: string;
  slug: DemoProjectSlug | null;
};

function definitionForSlug(slug: DemoProjectSlug): DemoSampleDefinition {
  const bundle = getDemoSeedBundle(slug);
  if (!bundle) {
    throw new Error(`Missing demo seed: ${slug}`);
  }
  return {
    id: slug,
    label: bundle.project.displayName,
    projectName: bundle.project.displayName,
    document: bundle.document.body,
    slug,
  };
}

/** Three seeded Sample scenarios — no inline SmartPM literals. */
export const DEMO_SAMPLES: DemoSampleDefinition[] = [
  definitionForSlug('clinicflow'),
  definitionForSlug('local-sns'),
  definitionForSlug('fitbridge'),
];

export function getDemoSample(id: string | null | undefined): DemoSampleDefinition {
  const normalized = normalizeDemoSampleSlug(id);
  if (normalized === 'custom') {
    return {
      id: 'custom',
      label: '내 사업',
      projectName: '내 사업 Demo',
      document: '',
      slug: null,
    };
  }
  return definitionForSlug(normalized);
}

export function isDemoSampleId(value: string | null | undefined): value is DemoSampleId {
  if (!value) return false;
  if (value === 'custom') return true;
  const slug = normalizeDemoSampleSlug(value);
  return slug === 'custom' || DEMO_SAMPLES.some((sample) => sample.id === slug);
}

export function resolveDemoSampleSlug(value: string | null | undefined): DemoProjectSlug | 'custom' {
  return normalizeDemoSampleSlug(value);
}
