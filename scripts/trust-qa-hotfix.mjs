import { sanitizeAiPmResponse, sanitizeDocumentLabel } from '../apps/web/lib/ai/ai-response-sanitizer.ts';
import { extractDocumentEntities } from '../apps/web/features/workflow-journey/lib/domain/extract-document-entities.ts';
import { evaluateDomainTrust } from '../apps/web/features/workflow-journey/lib/domain/domain-trust-rules.ts';

const sample = `취향저격컴퍼니
예비창업자 대표
B2C
타겟 고객: 일반인 (외국인 포함)`;

const entities = extractDocumentEntities(sample);
const trust = evaluateDomainTrust(entities);
const dirty = '[[취향저격컴퍼니] 제17회.pdf]]';
const cleaned = sanitizeAiPmResponse(dirty);
const label = sanitizeDocumentLabel('취향저격컴퍼니 제17회.pdf');

const checks = [
  ['Founder = 예비창업자', entities.founder.value === '예비창업자'],
  ['Customer includes 일반인', (entities.customer.value ?? '').includes('일반인')],
  ['Business model B2C', entities.business.model === 'B2C'],
  ['Trust OK', trust.ok === true],
  ['No founder=customer', !trust.issues.includes('founder_equals_customer')],
  ['Label is 사업계획서', label === '사업계획서'],
  ['No pdf in sanitized', !cleaned.includes('pdf') && !cleaned.includes('[[')],
];

console.log('\nAI Trust QA (hotfix)');
console.log('─'.repeat(50));
for (const [name, ok] of checks) console.log(`${ok ? '✅' : '❌'} ${name}`);
console.log('─'.repeat(50));
const pass = checks.every(([, ok]) => ok);
console.log(`Result: ${pass ? 'PASS' : 'FAIL'}`);
process.exit(pass ? 0 : 1);
