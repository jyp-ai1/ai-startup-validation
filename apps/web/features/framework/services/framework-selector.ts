import type { FrameworkAnalysisInput, FrameworkId } from './framework-types';

const STARTUP: FrameworkId[] = ['LEAN_CANVAS', 'JTBD', 'SWOT'];
const BUSINESS: FrameworkId[] = ['VALUE_CHAIN', 'BCG', 'PESTEL'];
const AI: FrameworkId[] = ['PORTER', 'SWOT', 'THREE_C'];
const DX: FrameworkId[] = ['VALUE_CHAIN', 'PESTEL', 'PORTER'];
const NEW_BIZ: FrameworkId[] = ['SWOT', 'STP', 'ANSOFF'];
const EXPANSION: FrameworkId[] = ['PESTEL', 'PORTER', 'STP'];
const DEFAULT: FrameworkId[] = ['SWOT', 'PESTEL', 'PORTER'];

/**
 * Auto-select frameworks by project type, industry, and stage.
 * Frameworks are invoked as Decision analysis modules — never standalone menus.
 */
export function selectFrameworks(input: FrameworkAnalysisInput): FrameworkId[] {
  let base: FrameworkId[];

  switch (input.projectType) {
    case 'STARTUP':
      base = [...STARTUP];
      break;
    case 'BUSINESS_STRATEGY':
      base = [...BUSINESS];
      break;
    case 'AI_INITIATIVE':
      base = [...AI];
      break;
    case 'DIGITAL_TRANSFORMATION':
      base = [...DX];
      break;
    case 'NEW_BUSINESS':
      base = [...NEW_BIZ];
      break;
    case 'MARKET_EXPANSION':
      base = [...EXPANSION];
      break;
    default:
      base = [...DEFAULT];
  }

  const industry = input.industry?.toLowerCase() ?? '';

  if (industry.includes('ai') || industry.includes('tech')) {
    if (!base.includes('PORTER')) base.push('PORTER');
  }

  if (input.stage === 'DRAFT' || input.stage === 'RESEARCHING') {
    if (!base.includes('JTBD') && input.projectType === 'STARTUP') {
      base.unshift('JTBD');
    }
  }

  if (input.competitors.total >= 3 && !base.includes('PORTER')) {
    base.push('PORTER');
  }

  return [...new Set(base)].slice(0, 4);
}
