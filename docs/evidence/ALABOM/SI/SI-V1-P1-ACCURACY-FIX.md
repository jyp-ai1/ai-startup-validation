# S.I. Residual P1 Accuracy Fix

**Branch:** `cursor/si-p1-accuracy-fix-e648`  
**Stacked on:** #195 `dc82497`  
**Production SHA:** `0b465226` UNCHANGED  
**Merge / Production deploy:** forbidden until CPO acceptance

#195의 72 비교 셀(A1–A5)은 유지한다. 이 Draft는 잔여 P1 두 항목만 보완한다.

## P1-A — 미등록 지표 표현

`가/이 N%`만으로는 현재 피해 수치를 놓친다. `si-problem-metric.ts`가 다음을 추가로 읽는다.

- 조사 없는 피해 명사 + 수량: `온도 초과 주 14건`, `재작업률 19%`
- `N%의` / `N건의` 후행 명사: `14건의 온도 초과`
- `%` / `건` / `회` / `퍼센트`
- 피해 단서(초과·불량·클레임 등)가 수량 옆에 있을 때만. 조사만으로 열지 않음

열지 않는 것: 결제 인원, CAGR/시장 전망, 목표 KPI, `여성(55%)` 같은 단순 구성비. 추출된 지표는 FACT이지 VALIDATED 성과가 아니다.

## P1-B — 지표 없는 사업의 S4

공식 `repeat_loop` 답(`재판매를 등록했고 12건이 거래됐다`)은 문서에 C2C/재판매 축이 있을 때만 S4다.

- 문서에 재판매 테제가 없으면 founder 오축 재판매 `repeat_validation`을 철회한다.
- `12건이 거래됐다` / `작업을 12건 등록했다`만으로는 completion이 아니다.
- 온축 반복(`다시 결제했`, `재구매했`, `재계약했`)과 C2C 공식 경로는 유지한다. 일괄 S4 금지는 하지 않는다.

## 회귀

- 8 types × 9 판단 셀 (72) A1–A5 유지
- SI `__tests__` 41 files / 206 tests
- `pnpm --filter web build`

## SoT / Lock

| 항목 | 상태 |
|---|---|
| Production `0b465226` | 불변 |
| #194 dump `a79c81c` | 불변 |
| #195 Draft | 기반. 이 PR은 별도 |
| persist SoT / Journey contract | 변경 없음 |
