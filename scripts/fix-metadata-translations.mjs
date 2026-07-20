import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'apps/web');

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.name.endsWith('.tsx')) continue;

    let content = fs.readFileSync(full, 'utf8');
    if (!content.includes("t('meta.titleSuffix')")) continue;

    if (!content.includes('getTranslations')) {
      content = content.replace(
        "import type { Metadata } from 'next';",
        "import type { Metadata } from 'next';\nimport { getTranslations } from 'next-intl/server';",
      );
    }

    if (content.includes('export async function generateMetadata')) {
      content = content.replace(
        /export async function generateMetadata\(\{([^}]*)\}\s*:\s*[^)]+\):\s*Promise<Metadata>\s*\{\n(\s*)const \{/,
        (match, params, indent) =>
          `${match.split('const {')[0]}${indent}const t = await getTranslations();\n${indent}const {`,
      );
      content = content.replace(
        /export async function generateMetadata\(\): Promise<Metadata>\s*\{\n(\s*)return/,
        "export async function generateMetadata(): Promise<Metadata> {\n$1const t = await getTranslations();\n$1return",
      );
    }

    if (content.includes('export const metadata: Metadata')) {
      content = content.replace(
        /export const metadata: Metadata = \{\n(\s*)title: '([^']*\$\{t\('meta\.titleSuffix'\)\}[^']*)',\n\};/,
        (_, indent, titlePart) => {
          const title = titlePart.replace(/\$\{t\('meta\.titleSuffix'\)\}/g, "${t('meta.titleSuffix')}");
          return `export async function generateMetadata(): Promise<Metadata> {\n${indent}const t = await getTranslations();\n${indent}return {\n${indent}  title: \`${title}\`,\n${indent}};\n}`;
        },
      );
      if (!content.includes('getTranslations')) {
        content = content.replace(
          "import type { Metadata } from 'next';",
          "import type { Metadata } from 'next';\nimport { getTranslations } from 'next-intl/server';",
        );
      }
    }

    content = content.replace(
      /'([^']*\$\{t\('meta\.titleSuffix'\)\}[^']*)'/g,
      '`$1`',
    );

    fs.writeFileSync(full, content);
    console.log('fixed', path.relative(process.cwd(), full));
  }
}

walk(ROOT);
