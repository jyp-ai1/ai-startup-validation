import type { InterviewQuestionId } from '../types/interview-state';

export type MockInterviewQuestion = {
  id: InterviewQuestionId;
  stepLabel: string;
  text: string;
};

export const MOCK_INTERVIEW_QUESTIONS: MockInterviewQuestion[] = [
  {
    id: 'q1-problem',
    stepLabel: 'Q1',
    text: '현재 해결하려는 문제는 무엇인가요?',
  },
  {
    id: 'q2-customer',
    stepLabel: 'Q2',
    text: '이 문제를 가장 크게 느끼는 고객은 누구인가요?',
  },
];

export const MOCK_DECISION = {
  title: '오늘의 결정',
  summary: '타깃 고객을 먼저 정의하는 것을 추천합니다.',
  detail:
    '문제와 고객이 연결되면 시장·비즈니스 전략을 더 명확하게 검토할 수 있습니다. 다음 단계에서 시장 가설을 함께 정리합니다. (Mock)',
};
