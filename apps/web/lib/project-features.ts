import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Bot,
  Briefcase,
  ClipboardList,
  Code2,
  Database,
  FileCode,
  FileText,
  Gauge,
  Landmark,
  MessageSquare,
  Swords,
} from 'lucide-react';

export type ProjectFeatureConfig = {
  segment: string;
  icon: LucideIcon;
  labelKey:
    | 'projectDetail.researchPlans'
    | 'projectDetail.evidence'
    | 'projectDetail.knowledge'
    | 'projectDetail.agent'
    | 'projectDetail.competitors'
    | 'projectDetail.voc'
    | 'projectDetail.grants'
    | 'projectDetail.validation'
    | 'projectDetail.reports'
    | 'projectDetail.businessPlan'
    | 'projectDetail.prd'
    | 'projectDetail.devSpec';
};

export const PROJECT_FEATURE_CONFIGS: ProjectFeatureConfig[] = [
  { segment: 'research', icon: ClipboardList, labelKey: 'projectDetail.researchPlans' },
  { segment: 'evidence', icon: Database, labelKey: 'projectDetail.evidence' },
  { segment: 'knowledge', icon: BookOpen, labelKey: 'projectDetail.knowledge' },
  { segment: 'agent', icon: Bot, labelKey: 'projectDetail.agent' },
  { segment: 'competitors', icon: Swords, labelKey: 'projectDetail.competitors' },
  { segment: 'voc', icon: MessageSquare, labelKey: 'projectDetail.voc' },
  { segment: 'grants', icon: Landmark, labelKey: 'projectDetail.grants' },
  { segment: 'validation', icon: Gauge, labelKey: 'projectDetail.validation' },
  { segment: 'reports', icon: FileText, labelKey: 'projectDetail.reports' },
  { segment: 'business-plan', icon: Briefcase, labelKey: 'projectDetail.businessPlan' },
  { segment: 'prd', icon: FileCode, labelKey: 'projectDetail.prd' },
  { segment: 'development-spec', icon: Code2, labelKey: 'projectDetail.devSpec' },
];
