import type { Metadata } from 'next';

import { ValidationBenchScreen } from '@/features/manual-validation-bench/components/validation-bench-screen';

export const metadata: Metadata = {
  title: 'CEO 수동 검증',
  description: 'GPT와 Gemini 웹 응답을 붙여 넣고 라운드별로 복사한다. 모델을 호출하지 않는다.',
};

export default function ValidationBenchPage() {
  return (
    <main id="main">
      <ValidationBenchScreen />
    </main>
  );
}
