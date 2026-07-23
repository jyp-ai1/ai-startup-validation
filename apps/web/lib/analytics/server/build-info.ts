import { env } from '@repo/core/env';

export type BuildInfo = {
  version: string;
  commit: string;
  branch: string;
  deployTime: string;
  nodeVersion: string;
  environment: string;
  gaConfigured: boolean;
};

export function getBuildInfo(): BuildInfo {
  return {
    version: process.env.npm_package_version ?? '0.1.0',
    commit:
      process.env.VERCEL_GIT_COMMIT_SHA ??
      env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
      'local-dev',
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? 'local',
    deployTime: process.env.VERCEL_DEPLOYMENT_CREATED_AT ?? new Date().toISOString(),
    nodeVersion: process.version,
    environment: env.NODE_ENV,
    gaConfigured: Boolean(env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
  };
}
