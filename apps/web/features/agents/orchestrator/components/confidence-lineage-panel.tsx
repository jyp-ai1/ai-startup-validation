'use client';

import { useTranslations } from 'next-intl';

import type { ConfidenceLineage, ConfidenceLineageNode } from '../services/orchestrator-types';

type ConfidenceLineagePanelProps = {
  lineage: ConfidenceLineage;
};

export function ConfidenceLineagePanel({ lineage }: ConfidenceLineagePanelProps) {
  const t = useTranslations('orchestrator');

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('lineage.title')}
      </p>
      <ul className="mt-4 space-y-1 font-mono text-sm">
        {lineage.tree.map((root) => (
          <LineageNode key={root.id} node={root} depth={0} t={t} />
        ))}
      </ul>
    </div>
  );
}

function LineageNode({
  node,
  depth,
  t,
}: {
  node: ConfidenceLineageNode;
  depth: number;
  t: ReturnType<typeof useTranslations<'orchestrator'>>;
}) {
  const prefix = depth === 0 ? '' : depth === 1 ? '├─ ' : '└─ ';
  const indent = depth > 1 ? '   '.repeat(depth - 1) : '';

  return (
    <>
      <li className="tabular-nums">
        <span className="text-muted-foreground">{indent}{prefix}</span>
        <span>{t(node.labelKey)} </span>
        <span className="font-semibold text-primary">{node.confidence}%</span>
      </li>
      {node.children?.map((child, idx) => (
        <LineageNode
          key={child.id}
          node={{
            ...child,
            labelKey: child.labelKey,
          }}
          depth={depth + 1}
          t={t}
        />
      ))}
    </>
  );
}
