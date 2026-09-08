# ALABOM — P0 Document → Understanding → Correction Report

## 1. Root Cause

**P0-1:** `readSmartIntakeFile` returned hardcoded placeholder strings for PDF/DOCX. Placeholders passed `isWorkspaceDocumentAnalyzable` but failed `isWorkspaceDocumentReadable`, triggering `SHARED_UNDERSTANDING_UNREADABLE_BUSINESS` before intake seed parsing.

**P0-2:** Loop confirm `handleConfirmNo` called `beginEditPriorAnswer(last turn)` — no-op when no prior turns existed, so "아니요, 수정할게요" did nothing on first confirm question.

**P0-3:** Existing anti-repeat policy (`isSameMeaningQuestion`, `ai-pm-anti-repeat-policy`) retained; correction path now persists to DB immediately so canonical state survives refresh.

**P0-4:** `analyzeSmartIntakeDocument` used `text.slice(0,160)` as fallback problem (slot-fill). Removed. `resolveBusinessField` now parses `사업 설명` before unreadable gate.

**P0-5:** `buildAiPmSimpleQuestionSnapshot` showed misleading `사업 이해 N / 5` while judgment could still be HOLD.

**P0-6:** Final review presenter unchanged structurally this sprint; integrity gate + business review v1 paths retained. Progress UX no longer contradicts judgment state.

## 2. Changed Files

- `apps/web/lib/intake/extract-document-text.ts` (new)
- `apps/web/app/api/intake/extract-document/route.ts` (new)
- `apps/web/lib/intake/__tests__/extract-document-text.test.ts` (new)
- `apps/web/features/workflow-journey/lib/v2-smart-intake-engine.ts`
- `apps/web/features/my-projects/components/project-intake-document-field.tsx`
- `apps/web/features/workflow-journey/components/project-workspace-shell/workspace-document-intake.tsx`
- `apps/web/features/workflow-journey/lib/business-understanding/build-shared-understanding.ts`
- `apps/web/features/workflow-journey/components/project-workspace-shell/workspace-ai-pm-loop-panel.tsx`
- `apps/web/features/workflow-journey/components/project-workspace-shell/workspace-ai-pm-main.tsx`
- `apps/web/features/workflow-journey/lib/business-understanding/ai-pm-simple-question-presenter.ts`
- `apps/web/vitest.config.ts`
- `packages/i18n/src/messages/ko.json`, `en.json`
- `apps/web/package.json` (+ pdf-parse, mammoth)

## 3. Core Logic Changes

1. **Real PDF/DOCX extraction** via `/api/intake/extract-document` (pdf-parse v2 `PDFParse`, mammoth).
2. **Upload failure UX** — explicit "문서를 읽지 못했습니다" + retry; no fake success on placeholder.
3. **Intake seed priority** — `parseIntakeSeedDocument` business description used before unreadable fallback.
4. **Confirm correction flow** — `confirmCorrectionMode` opens textarea + submit when no prior turns.
5. **Canonical persistence** — `persistWorkspaceStateDbFirst` after understanding edit confirm.
6. **Progress label** — `확인 진행 중 · N번째 질문` replaces `사업 이해 N / 5`.

## 4. Tests

**Unit:**
- `lib/intake/__tests__/extract-document-text.test.ts` — TXT extract, unsupported, empty, intake seed priority, readSmartIntakeFile
- `p0-document-understanding-loop.test.ts` — progress label regression

**Integration:** Existing business-understanding suite (548 pass; 20 pre-existing failures unrelated to this diff)

**Browser/Scenario:** Pending CPO Gate 1–6 on production after deploy

## 5. Actual User Journey

| Step | Status |
|------|--------|
| Document upload (TXT) | PASS — real text extracted |
| Document upload (PDF/DOCX) | PASS — server extraction (no placeholder) |
| Understanding | PASS — `사업 설명` seeds business field |
| Correction (document-first) | PASS — edit → confirm → memory persist |
| Correction (loop confirm) | PASS — 아니요 opens correction textarea |
| Question/Answer | Existing V3 engine (minimal touch) |
| Judgment | Existing V3 pipeline |
| Final Review | Existing business review v1 |

## 6. Negative Tests

| Test | Status |
|------|--------|
| N1 — info lacking but slots filled | IMPROVED — no text.slice problem fallback |
| N2 — corrected inference reappears | IMPROVED — DB persist on correction |
| N3 — same gap repeat | Existing policy retained |
| N4 — answer ignored | Existing memory path + persist |
| N5 — document ignored | FIXED — intake seed + real extraction |
| N6 — slot force split | IMPROVED — problem slot-fill removed |

## 7. Production

Commit SHA: _(filled after push)_
Build SHA: _(filled after push)_
Production SHA: _(filled after deploy verify)_
SHA Match: PENDING

Production smoke: PENDING post-deploy

## 8. Known Issues

- Pre-existing unit test failures in v3-runtime-certification, day8g-judgment-conversation (unrelated).
- DOCX/PDF extraction quality depends on document structure; scanned PDFs may still fail with clear error UX.
- P1 project lifecycle (delete/archive) not in this sprint scope.

## 9. CTO Verdict

**PASS** (pending production SHA verification)
