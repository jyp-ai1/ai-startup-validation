/**
 * Planned vs completed launch. Do not treat a milestone as already shipped.
 * Keep unit/meaning: 예정·준비 ≠ 출시했.
 */

const COMPLETED_LAUNCH =
  /(출시했|런칭했|이미\s*출시|현재\s*운영\s*중|현재\s*사용자가|실제\s*출시|실제\s*사용\s*중|유료\s*고객이\s*실제)/i;

const PLANNED_LAUNCH =
  /(가설|목표|예정|계획|준비\s*중|개발\s*(중|예정)|제안\s*예정|시 ROI)/;

export function isCompletedLaunchText(text: string): boolean {
  return COMPLETED_LAUNCH.test(text.replace(/\s+/g, ' ').trim());
}

export function isPlannedLaunchText(text: string): boolean {
  const line = text.replace(/\s+/g, ' ').trim();
  if (!line || isCompletedLaunchText(line)) return false;
  if (PLANNED_LAUNCH.test(line)) return true;
  return /MVP\s*런칭/i.test(line) && !/(했|했다|했고)/.test(line);
}
