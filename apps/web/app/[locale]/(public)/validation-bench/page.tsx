import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { ValidationBenchScreen } from '@/features/manual-validation-bench/components/validation-bench-screen';
import { requireAuthUser } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CEO 수동 검증',
  description: '로그인한 사용자가 GPT와 Gemini 웹 응답을 붙여 넣고 라운드별로 복사한다. 모델을 호출하지 않는다.',
  robots: { index: false, follow: false },
};

export default async function ValidationBenchPage() {
  await cookies();
  await requireAuthUser('/validation-bench');
  return (
    <main id="main">
      <ValidationBenchScreen />
    </main>
  );
}
