import { cookies } from 'next/headers';

import { isV2PersonaId, PERSONA_TO_GOAL, V2_PERSONA_COOKIE, type V2PersonaId } from '../types/v2-persona';
import { journeyCookieOptions, setJourneyGoalCookies } from './journey-cookies';

export { V2_PERSONA_COOKIE };

export async function readJourneyPersona(): Promise<V2PersonaId | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(V2_PERSONA_COOKIE)?.value;
  if (!value || !isV2PersonaId(value)) return null;
  return value;
}

export function setJourneyPersonaCookies(
  set: (name: string, value: string, options: ReturnType<typeof journeyCookieOptions>) => void,
  personaId: V2PersonaId,
): void {
  const opts = journeyCookieOptions();
  set(V2_PERSONA_COOKIE, personaId, opts);
  setJourneyGoalCookies(set, PERSONA_TO_GOAL[personaId]);
}
