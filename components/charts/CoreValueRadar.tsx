'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export function CoreValueRadar({
  scores,
}: {
  scores: Record<string, number | null | undefined>;
}) {
  const data = ['성장', '신뢰', '전문성', '감각'].map((name) => ({
    name,
    score: Number(scores[name] ?? 0),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
          <Radar dataKey="score" fillOpacity={0.22} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
