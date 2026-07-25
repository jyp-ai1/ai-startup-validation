import { ConsultingPageSkeleton } from '@/components/skeletons/consulting-page-skeleton';

export default function ProjectWorkspaceLoading() {
  return (
    <div className="p-6">
      <ConsultingPageSkeleton variant="workspace" />
    </div>
  );
}
