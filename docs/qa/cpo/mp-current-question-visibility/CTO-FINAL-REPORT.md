```
STATUS: PASS
COMMIT: (pending push)
PREVIEW: https://ai-startup-validation-tau.vercel.app
SCOPE: P0 current question visibility — display resolver only; no question-generation algorithm changes
P0 RESULT: Actual gap question (e.g. customerPersona stock) now shown instead of generic stub; IRRELEVANT hint stays below textarea; prior edit re-commits visible ask
ROOT CAUSE: resolveDisplayQuestionWithLock accepted GENERIC_GAP_QUESTION_TEXT ("아직 확인이 필요한 핵심 공백…") as first non-empty candidate. whyThisQuestionNow ranked above questionOverride; unknown_signal/adaptive overrides not honored. beginEditPriorAnswer cleared lock without re-committing next ask.
CHANGED FILES:
- apps/web/features/workflow-journey/lib/business-understanding/gap-question-map.ts
- apps/web/features/workflow-journey/lib/business-understanding/question-transition-lock.ts
- apps/web/features/workflow-journey/components/project-workspace-shell/workspace-ai-pm-loop-panel.tsx
- apps/web/features/workflow-journey/lib/business-understanding/__tests__/current-question-visibility.test.ts
EVIDENCE: docs/qa/cpo/mp-current-question-visibility/ (TEST-RESULT.md, verify-report.json)
KNOWN LIMITATIONS: Generic stub still emitted by resolveGapQuestionBinding for unmapped fieldKeys; UI now skips it via isGenericGapQuestionText + targetGap fallback. Full adaptive ranking unchanged.
CTO FINAL: 13/13 unit tests PASS. Rendering-only fix; validation hint (IRRELEVANT) intentionally separate from question headline.
CPO REVIEW: User always sees 지금 질문 with concrete ask text while answering; generic placeholder no longer replaces customerPersona/competition/etc. questions.
CEO TEST: Submit irrelevant answer on customer ask → headline stays customer question; amber hint shows IRRELEVANT copy below textarea.
```
