import type { Metadata } from 'next';

import { ValidationJourneyScreen } from '@/features/business-validation-journey/components/validation-journey-screen';

export const metadata: Metadata = {
  title: '내 사업 이해하기',
  description: '사업 정보를 나누어 입력하고, 부족한 부분 하나만 확인한다.',
};

export default function BusinessValidationPage() {
  return (
    <main id="main">
      <ValidationJourneyScreen />
    </main>
  );
}
