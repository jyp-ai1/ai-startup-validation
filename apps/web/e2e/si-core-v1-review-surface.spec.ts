import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { dismissCookies } from './_helpers/v3-p0-e2e-helpers';

const ARTIFACT_DIR = '/opt/cursor/artifacts/screenshots';
const SESSION_ID = 'silmulm01';
const PROJECT_ID = `demo-my-${SESSION_ID}`;
const LMULM = `LMULM은 교보문고 사내벤처에서 출발한 한정판 문구 브랜드이자 C2C 재판매 플랫폼이다.

교보에서 분사하여 독립 법인으로 운영 중이며, 자체 앱을 출시했다.
오로라 한정판 문구를 실제로 판매했고, 공급망과 초기 고객 구매가 존재한다.
1차 한정판 판매 매출이 있다.

사업 모델은 한정판을 산 구매자가 이후 C2C로 재판매하고, 그 거래가 반복되는 것이다.
현재까지 1차 판매는 있으나, C2C 재판매가 반복적으로 발생하는지는 확인되지 않았다.
재구매·재판매 등록·2차 거래 데이터는 아직 없다.

기존 대안은 중고나라·번개장터 같은 범용 중고 거래와 브랜드 공식 재입고다.`;

test('S.I. V1 review surface leads after LMULM business input', async ({ page }) => {
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

  const surface = page.getByTestId('si-review-surface');
  await expect(surface).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('si-verdict-label')).toContainText('사업화 가능성이 높음');
  await expect(page.getByTestId('si-judgment-prose')).not.toContainText(/\d{2,3}\s*점/);
  await expect(page.getByTestId('si-critical-unknown')).toContainText(/재판매|C2C/);
  await expect(page.getByTestId('si-decision-evidence')).toContainText(/재판매|재구매|거래/);
  await expect(page.getByTestId('si-validation-priority')).toBeVisible();

  const decline = page.getByRole('button', { name: /Decline|거절|거부/i });
  if (await decline.first().isVisible().catch(() => false)) {
    await decline.first().click({ force: true });
  }

  await surface.screenshot({ path: path.join(ARTIFACT_DIR, 'si-v1-lmulm-review-surface.png') });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'si-v1-lmulm-workspace.png'),
    fullPage: true,
  });
});
