import { ConsultingPageSkeleton } from '@/components/skeletons/consulting-page-skeleton';

export default function ResearchLoading() {
  return (
    <div className="p-6">
      <ConsultingPageSkeleton variant="list" />
    </div>
  );
}
