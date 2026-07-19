import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

/**
 * Creates a Next.js ESLint flat config scoped to the importing package directory.
 * Pass `import.meta.url` from each app's eslint.config.mjs.
 */
export function createNextEslintConfig(importMetaUrl) {
  const __filename = fileURLToPath(importMetaUrl);
  const __dirname = dirname(__filename);

  const compat = new FlatCompat({
    baseDirectory: __dirname,
  });

  return [...compat.extends('next/core-web-vitals', 'next/typescript')];
}

/** Default export uses this file's directory — prefer createNextEslintConfig in apps. */
export default createNextEslintConfig(import.meta.url);
