/**
 * DAY 8-I P0 FIX-10 — CPO Scenario A-J (CEO brewery intake).
 */

import type { Day8iScenarioStep } from './day8i-conversation-harness';
import { CEO_BREWERY_INTAKE_DOC } from './day8i-fix10-turn-acceptance';

export { CEO_BREWERY_INTAKE_DOC };

/** Full pipeline steps covering CPO Scenarios B–J. */
export const FIX10_BREWERY_SCENARIO: Day8iScenarioStep[] = [
  {
    category: 'A_normal',
    ceoAnswer: '네, 맞습니다.',
    note: 'Scenario B — confirm initial business understanding',
  },
  {
    category: 'G_unknown',
    ceoAnswer: '고객이 누군데?',
    note: 'Scenario D — question-back / confusion',
  },
  {
    category: 'A_normal',
    ceoAnswer:
      '양조장들은 온라인에 제품을 알릴 방법을 잘 모르고, 홍보할 인력도 부족합니다.',
    note: 'Scenario G — explicit problem',
  },
  {
    category: 'A_normal',
    ceoAnswer:
      '온라인으로 홍보하면 더 많은 고객에게 제품을 알릴 수 있을 것 같습니다.',
    note: 'Scenario H — customer change claim (hypothesis)',
  },
  {
    category: 'E_correction',
    ceoAnswer: '고객은 양조장입니다.',
    note: 'Scenario J — initial customer (will be corrected)',
  },
  {
    category: 'E_correction',
    ceoAnswer: '양조장뿐 아니라 반찬가게와 꽃집도 대상입니다.',
    note: 'Scenario J — customer correction (must not narrow)',
  },
];
