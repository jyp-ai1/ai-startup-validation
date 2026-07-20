import { cn } from '@repo/ui/lib/utils';

type IntelligenceSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function IntelligenceSection({
  title,
  description,
  children,
  className,
}: IntelligenceSectionProps) {
  return (
    <section className={cn('space-y-8', className)}>
      <div className="ll-section-rule space-y-3">
        <div className="ll-accent-rule" />
        <h2 className="text-intelligence-section font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
