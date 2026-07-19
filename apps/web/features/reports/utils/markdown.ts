function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Minimal markdown renderer for preview (headings, bold, links, lists). */
export function renderMarkdown(content: string): string {
  if (!content.trim()) {
    return '<p class="text-muted-foreground italic">No content yet.</p>';
  }

  const lines = content.split('\n');
  const htmlParts: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('## ')) {
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      htmlParts.push(`<h2 class="text-xl font-semibold mt-6 mb-2">${formatInline(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith('# ')) {
      if (inList) {
        htmlParts.push('</ul>');
        inList = false;
      }
      htmlParts.push(`<h1 class="text-2xl font-bold mt-6 mb-3">${formatInline(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith('- ')) {
      if (!inList) {
        htmlParts.push('<ul class="list-disc pl-6 space-y-1 my-2">');
        inList = true;
      }
      htmlParts.push(`<li>${formatInline(line.slice(2))}</li>`);
      continue;
    }

    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }

    if (line.trim() === '') {
      continue;
    }

    htmlParts.push(`<p class="my-2 leading-relaxed">${formatInline(line)}</p>`);
  }

  if (inList) {
    htmlParts.push('</ul>');
  }

  return htmlParts.join('');
}

function formatInline(text: string): string {
  let result = escapeHtml(text);
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return result;
}
