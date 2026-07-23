'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { OnboardingConsultantDialog } from './onboarding-consultant-dialog';

type OnboardingConsultantHostProps = {
  projectId: string;
  projectTitle: string;
  onboardingComplete: boolean;
  demoMode?: boolean;
};

export function OnboardingConsultantHost(props: OnboardingConsultantHostProps) {
  return (
    <Suspense fallback={null}>
      <OnboardingConsultantHostInner {...props} />
    </Suspense>
  );
}

function OnboardingConsultantHostInner({
  projectId,
  projectTitle,
  onboardingComplete,
  demoMode = false,
}: OnboardingConsultantHostProps) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (demoMode || onboardingComplete) return;
    setOpen(true);
  }, [demoMode, onboardingComplete]);

  useEffect(() => {
    if (searchParams.get('onboarding') === '1') {
      setOpen(true);
    }
  }, [searchParams]);

  if (demoMode || onboardingComplete) return null;

  return (
    <OnboardingConsultantDialog
      projectId={projectId}
      projectTitle={projectTitle}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
