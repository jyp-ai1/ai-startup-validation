type ScoreProgressCircleProps = {
  totalScore: number;
  maxScore?: number;
};

export function ScoreProgressCircle({
  totalScore,
  maxScore = 100,
}: ScoreProgressCircleProps) {
  const percent = Math.min(100, Math.round((totalScore / maxScore) * 100));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-muted"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{totalScore}</span>
        <span className="text-xs text-muted-foreground">/ {maxScore}</span>
      </div>
    </div>
  );
}
