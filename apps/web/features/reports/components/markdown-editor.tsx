'use client';

import { useRef, useState } from 'react';
import { Bold, Heading2, Link2, List } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { renderMarkdown } from '../utils/markdown';

type MarkdownEditorProps = {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
};

type Tab = 'write' | 'preview';

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  before: string,
  after = '',
  placeholder = '',
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end) || placeholder;
  const next =
    textarea.value.slice(0, start) + before + selected + after + textarea.value.slice(end);
  textarea.value = next;
  const cursor = start + before.length + selected.length;
  textarea.setSelectionRange(cursor, cursor);
  textarea.focus();
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

export function MarkdownEditor({
  name,
  defaultValue = '',
  rows = 12,
  placeholder = 'Write in Markdown...',
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<Tab>('write');
  const [value, setValue] = useState(defaultValue);

  function withTextarea(action: (textarea: HTMLTextAreaElement) => void) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    action(textarea);
    setValue(textarea.value);
  }

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => withTextarea((el) => insertAtCursor(el, '## ', '', 'Heading'))}
          >
            <Heading2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => withTextarea((el) => insertAtCursor(el, '**', '**', 'bold'))}
          >
            <Bold className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => withTextarea((el) => insertAtCursor(el, '- ', '', 'item'))}
          >
            <List className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              withTextarea((el) => insertAtCursor(el, '[', '](https://)', 'link text'))
            }
          >
            <Link2 className="size-4" />
          </Button>
        </div>
        <div className="flex rounded-md border p-0.5 text-xs">
          <button
            type="button"
            className={cn(
              'rounded px-2 py-1',
              tab === 'write' && 'bg-muted font-medium',
            )}
            onClick={() => setTab('write')}
          >
            Write
          </button>
          <button
            type="button"
            className={cn(
              'rounded px-2 py-1',
              tab === 'preview' && 'bg-muted font-medium',
            )}
            onClick={() => setTab('preview')}
          >
            Preview
          </button>
        </div>
      </div>

      {tab === 'write' ? (
        <textarea
          ref={textareaRef}
          id={name}
          name={name}
          rows={rows}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className={cn(
            'flex min-h-[240px] w-full resize-y rounded-none border-0 bg-transparent px-3 py-2 text-base shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0 md:text-sm',
          )}
        />
      ) : (
        <div
          className="prose prose-sm dark:prose-invert max-w-none min-h-[240px] p-4"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      )}
    </div>
  );
}
