import type { ChatMessage } from '../types';

export type PromptRole = 'system' | 'user' | 'developer';

export type PromptTemplate = {
  id: string;
  name: string;
  version: string;
  system?: string;
  user?: string;
  developer?: string;
  variables: string[];
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

export type RenderedPrompt = {
  templateId: string;
  version: string;
  messages: ChatMessage[];
};

export type CreatePromptTemplateInput = {
  id: string;
  name: string;
  version?: string;
  system?: string;
  user?: string;
  developer?: string;
  description?: string;
  tags?: string[];
};

/** Extract `{{variable}}` placeholders from template strings. */
export function extractVariables(...parts: (string | undefined)[]): string[] {
  const vars = new Set<string>();
  const pattern = /\{\{(\w+)\}\}/g;
  for (const part of parts) {
    if (!part) continue;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(part)) !== null) {
      vars.add(match[1]!);
    }
  }
  return [...vars];
}

function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);
}

/** Prompt template manager with versioning. */
export class PromptManager {
  private readonly templates = new Map<string, PromptTemplate[]>();

  register(input: CreatePromptTemplateInput): PromptTemplate {
    const version = input.version ?? '1.0.0';
    const template: PromptTemplate = {
      ...input,
      version,
      variables: extractVariables(input.system, input.user, input.developer),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const versions = this.templates.get(input.id) ?? [];
    const existing = versions.findIndex((t) => t.version === version);
    if (existing >= 0) {
      versions[existing] = { ...template, createdAt: versions[existing]!.createdAt, updatedAt: new Date().toISOString() };
    } else {
      versions.push(template);
    }
    this.templates.set(input.id, versions);
    return template;
  }

  get(id: string, version?: string): PromptTemplate {
    const versions = this.templates.get(id);
    if (!versions?.length) {
      throw new Error(`Prompt template not found: ${id}`);
    }
    if (version) {
      const found = versions.find((t) => t.version === version);
      if (!found) throw new Error(`Prompt version not found: ${id}@${version}`);
      return found;
    }
    return versions[versions.length - 1]!;
  }

  list(id: string): PromptTemplate[] {
    return [...(this.templates.get(id) ?? [])];
  }

  render(
    id: string,
    variables: Record<string, string>,
    version?: string,
  ): RenderedPrompt {
    const template = this.get(id, version);
    const messages: ChatMessage[] = [];

    if (template.system) {
      messages.push({ role: 'system', content: interpolate(template.system, variables) });
    }
    if (template.developer) {
      messages.push({ role: 'developer', content: interpolate(template.developer, variables) });
    }
    if (template.user) {
      messages.push({ role: 'user', content: interpolate(template.user, variables) });
    }

    return { templateId: id, version: template.version, messages };
  }
}

export const promptManager = new PromptManager();
