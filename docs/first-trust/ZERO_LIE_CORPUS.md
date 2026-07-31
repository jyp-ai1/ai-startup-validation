# Zero Lie Corpus — First Trust Experience

Regression list. If any phrase reappears in user-facing AI PM copy → **FAIL**.

## Forbidden sentences (known CEO FAIL)

| ID | Phrase | Why |
|----|--------|-----|
| ZL-001 | 예상 서비스 사용자는 개인 창업자입니다 | Speculative customer — no document basis |
| ZL-002 | PDF를 모두 읽었습니다 / 사업계획서를 모두 읽었습니다 | Overclaim — PDF body often not parsed |
| ZL-003 | B2C 진입이 유리합니다 | Judgment without evidence |
| ZL-004 | 검색량 증가 속도… | External data presented as fact |
| ZL-005 | B2C입니다. (alone) | No evidence block |
| ZL-006 | 예상 고객은 창업자입니다 | Founder ≠ Customer |

## Forbidden word patterns (lint)

`예상` · `보입니다` · `아마` · `가능성` · `일 것으로` · `판단됩니다` · `유리합니다` · `추정` · `~으로 보입니다`

## Sprint A writing rules

1. **One claim per paragraph**
2. **Never mix confirmed fact + speculation in the same paragraph**
3. **Every message ends with Next Action**
4. **Evidence or "확인 필요" — no middle ground**

## Review workflow

```
Sentence draft → CEO review → Code → PR
```

Automated: `pnpm --filter web test:first-trust`
