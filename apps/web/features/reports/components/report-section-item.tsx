'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react';

import type { ReportSection } from '@repo/types/validation';
import { Button, Input } from '@repo/ui';

import {
  moveSectionDown,
  moveSectionUp,
  updateReportSection,
  type ReportActionState,
} from '../actions/report-actions';
import { SECTION_TYPE_LABELS } from '../utils/default-sections';
import { renderMarkdown } from '../utils/markdown';
import { MarkdownEditor } from './markdown-editor';

const initialState: ReportActionState = {};

type ReportSectionItemProps = {
  projectId: string;
  reportId: string;
  section: ReportSection;
  isFirst: boolean;
  isLast: boolean;
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

export function ReportSectionItem({
  projectId,
  reportId,
  section,
  isFirst,
  isLast,
}: ReportSectionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const router = useRouter();
  const action = updateReportSection.bind(null, projectId, reportId, section.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.saved) {
      router.refresh();
      setIsEditing(false);
    }
  }, [state.saved, router]);

  async function handleMove(direction: 'up' | 'down') {
    setIsMoving(true);
    try {
      if (direction === 'up') {
        await moveSectionUp(projectId, reportId, section.id);
      } else {
        await moveSectionDown(projectId, reportId, section.id);
      }
      router.refresh();
    } finally {
      setIsMoving(false);
    }
  }

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
              {SECTION_TYPE_LABELS[section.sectionType]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isFirst || isMoving}
            onClick={() => handleMove('up')}
            aria-label="Move section up"
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLast || isMoving}
            onClick={() => handleMove('down')}
            aria-label="Move section down"
          >
            <ChevronDown className="size-4" />
          </Button>
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
                aria-invalid={Boolean(state.fieldErrors?.title)}
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
