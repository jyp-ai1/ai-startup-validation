import Link from 'next/link';
import { ArrowRight, BarChart3, Brain, ShieldCheck, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { listStartupProjects } from '@/features/projects/services/project-service';
import { Button, ThemeToggle } from '@repo/ui';
import { formatRelativeTime } from '@repo/utils/date';

import { LocaleSwitcher } from '@/components/locale-switcher';

export async function LaunchLensLanding() {
  const t = await getTranslations();
  const projects = await listStartupProjects();
  const recent = projects
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  return (
    <div className="min-h-full bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">{t('meta.appName')}</p>
              <p className="text-[11px] text-muted-foreground">{t('meta.appTagline')}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher variant="compact" />
            <ThemeToggle />
            <Button asChild className="hidden h-10 sm:inline-flex">
              <Link href="/dashboard">
                {t('landing.openDashboard')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-[1440px] px-6 py-24 lg:px-10 lg:py-32">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/70">
              {t('landing.eyebrow')}
            </p>
            <h1 className="mt-8 max-w-4xl text-intelligence-hero font-semibold tracking-tight">
              {t('landing.heroTitle')}
            </h1>
            <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-primary-foreground/80">
              {t('landing.heroSubtitle')}
            </p>
            <div className="mt-12 flex flex-wrap gap-4">
              <Button
                size="lg"
                variant="secondary"
                className="h-12 bg-primary-foreground px-8 text-primary hover:bg-primary-foreground/90"
                asChild
              >
                <Link href="/dashboard">
                  {t('landing.ctaPrimary')}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-primary-foreground/30 bg-transparent px-8 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link href="/projects/new">{t('landing.ctaSecondary')}</Link>
              </Button>
            </div>
            <div className="mt-16 grid gap-8 border-t border-primary-foreground/15 pt-12 sm:grid-cols-3">
              <Stat label={t('landing.statDecisions')} value="GO" />
              <Stat label={t('landing.statReadiness')} value="84" />
              <Stat label={t('landing.statConfidence')} value="87%" />
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto grid max-w-[1440px] gap-8 px-6 lg:grid-cols-3 lg:px-10">
            <ValueCard
              icon={Brain}
              title={t('landing.valueAiTitle')}
              description={t('landing.valueAiDesc')}
            />
            <ValueCard
              icon={BarChart3}
              title={t('landing.valueDataTitle')}
              description={t('landing.valueDataDesc')}
            />
            <ValueCard
              icon={ShieldCheck}
              title={t('landing.valueDecisionTitle')}
              description={t('landing.valueDecisionDesc')}
            />
          </div>
        </section>

        {recent.length > 0 ? (
          <section className="border-y border-border/50 bg-muted/20 py-20">
            <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
              <div className="flex items-end justify-between gap-6">
                <div>
                  <div className="ll-accent-rule" />
                  <h2 className="mt-4 text-intelligence-section font-semibold tracking-tight">
                    {t('landing.recentProjects')}
                  </h2>
                  <p className="mt-2 text-[15px] text-muted-foreground">{t('landing.recentProjectsDesc')}</p>
                </div>
                <Button variant="ghost" asChild>
                  <Link href="/projects">{t('landing.viewAll')}</Link>
                </Button>
              </div>
              <ul className="mt-10 grid gap-6 sm:grid-cols-2">
                {recent.map((project) => (
                  <li key={project.id}>
                    <Link href={`/projects/${project.id}`} className="ll-consulting-card-hover block">
                      <p className="text-[18px] font-semibold tracking-tight">{project.title}</p>
                      <p className="mt-2 text-[13px] text-muted-foreground">
                        {t('landing.updatedAgo', {
                          time: formatRelativeTime(new Date(project.updatedAt)),
                        })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <section className="py-24">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-10">
            <h2 className="text-intelligence-section font-semibold tracking-tight">
              {t('landing.dashboardCtaTitle')}
            </h2>
            <p className="mt-4 text-[15px] text-muted-foreground">{t('landing.dashboardCtaDesc')}</p>
            <Button size="lg" className="mt-10 h-12 px-10" asChild>
              <Link href="/dashboard">
                {t('landing.openDashboard')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-10 text-center text-[13px] text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {t('meta.appName')} · {t('meta.appTagline')}
        </p>
        <p className="mt-1">{t('landing.footerFramework')}</p>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] uppercase tracking-wider text-primary-foreground/65">{label}</p>
      <p className="mt-2 text-4xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ValueCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="ll-consulting-card">
      <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-6 text-[18px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
