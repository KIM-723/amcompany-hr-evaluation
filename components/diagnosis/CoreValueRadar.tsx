type RadarItem = {
  label: string;
  value: number | null;
};

function point(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
) {
  return [
    cx + Math.cos(angle) * radius,
    cy + Math.sin(angle) * radius,
  ] as const;
}

export function CoreValueRadar({
  items,
  size = 320,
}: {
  items: RadarItem[];
  size?: number;
}) {
  const normalized = items.slice(0, 4);
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.32;
  const angles = normalized.map(
    (_, index) => -Math.PI / 2 + (Math.PI * 2 * index) / normalized.length,
  );

  const gridLevels = [25, 50, 75, 100];

  const dataPoints = normalized.map((item, index) => {
    const value = item.value ?? 0;
    return point(
      cx,
      cy,
      maxRadius * (value / 100),
      angles[index],
    );
  });

  const polygon = dataPoints.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full max-w-[360px]"
        role="img"
        aria-label="핵심가치 Alignment 레이더 차트"
      >
        {gridLevels.map((level) => {
          const points = angles
            .map((angle) =>
              point(cx, cy, maxRadius * (level / 100), angle),
            )
            .map(([x, y]) => `${x},${y}`)
            .join(' ');

          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          );
        })}

        {angles.map((angle, index) => {
          const [x, y] = point(cx, cy, maxRadius, angle);

          return (
            <line
              key={index}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}

        <polygon
          points={polygon}
          fill="rgba(37,99,235,0.16)"
          stroke="#2563eb"
          strokeWidth="2.5"
        />

        {dataPoints.map(([x, y], index) => (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="4"
            fill="#2563eb"
          />
        ))}

        {normalized.map((item, index) => {
          const [x, y] = point(
            cx,
            cy,
            maxRadius + 34,
            angles[index],
          );

          return (
            <g key={item.label}>
              <text
                x={x}
                y={y - 3}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                fontWeight="700"
                fill="#334155"
              >
                {item.label}
              </text>
              <text
                x={x}
                y={y + 14}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="12"
                fill="#64748b"
              >
                {item.value === null ? '근거부족' : `${item.value}점`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
