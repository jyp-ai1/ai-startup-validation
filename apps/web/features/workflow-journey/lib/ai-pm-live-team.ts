/** Founder-facing live analysis team — roles shown during thinking phase. */

export type LiveTeamRoleId = 'aiPm' | 'researcher' | 'strategist' | 'consultant';

export type LiveTeamRoleStatus = 'done' | 'running' | 'waiting';

export type LiveTeamRole = {
  id: LiveTeamRoleId;
  status: LiveTeamRoleStatus;
  progress: number;
};

const ROLE_ORDER: LiveTeamRoleId[] = ['aiPm', 'researcher', 'strategist', 'consultant'];

export function buildLiveTeamRoles(agentIndex: number, failed = false): LiveTeamRole[] {
  if (failed) {
    return ROLE_ORDER.map((id, index) => ({
      id,
      status: index === agentIndex ? 'running' : index < agentIndex ? 'done' : 'waiting',
      progress: index < agentIndex ? 100 : index === agentIndex ? 40 : 0,
    }));
  }

  const activeIndex = Math.min(agentIndex, ROLE_ORDER.length - 1);

  return ROLE_ORDER.map((id, index) => {
    if (index < activeIndex) {
      return { id, status: 'done' as const, progress: 100 };
    }
    if (index === activeIndex) {
      const progress = Math.min(95, 35 + activeIndex * 20 + 15);
      return { id, status: 'running' as const, progress };
    }
    return { id, status: 'waiting' as const, progress: 0 };
  });
}
