import Link from 'next/link';

import {
  VOC_CUSTOMER_SEGMENTS,
  VOC_FREQUENCIES,
  VOC_SEVERITIES,
  VOC_SOURCE_TYPES,
} from '@repo/types/validation';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  VOC_CUSTOMER_SEGMENT_LABELS,
  VOC_FREQUENCY_LABELS,
  VOC_SEVERITY_LABELS,
  VOC_SOURCE_TYPE_LABELS,
  type VOCFilterParams,
} from '../schemas/voc-schema';

type VOCFiltersProps = {
  projectId: string;
  current: VOCFilterParams;
};

const selectClassName = cn(
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'dark:bg-input/30',
);

export function VOCFilters({ projectId, current }: VOCFiltersProps) {
  const basePath = `/projects/${projectId}/voc`;
  const hasFilters = Boolean(
    current.sourceType ||
      current.customerSegment ||
      current.severity ||
      current.frequency,
  );

  return (
    <form
      method="get"
      action={basePath}
      className="flex flex-col gap-4 rounded-md border p-4 lg:flex-row lg:flex-wrap lg:items-end"
    >
      <div className="min-w-[160px] flex-1 space-y-2">
        <label htmlFor="sourceType" className="text-sm font-medium">
          Source Type
        </label>
        <select
          id="sourceType"
          name="sourceType"
          defaultValue={current.sourceType ?? ''}
          className={selectClassName}
        >
          <option value="">All Sources</option>
          {VOC_SOURCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {VOC_SOURCE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[160px] flex-1 space-y-2">
        <label htmlFor="customerSegment" className="text-sm font-medium">
          Customer Segment
        </label>
        <select
          id="customerSegment"
          name="customerSegment"
          defaultValue={current.customerSegment ?? ''}
          className={selectClassName}
        >
          <option value="">All Segments</option>
          {VOC_CUSTOMER_SEGMENTS.map((segment) => (
            <option key={segment} value={segment}>
              {VOC_CUSTOMER_SEGMENT_LABELS[segment]}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[160px] flex-1 space-y-2">
        <label htmlFor="severity" className="text-sm font-medium">
          Severity
        </label>
        <select
          id="severity"
          name="severity"
          defaultValue={current.severity ?? ''}
          className={selectClassName}
        >
          <option value="">All Severity</option>
          {VOC_SEVERITIES.map((severity) => (
            <option key={severity} value={severity}>
              {VOC_SEVERITY_LABELS[severity]}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[160px] flex-1 space-y-2">
        <label htmlFor="frequency" className="text-sm font-medium">
          Frequency
        </label>
        <select
          id="frequency"
          name="frequency"
          defaultValue={current.frequency ?? ''}
          className={selectClassName}
        >
          <option value="">All Frequency</option>
          {VOC_FREQUENCIES.map((frequency) => (
            <option key={frequency} value={frequency}>
              {VOC_FREQUENCY_LABELS[frequency]}
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
