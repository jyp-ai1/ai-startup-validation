'use client';

import { V2InvestigationScheduleSettings } from '@/features/workflow-journey/components/v2/v2-investigation-schedule-settings';

export function SettingsInvestigationSection() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <V2InvestigationScheduleSettings />
    </div>
  );
}
