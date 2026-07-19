'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';

import type { BusinessPlanSection } from '@repo/types/validation';
import { Button, Input } from '@repo/ui';

import { MarkdownEditor } from '@/features/reports/components/markdown-editor';
import { renderMarkdown } from '@/features/reports/utils/markdown';

import {
  updateBusinessPlanSection,
  type BusinessPlanActionState,
} from '../actions/business-plan-actions';
import { BUSINESS_PLAN_SECTION_LABELS } from '../utils/default-sections';

const initialState: BusinessPlanActionState = {};

type BusinessPlanSectionItemProps = {
  projectId: string;
  planId: string;
  section: BusinessPlanSection;
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

export function BusinessPlanSectionItem({
  projectId,
  planId,
  section,
}: BusinessPlanSectionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();
  const action = updateBusinessPlanSection.bind(null, projectId, planId, section.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.saved) {
      router.refresh();
      setIsEditing(false);
    }
  }, [state.saved, router]);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {section.order}
          </span>
          <div>
            <p className="font-medium">{section.title}</p>
            <p className="text-xs text-muted-foreground">
              {BUSINESS_PLAN_SECTION_LABELS[section.sectionType]}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsEditing((value) => !value)}
        >
          <Pencil className="size-4" />
          {isEditing ? 'Close' : 'Edit'}
        </Button>
      </div>

      <div className="p-4">
        {isEditing ? (
          <form action={formAction} className="space-y-4">
            {state.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {state.error}
              </div>
            ) : null}
            <div className="space-y-2">
              <label htmlFor={`title-${section.id}`} className="text-sm font-medium">
                Section Title
              </label>
              <Input
                id={`title-${section.id}`}
                name="title"
                defaultValue={section.title}
                required
              />
              <FieldError messages={state.fieldErrors?.title} />
            </div>
            <MarkdownEditor
              name="content"
              defaultValue={section.content}
              placeholder="Write section content in Markdown..."
            />
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving...' : 'Save Section'}
            </Button>
          </form>
        ) : section.content.trim() ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
          />
        ) : (
          <p className="text-sm italic text-muted-foreground">No content yet.</p>
        )}
      </div>
    </div>
  );
}
