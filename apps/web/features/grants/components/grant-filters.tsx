import Link from 'next/link';

import {
  GRANT_CATEGORIES,
  GRANT_STATUSES,
  GRANT_SUPPORT_TYPES,
  GRANT_TARGET_STAGES,
} from '@repo/types/validation';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  GRANT_CATEGORY_LABELS,
  GRANT_STATUS_LABELS,
  GRANT_SUPPORT_TYPE_LABELS,
  GRANT_TARGET_STAGE_LABELS,
  type GrantFilterParams,
} from '../schemas/grant-schema';

type GrantFiltersProps = {
  projectId: string;
  current: GrantFilterParams;
};

const selectClassName = cn(
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'dark:bg-input/30',
);

export function GrantFilters({ projectId, current }: GrantFiltersProps) {
  const basePath = `/projects/${projectId}/grants`;
  const hasFilters = Boolean(
    current.category ||
      current.targetStage ||
      current.supportType ||
      current.status,
  );

  return (
    <form
      method="get"
      action={basePath}
      className="flex flex-col gap-4 rounded-md border p-4 xl:flex-row xl:flex-wrap xl:items-end"
    >
      <div className="min-w-[150px] flex-1 space-y-2">
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
          {GRANT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {GRANT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[150px] flex-1 space-y-2">
        <label htmlFor="targetStage" className="text-sm font-medium">
          Target Stage
        </label>
        <select
          id="targetStage"
          name="targetStage"
          defaultValue={current.targetStage ?? ''}
          className={selectClassName}
        >
          <option value="">All Stages</option>
          {GRANT_TARGET_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {GRANT_TARGET_STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[150px] flex-1 space-y-2">
        <label htmlFor="supportType" className="text-sm font-medium">
          Support Type
        </label>
        <select
          id="supportType"
          name="supportType"
          defaultValue={current.supportType ?? ''}
          className={selectClassName}
        >
          <option value="">All Types</option>
          {GRANT_SUPPORT_TYPES.map((type) => (
            <option key={type} value={type}>
              {GRANT_SUPPORT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[150px] flex-1 space-y-2">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={current.status ?? ''}
          className={selectClassName}
        >
          <option value="">All Status</option>
          {GRANT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {GRANT_STATUS_LABELS[status]}
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
