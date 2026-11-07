import React from 'react';

export interface ChartPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

/**
 * Lightweight dependency-free SVG line chart.
 */
export function LineChart({
  points,
  color = '#0d9488',
  height = 180,
  unit = '',
  goal,
}: {
  points: ChartPoint[];
  color?: string;
  height?: number;
  unit?: string;
  goal?: number | null;
}) {
  if (points.length === 0) return null;

  const W = 600;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padT = 14;
  const padB = 26;

  const values = points.map((p) => p.value).concat(goal != null ? [goal] : []);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.08;
  max += span * 0.08;

  const xs = points.map((p) => p.date);
  const firstT = Date.parse(xs[0] + 'T00:00:00');
  const lastT = Date.parse(xs[xs.length - 1] + 'T00:00:00');

  const x = (i: number) =>
    xs.length === 1
      ? (padL + (W - padL - padR) / 2)
      : padL + (i / (xs.length - 1)) * (W - padL - padR);
  const y = (v: number) =>
    padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ');

  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;

  const fmtDay = (iso: string) => {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  };

  const labelIdx: number[] = [];
  if (points.length <= 6) {
    for (let i = 0; i < points.length; i++) labelIdx.push(i);
  } else {
    labelIdx.push(0, points.length - 1);
    const mid = Math.floor(points.length / 2);
    labelIdx.push(mid);
    labelIdx.sort((a, b) => a - b);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="line-chart"
      role="img"
      aria-label="Gráfico de evolução"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {goal != null && (
        <g>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(goal)}
            y2={y(goal)}
            stroke="#f59e0b"
            strokeDasharray="6 5"
            strokeWidth="1.5"
          />
          <text x={W - padR} y={y(goal) - 5} textAnchor="end" fontSize="12" fill="#b45309">
            Meta: {goal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
            {unit ? ` ${unit}` : ''}
          </text>
        </g>
      )}
      <path d={area} fill="url(#chartFill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />
      ))}
      {labelIdx.map((i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize="12" fill="#64748b">
          {fmtDay(points[i].date)}
        </text>
      ))}
      <text x={padL} y={padT - 2} fontSize="12" fill="#64748b">
        {max.toFixed(1)}
      </text>
      <text x={padL} y={H - padB - 2} fontSize="12" fill="#64748b">
        {min.toFixed(1)}
      </text>
    </svg>
  );
}
