# AI PM UX / Flow Recovery — P0

**Branch:** `cursor/ai-pm-ux-flow-recovery-e648`  
**Merge / Production:** held until CPO approval

## Scope

Presentation / Interaction / Flow only. V3 SoT, Auth, Accuracy engine, Holdout untouched.

## Surfaces

| Area | Change |
|------|--------|
| Left | 진행상태 4단계 only |
| Center | 하나의 「현재까지 이렇게 이해했습니다」 + 질문 + 답변 입력 |
| Right | 현재 사업 요약 (확인된 내용 / 모르는 것 / 현재 판단) |
| Edit | 내 답변 + 수정하기 하나. confirm-no는 같은 수정 경로 |
| Conflict | contradiction state가 있을 때만. 둘 다 맞아요 추가 |
| Final | 「사업성 검토 결과 보기」 → 결과 화면 → PDF CTA (미지원이면 명시) |
| New project | 좌 폼 / 우 최근 3~4개 + 전체 보기 |
| Demo | 제목 + 한 줄 + 사업내용 보기. 끝 프레임에서 결과로 연결 |

## Tests

`apps/web/features/workflow-journey/lib/ux-flow-recovery/__tests__/ux-flow-recovery.test.ts` — UX-01~12 view-model contracts.
