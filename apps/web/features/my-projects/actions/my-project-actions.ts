'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@repo/db';

import {
  createOwnedProject,
  listOwnedProjects,
} from '@/features/projects/services/project-service';
import {
  buildInitialInterviewState,
  isReviewType,
} from '@/features/interview/types/interview-state';
import {
  DEMO_PROJECT_DRAFT_COOKIE,
  type DemoProjectDraft,
  type DemoWorkflowSnapshot,
  parseDemoProjectDraftCookie,
} from '@/features/workflow-journey/lib/v2-demo-project-store';
import { recordOAuthAnalyticsEvent } from '@/lib/auth/oauth-analytics';
import { PRODUCT_ANALYTICS_EVENTS } from '@/lib/analytics/product-analytics';
import { requireAuthUser } from '@/lib/auth/server-auth';

export type CreateMyProjectState = {
  error?: string;
};

function buildOnboardingFromDemoDraft(draft: DemoProjectDraft) {
  const summary = draft.tagline.trim();
  const sprint12 = buildInitialInterviewState('startup-idea', summary);
  const problem = draft.problem?.trim() ?? '';
  const customer = draft.customer?.trim() ?? '';

  if (problem || customer) {
    sprint12.context = { problem, customer };
    sprint12.description = summary;
  }

  return {
    sprint12,
    v2Demo: {
      promotedAt: new Date().toISOString(),
      pastedContent: draft.pastedContent,
      importSource: draft.importSource,
      fileName: draft.fileName,
      pricingModel: draft.pricingModel,
      priceLevel: draft.priceLevel,
      completenessScore: draft.completenessScore,
      extracted: draft.extracted,
      missing: draft.missing,
      workflow: draft.workflow,
    },
  };
}

export async function listMyProjectsForPage() {
  const user = await requireAuthUser('/workspace');
  if (!isSupabaseConfigured()) {
    return { user, projects: [], dbReady: false as const };
  }
  const projects = await listOwnedProjects(user.id);
  return { user, projects, dbReady: true as const };
}

/** Bootstrap first project when user has zero projects. */
export async function bootstrapFirstProject(userId: string, promoteDemo = false) {
  const existing = await listOwnedProjects(userId);
  if (existing.length > 0 && !promoteDemo) {
    return existing[0]!;
  }

  let title = '내 첫 프로젝트';
  let summary = 'LaunchLens에서 시작한 첫 프로젝트';
  let onboardingContext: Record<string, unknown> = {
    sprint12: buildInitialInterviewState('startup-idea', summary),
  };

  if (promoteDemo) {
    const cookieStore = await cookies();
    const draft = parseDemoProjectDraftCookie(cookieStore.get(DEMO_PROJECT_DRAFT_COOKIE)?.value);
    if (draft) {
      title = draft.serviceName.trim();
      summary = draft.tagline.trim();
      onboardingContext = buildOnboardingFromDemoDraft(draft);
    } else {
      title = 'LaunchLens';
      summary = '창업자의 전략적 사고를 축적하는 Workspace';
    }
  }

  const project = await createOwnedProject(userId, {
    title,
    summary,
    onboardingContext,
  });

  recordOAuthAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.draftPromoted, {
    project_id: project.id,
    promoted: true,
  });

  return project;
}

/** Promote demo draft after login — always creates from cookie when present (Sprint 5 A-2). */
export async function promoteDemoProject(userId: string) {
  const cookieStore = await cookies();
  const draft = parseDemoProjectDraftCookie(cookieStore.get(DEMO_PROJECT_DRAFT_COOKIE)?.value);

  if (draft) {
    const project = await createOwnedProject(userId, {
      title: draft.serviceName.trim(),
      summary: draft.tagline.trim(),
      onboardingContext: buildOnboardingFromDemoDraft(draft),
    });
    recordOAuthAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.draftPromoted, {
      project_id: project.id,
      promoted: true,
    });
    return project;
  }

  return bootstrapFirstProject(userId, false);
}

/** Merge client-side workflow snapshot after promotion (sessionStorage → DB). */
export async function mergeDemoWorkflowSnapshotAction(
  projectId: string,
  snapshot: DemoWorkflowSnapshot,
): Promise<{ ok: boolean }> {
  const user = await requireAuthUser('/my-projects');

  if (!isSupabaseConfigured()) {
    return { ok: false };
  }

  const { getOwnedProject } = await import('@/features/projects/services/project-service');
  const { updateOwnedProjectContext } = await import(
    '@/features/projects/services/project-service'
  );

  const project = await getOwnedProject(user.id, projectId);
  if (!project) return { ok: false };

  const ctx = (project.onboardingContext ?? {}) as Record<string, unknown>;
  const v2Demo = (ctx.v2Demo ?? {}) as Record<string, unknown>;

  await updateOwnedProjectContext(user.id, projectId, {
    ...ctx,
    v2Demo: {
      ...v2Demo,
      workflow: {
        ...(v2Demo.workflow as Record<string, unknown> | undefined),
        ...snapshot,
        mergedAt: new Date().toISOString(),
      },
    },
  });

  revalidatePath(`/my-projects/${projectId}`);
  return { ok: true };
}

export async function createMyProjectAction(
  _prev: CreateMyProjectState,
  formData: FormData,
): Promise<CreateMyProjectState> {
  const user = await requireAuthUser('/workspace');

  if (!isSupabaseConfigured()) {
    return { error: '데이터베이스가 연결되지 않았습니다.' };
  }

  const title = formData.get('title')?.toString().trim() ?? '';
  if (title.length < 2) {
    return { error: '프로젝트 이름을 2자 이상 입력해 주세요.' };
  }

  const reviewTypeRaw = formData.get('reviewType')?.toString() ?? '';
  if (!isReviewType(reviewTypeRaw)) {
    return { error: '검토 유형을 선택해 주세요.' };
  }

  const description = formData.get('description')?.toString().trim() ?? '';

  const project = await createOwnedProject(user.id, {
    title,
    summary: description || title,
    onboardingContext: {
      sprint12: buildInitialInterviewState(reviewTypeRaw, description),
    },
  });

  revalidatePath('/workspace');
  revalidatePath('/my-projects');
  redirect(`/workspace?project=${encodeURIComponent(project.id)}&welcome=1`);
}
