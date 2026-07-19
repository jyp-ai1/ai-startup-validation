import Link from 'next/link';

import {
  EVIDENCE_CATEGORIES,
  EVIDENCE_CONFIDENCE_LEVELS,
  EVIDENCE_SOURCE_TYPES,
} from '@repo/types/validation';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  EVIDENCE_CATEGORY_LABELS,
  EVIDENCE_CONFIDENCE_LABELS,
  EVIDENCE_SOURCE_TYPE_LABELS,
  type EvidenceFilterParams,
} from '../schemas/evidence-schema';

type EvidenceFiltersProps = {
  projectId: string;
  current: EvidenceFilterParams;
};

const selectClassName = cn(
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'dark:bg-input/30',
);

export function EvidenceFilters({ projectId, current }: EvidenceFiltersProps) {
  const basePath = `/projects/${projectId}/evidence`;
  const hasFilters = Boolean(
    current.category || current.sourceType || current.confidence,
  );

  return (
    <form
      method="get"
      action={basePath}
      className="flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="min-w-[180px] flex-1 space-y-2">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue={current.category ?? ''}
          className={selectClassName}
        >
          <option value="">All Categories</option>
          {EVIDENCE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {EVIDENCE_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[180px] flex-1 space-y-2">
        <label htmlFor="sourceType" className="text-sm font-medium">
          Source Type
        </label>
        <select
          id="sourceType"
          name="sourceType"
          defaultValue={current.sourceType ?? ''}
          className={selectClassName}
        >
          <option value="">All Source Types</option>
          {EVIDENCE_SOURCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {EVIDENCE_SOURCE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[180px] flex-1 space-y-2">
        <label htmlFor="confidence" className="text-sm font-medium">
          Confidence
        </label>
        <select
          id="confidence"
          name="confidence"
          defaultValue={current.confidence ?? ''}
          className={selectClassName}
        >
          <option value="">All Confidence</option>
          {EVIDENCE_CONFIDENCE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {EVIDENCE_CONFIDENCE_LABELS[level]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button type="submit">Apply Filters</Button>
        {hasFilters ? (
          <Button variant="outline" asChild>
            <Link href={basePath}>Clear</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
