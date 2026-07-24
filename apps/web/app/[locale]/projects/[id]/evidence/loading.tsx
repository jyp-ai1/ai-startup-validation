import { ConsultingPageSkeleton } from '@/components/skeletons/consulting-page-skeleton';

export default function EvidenceLoading() {
  return (
    <div className="p-6">
      <ConsultingPageSkeleton variant="list" />
    </div>
  );
}
