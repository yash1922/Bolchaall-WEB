"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function ProgressChart({
  data,
}: {
  data: Array<{ score: number; createdAt: string }>;
}) {
  const series = [...data]
    .reverse()
    .map((s, i) => ({ idx: i + 1, score: s.score, when: new Date(s.createdAt).toLocaleDateString() }));

  if (series.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-ink-500">
        No scores yet — record your first attempt to see your progress.
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="idx" stroke="rgba(255,255,255,0.4)" fontSize={11} />
          <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.4)" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: "rgba(11,7,18,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#9461ff"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#9461ff" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
