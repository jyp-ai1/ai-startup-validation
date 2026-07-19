import { EmptyState, PageHeader } from '@repo/ui';

type FeatureEmptyPageProps = {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function FeatureEmptyPage({
  title,
  description,
  emptyTitle,
  emptyDescription,
}: FeatureEmptyPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="mt-8">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    </>
  );
}
