import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { dismissCookies } from './_helpers/v3-p0-e2e-helpers';
import { expectSingleReviewLead, walkLocalFeedback } from './_helpers/ai-pm-single-flow';

const ARTIFACT_DIR = '/opt/cursor/artifacts/screenshots';
const SESSION_ID = 'sip3lmulm';
const PROJECT_ID = `demo-my-${SESSION_ID}`;
const LMULM = `LMULM은 교보문고 사내벤처에서 출발한 한정판 문구 브랜드이자 C2C 재판매 플랫폼이다.

교보에서 분사하여 독립 법인으로 운영 중이며, 자체 앱을 출시했다.
오로라 한정판 문구를 실제로 판매했고, 공급망과 초기 고객 구매가 존재한다.
1차 한정판 판매 매출이 있다.

사업 모델은 한정판을 산 구매자가 이후 C2C로 재판매하고, 그 거래가 반복되는 것이다.
현재까지 1차 판매는 있으나, C2C 재판매가 반복적으로 발생하는지는 확인되지 않았다.
재구매·재판매 등록·2차 거래 데이터는 아직 없다.

기존 대안은 중고나라·번개장터 같은 범용 중고 거래와 브랜드 공식 재입고다.`;

test('custom demo feedback stays on the input and does not re-judge with the rule engine', async ({ page }) => {
  test.setTimeout(120_000);
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  await page.addInitScript(
    ({ sessionId, projectId, text }) => {
      sessionStorage.setItem('launchlens.demo.mybusiness.sessionId', sessionId);
      sessionStorage.setItem(`launchlens.demo.customDocument.${projectId}`, text);
      sessionStorage.setItem(`launchlens.document.${projectId}.raw`, text);
    },
    { sessionId: SESSION_ID, projectId: PROJECT_ID, text: LMULM },
  );

  await page.goto('/workspace?demo=guided&sample=custom&fresh=1', {
    waitUntil: 'domcontentloaded',
  });
  await dismissCookies(page);
  await expectSingleReviewLead(page);
  await walkLocalFeedback(page, '최근 구매자 100명 중 35명이 재판매를 등록했다.');

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ai-pm-single-flow-feedback.png'),
    fullPage: true,
  });
});
