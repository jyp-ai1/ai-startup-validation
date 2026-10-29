import { expect, type Page } from '@playwright/test';

export async function expectSingleReviewLead(page: Page) {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await dialog.getByRole('button').first().click({ force: true });
  }
  const flow = page.getByTestId('ai-pm-review');
  await expect(flow).toBeVisible({ timeout: 60_000 });
  await expect(flow).toHaveAttribute('data-result-source', 'input-only');
  await expect(page.getByTestId('si-review-surface')).toHaveCount(0);
  await expect(page.getByTestId('si-ai-pm-bind-surface')).toHaveCount(0);
  await expect(flow).not.toContainText('가장 가까운 결제 후보에게 유료로 제안했거나');
  await expect(page.getByTestId('ai-pm-confirm-result')).toBeVisible();
}

export async function walkLocalFeedback(page: Page, answer: string) {
  await page.getByTestId('ai-pm-confirm-result').click();
  await page.getByRole('checkbox', { name: '사업 이해가 틀림' }).check();
  await page.getByRole('checkbox', { name: '핵심 내용이 빠짐' }).check();
  await page.getByTestId('ai-pm-feedback-submit').click();
  await expect(page.getByTestId('ai-pm-revised')).toContainText('오류로 표시');
  await expect(page.getByTestId('ai-pm-message')).toContainText('브라우저');
  await page.getByTestId('ai-pm-next-step').click();
  await expect(page.getByTestId('ai-pm-next-question')).toHaveAttribute('data-question-source', 'input-only');
  await page.getByTestId('ai-pm-verification-answer').fill(answer);
  await page.getByTestId('ai-pm-verification-submit').click();
  await expect(page.getByTestId('ai-pm-reflected-answer')).toContainText(answer);
  await expect(page.getByTestId('ai-pm-message')).toContainText('모델 호출은 없습니다');
}
