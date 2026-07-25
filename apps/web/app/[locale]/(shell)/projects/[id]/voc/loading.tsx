import { ConsultingPageSkeleton } from '@/components/skeletons/consulting-page-skeleton';

export default function VocLoading() {
  return (
    <div className="p-4 sm:p-6">
      <ConsultingPageSkeleton variant="list" />
    </div>
  );
}
