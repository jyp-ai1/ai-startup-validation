import type { KnowledgeDocumentStatus, KnowledgeSourceType } from '@repo/types/validation';
import { Badge } from '@repo/ui';

const STATUS_VARIANT: Record<
  KnowledgeDocumentStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PENDING: 'outline',
  PROCESSING: 'secondary',
  COMPLETED: 'default',
  FAILED: 'destructive',
};

const STATUS_LABELS: Record<KnowledgeDocumentStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export function KnowledgeStatusBadge({ status }: { status: KnowledgeDocumentStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="text-sm">
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const SOURCE_LABELS: Record<KnowledgeSourceType, string> = {
  EVIDENCE: 'Evidence',
};

export function KnowledgeSourceBadge({ sourceType }: { sourceType: KnowledgeSourceType }) {
  return (
    <Badge variant="outline" className="text-sm">
      {SOURCE_LABELS[sourceType]}
    </Badge>
  );
}
