# Autonomous Seller Sprint — STOP Evidence

**작성:** 2026-10-03 UTC · CTO (Cursor Cloud Agent)
**브랜치:** `cursor/seller-tennis-products-e648` (base `main` = `baf2eca`)
**결과:** Phase 1(요구사항 조사)에서 Hard Blocker 2건 → 구현 미착수, 코드 변경 0

## 1. 조사 범위

| 대상 | 방법 | 결과 |
|------|------|------|
| `docs/` 전체 (TASKS, ROADMAP, BACKLOG, sprints, evidence) | `셀러 / seller / 테니스 / tennis / 상품 등록 / SKU` 검색 | 셀러 요청 0건. `reseller portal`(PRODUCT_CONSTITUTION L325)과 mock 문구 `유사 SKU`만 걸림 |
| 앱 코드 (`apps/`, `packages/`) | 같은 검색어, 상품 관련 route / module | 상품 관련은 `apps/web/modules/naver-commerce` 하나 |
| DB schema (`*.sql` 전체) | `create table` 목록 | 상품 / 셀러 / 카테고리 / 재고 테이블 없음 (§3) |
| Git 이력 (전 브랜치 81개) | `git log --all --grep` seller/셀러/tennis/테니스/상품/naver | 0건 |
| GitHub PR / Issue | `gh pr list`, `gh issue list` (state all) | 해당 PR 0건, Issue 없음 |
| 같은 계정의 다른 저장소 | `jyp-ai1/game-platform`, `jyp-ai1/companion` shallow clone 후 검색 | 셀러 요청 없음. `game-platform`의 tennis 매치는 탁구 게임(table-tennis) |

## 2. Blocker 1 — 셀러 사장님 요청사항의 SoT가 없다 (P0)

- 저장소, 이력, PR, Issue, 같은 계정의 다른 저장소 어디에도 셀러 요청 목록, 셀러 고객, 셀러 화면이 없다
- 그래서 "완료 / 미완료"를 나눌 기준 문서가 없다
- 요청사항을 임의로 만들어 구현하면 지시서의 "기존 요구사항을 SoT로" 원칙과 Vision guard("No Vision-external features")에 어긋난다
- 분류: **요구사항 부재 (Hard Blocker)**

## 3. Blocker 2 — 테니스 상품 등록을 연결할 상품 데이터 구조가 없다 (P1)

### 유일한 기존 상품 구조: Naver Commerce MVP (Sprint 9 프로토타입)

| 항목 | 사실 | 근거 |
|------|------|------|
| 흐름 | 상품 URL → Playwright 크롤링 → 추출 → AI 문구 → 이미지 최적화 → 초안 JSON | `docs/NAVER_MVP.md`, `services/pipeline-service.ts` |
| 직접 입력 등록 | 없음 (URL 크롤링만) | `components/url-input.tsx`, `ImportProductInput { url }` |
| 저장소 | 서버 로컬 파일 `.naver-commerce/drafts/DRAFT-*.json` | `services/draft-service.ts` L12, L63–69 |
| 목록 조회 | 없음 (`loadDraft(id)`만 있음) | `draft-service.ts` |
| 네이버 업로드 | 시뮬레이션 (로컬 저장 후 가짜 productId) | `uploadDraftToNaver` L94–110 |
| 카테고리 | 크롤링 HTML의 breadcrumb 문자열. 분류 체계 없음 | `product-extractor.ts` L37–40 |
| 셀러 / 소유자 | 없음 (user / project 연결 없음) | `ProductDraft` 타입 |
| Production | `/naver-commerce` → `307 /workspace` (2026-07-29 `d21a380`에서 은퇴) | `next.config.ts` L121, curl 확인 |

### DB

Supabase 테이블 28개 중 상품 / 셀러 / 카테고리 / 재고 / 가격 테이블이 없다. (`startup_projects`, `analytics_events`, `competitors`, `evidence`, `prd_documents` … 전부 ALABOM 사업 검증 도메인)

### 결론

지시서 DoD의 "등록 → 목록 확인 → 상세/수정 진입 → 다시 진입해도 데이터 유지"를 만족하려면 영속 저장소가 필요하다. 그 경우 아래 중 하나가 필요한데, 둘 다 지시서 금지 사항이다.

1. **새 상품 테이블 / schema 추가**: "임의로 새로운 상품 모델을 만들거나 DB schema를 변경하지 않는다" 위반, DB는 PM gate 대상
2. **로컬 파일 저장 재사용**: Vercel serverless 파일시스템은 영속되지 않는다 → 재진입 시 데이터 유지 불가 [추정: Vercel 런타임 특성, Preview에서 직접 검증하지 않음]

추가로 `/naver-commerce`는 Production에서 은퇴한 경로다. 이를 되살리면 ALABOM 제품 방향(AI Strategy PM)을 바꾸는 결정이 된다.

- 분류: **기존 DB schema로 구현 불가 (Hard Blocker)**

## 4. 진행하지 않은 것

- 셀러 요청사항 추정 구현
- Naver Commerce 모듈 수정 / 재활성화
- DB schema 변경, Sample 상품 생성
- 인증, AI PM, V3 SoT, Sprint 2, Project Brief: 미접촉

## 5. Unblock에 필요한 입력 (CPO)

| # | 필요한 것 | 가능해지는 작업 |
|---|-----------|-----------------|
| U1 | 셀러 요청사항 원문 (메시지 / 문서 / 다른 저장소 위치) | P0 목록화 → 구현 |
| U2 | 셀러 기능이 이 저장소(ALABOM)가 맞는지, 아니면 다른 저장소인지 | 작업 위치 확정 |
| U3 | 이 저장소에서 할 경우, 상품 저장 방식 결정: (a) 새 `seller_products` 테이블 migration 허용, (b) 기존 Naver MVP 파일 저장 유지(영속성 없음 수용), (c) 외부 Naver Commerce API 연동 (credential 필요) | P1 테니스 상품 등록 |
| U4 | 테니스 카테고리 체계 (예: 라켓 / 스트링 / 볼 / 신발 / 의류 / 가방, 또는 네이버 카테고리 ID) | 카테고리 필드 |
