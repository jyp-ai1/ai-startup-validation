import { BRAND_CONFIG } from '@/lib/brand/brand-config';
import { cn } from '@repo/ui/lib/utils';

type AlabomLogoProps = {
  /** Show ALABOM (+ optional KO) text beside the mark */
  withWordmark?: boolean;
  /** Include Korean 알아봄 under EN */
  withKorean?: boolean;
  className?: string;
  markClassName?: string;
};

/**
 * Concept 3 Progressive Loop mark — continuous "al" orange→coral.
 */
export function AlabomLogo({
  withWordmark = true,
  withKorean = false,
  className,
  markClassName,
}: AlabomLogoProps) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG from /public */}
      <img
        src={BRAND_CONFIG.logo}
        alt=""
        width={36}
        height={36}
        className={cn('size-9 shrink-0', markClassName)}
        decoding="async"
      />
      {withWordmark ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[15px] font-bold tracking-tight text-foreground">
            {BRAND_CONFIG.displayName}
          </span>
          {withKorean ? (
            <span className="truncate text-[11px] font-semibold text-foreground/80">
              {BRAND_CONFIG.shortName}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="sr-only">{BRAND_CONFIG.displayName}</span>
      )}
    </span>
  );
}
