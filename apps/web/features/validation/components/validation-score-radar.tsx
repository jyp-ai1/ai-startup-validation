'use client';

import type { ValidationScore } from '@repo/types/validation';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';

import { SCORE_CATEGORIES } from '../utils/score-calculator';

type ValidationScoreRadarProps = {
  score: ValidationScore;
};

export function ValidationScoreRadar({ score }: ValidationScoreRadarProps) {
  const data = SCORE_CATEGORIES.map((category) => ({
    subject: category.label,
    score: score[category.key],
    fullMark: category.maxScore,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 20]} tick={{ fontSize: 10 }} />
          <Radar
            name="Score"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
