import { ConsultingPageSkeleton } from '@/components/skeletons/consulting-page-skeleton';

export default function ExecutiveReportLoading() {
  return (
    <div className="p-6">
      <ConsultingPageSkeleton variant="detail" />
    </div>
  );
}
