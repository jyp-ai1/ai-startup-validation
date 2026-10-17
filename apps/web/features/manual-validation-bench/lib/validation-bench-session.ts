import { BENCH_SESSION_KEY, createBench, parseBench, type ValidationBench } from './validation-bench';

export function loadBench(): ValidationBench {
  if (typeof window === 'undefined') return createBench();
  try {
    const raw = window.sessionStorage.getItem(BENCH_SESSION_KEY);
    if (!raw) return createBench();
    return parseBench(JSON.parse(raw)) ?? createBench();
  } catch {
    return createBench();
  }
}

export function saveBench(bench: ValidationBench): { ok: boolean } {
  if (typeof window === 'undefined') return { ok: false };
  try {
    window.sessionStorage.setItem(BENCH_SESSION_KEY, JSON.stringify(bench));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
