import type { DemoProjectSlug } from './demo-scenario-types';
import { demoSeedQaSteps } from './demo-seed-qa';
import { DEMO_SEED_BUNDLES } from './seed';

/** Long Sprint D — read-only registry for demo ops (no DB rewrite). */
export type DemoSeedRegistryEntry = {
  slug: DemoProjectSlug;
  projectId: string;
  displayName: string;
  documentChars: number;
  qaStepCount: number;
  version: number;
};

export function listDemoSeedRegistry(): DemoSeedRegistryEntry[] {
  return DEMO_SEED_BUNDLES.map((bundle) => {
    const slug = bundle.project.slug;
    return {
      slug,
      projectId: bundle.project.id,
      displayName: bundle.project.displayName,
      documentChars: bundle.document.body.length,
      qaStepCount: demoSeedQaSteps(slug).length,
      version: bundle.project.version,
    };
  });
}

export function assertDemoSeedRegistryComplete(): void {
  const slugs: DemoProjectSlug[] = ['clinicflow', 'local-sns', 'fitbridge'];
  const registry = listDemoSeedRegistry();
  for (const slug of slugs) {
    const entry = registry.find((r) => r.slug === slug);
    if (!entry) throw new Error(`Missing registry entry: ${slug}`);
    if (entry.documentChars < 200) throw new Error(`Document too short: ${slug}`);
    if (entry.qaStepCount < 2) throw new Error(`QA steps missing: ${slug}`);
  }
}
