import { applyWorkspaceSnapshotToCache } from '@/features/workspace/lib/apply-workspace-snapshot';

import {
  demoPlaybackFrameStorageKey,
  isDemoSampleProjectId,
} from './demo-isolation';
import { materializeDemoPlaybackFrames } from './demo-playback-materializer';
import { getDemoSeedBundleByProjectId } from './seed';
import type { DemoScenarioFrame } from './demo-scenario-types';
import { applyDemoPlaybackPresenter } from './demo-playback-presenter';

export function isDemoSamplePlaybackProject(projectId: string | undefined): boolean {
  return isDemoSampleProjectId(projectId);
}

export function loadDemoPlaybackFrameIndex(projectId: string): number {
  if (typeof window === 'undefined') return 0;
  const raw = sessionStorage.getItem(demoPlaybackFrameStorageKey(projectId));
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function saveDemoPlaybackFrameIndex(projectId: string, index: number): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(demoPlaybackFrameStorageKey(projectId), String(index));
}

export function resetDemoPlayback(projectId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(demoPlaybackFrameStorageKey(projectId));
  sessionStorage.removeItem(`launchlens.demo.playback.frames.v1.${projectId}`);
  sessionStorage.removeItem(`launchlens.demo.playback.frames.v2.${projectId}`);
}

export function getDemoPlaybackFrames(projectId: string): DemoScenarioFrame[] {
  const bundle = getDemoSeedBundleByProjectId(projectId);
  if (!bundle) return [];
  return materializeDemoPlaybackFrames(bundle, projectId);
}

export function applyDemoPlaybackFrame(projectId: string, frame: DemoScenarioFrame): void {
  applyWorkspaceSnapshotToCache(projectId, frame.workspaceSnapshot);
  applyDemoPlaybackPresenter(projectId, frame);
}

export function initDemoSamplePlayback(projectId: string): DemoScenarioFrame | null {
  resetDemoPlayback(projectId);
  const frames = getDemoPlaybackFrames(projectId);
  if (frames.length === 0) return null;
  saveDemoPlaybackFrameIndex(projectId, 0);
  applyDemoPlaybackFrame(projectId, frames[0]!);
  return frames[0]!;
}

export function advanceDemoPlaybackFrame(projectId: string): DemoScenarioFrame | null {
  const frames = getDemoPlaybackFrames(projectId);
  if (frames.length === 0) return null;
  const nextIndex = Math.min(loadDemoPlaybackFrameIndex(projectId) + 1, frames.length - 1);
  saveDemoPlaybackFrameIndex(projectId, nextIndex);
  const frame = frames[nextIndex]!;
  applyDemoPlaybackFrame(projectId, frame);
  return frame;
}

export function currentDemoPlaybackFrame(projectId: string): DemoScenarioFrame | null {
  const frames = getDemoPlaybackFrames(projectId);
  if (frames.length === 0) return null;
  const index = loadDemoPlaybackFrameIndex(projectId);
  return frames[index] ?? null;
}

export function isDemoPlaybackAtTerminalFrame(projectId: string): boolean {
  const frames = getDemoPlaybackFrames(projectId);
  if (frames.length === 0) return false;
  return loadDemoPlaybackFrameIndex(projectId) >= frames.length - 1;
}
