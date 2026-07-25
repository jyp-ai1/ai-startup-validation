import type { ProjectType, StartupProject } from '@repo/types/validation';
import { cn } from '@repo/ui/lib/utils';

const TYPE_GRADIENTS: Record<ProjectType, string> = {
  STARTUP: 'from-violet-500/80 to-indigo-600/80',
  BUSINESS_STRATEGY: 'from-blue-500/80 to-cyan-600/80',
  NEW_BUSINESS: 'from-emerald-500/80 to-teal-600/80',
  AI_INITIATIVE: 'from-fuchsia-500/80 to-purple-600/80',
  DIGITAL_TRANSFORMATION: 'from-orange-500/80 to-amber-600/80',
  MARKET_EXPANSION: 'from-rose-500/80 to-pink-600/80',
  CUSTOM: 'from-slate-500/80 to-zinc-600/80',
};

type ProjectThumbnailProps = {
  project: Pick<StartupProject, 'title' | 'projectType' | 'thumbnailColor'>;
  className?: string;
};

export function ProjectThumbnail({ project, className }: ProjectThumbnailProps) {
  const initials = project.title
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const gradient = project.thumbnailColor ?? TYPE_GRADIENTS[project.projectType];

  return (
    <div
      className={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm',
        !project.thumbnailColor && gradient,
        className,
      )}
      style={project.thumbnailColor ? { background: project.thumbnailColor } : undefined}
      aria-hidden
    >
      {initials || 'P'}
    </div>
  );
}
