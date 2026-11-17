import React, { useId } from 'react';

export interface ChartPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

const fmtVal = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const fmtDay = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};
const fmtFullDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/** Resumo textual da tendência entre o primeiro e o último registro. */
export function chartTrendText(points: ChartPoint[], unit = ''): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  const diff = Math.round((last.value - first.value) * 100) / 100;
  const u = unit ? ` ${unit}` : '';
  if (diff === 0) return 'sem variação entre o primeiro e o último registro';
  if (diff > 0) return `aumento de ${fmtVal(diff)}${u} do primeiro ao último registro`;
  return `redução de ${fmtVal(Math.abs(diff))}${u} do primeiro ao último registro`;
}

/**
 * Lightweight dependency-free SVG line chart.
 * Inclui alternativa textual acessível: rótulo descritivo com tendência
 * e tabela de dados vinculada via aria-describedby.
 */
export function LineChart({
  points,
  title,
  color = '#0d9488',
  height = 180,
  unit = '',
  goal,
}: {
  points: ChartPoint[];
  /** Nome da métrica exibida (ex.: "Peso", "Calorias consumidas"). */
  title: string;
  color?: string;
  height?: number;
  unit?: string;
  goal?: number | null;
}) {
  const tableId = useId();
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

  const first = points[0];
  const last = points[points.length - 1];
  const u = unit ? ` ${unit}` : '';
  const period =
    points.length === 1
      ? `1 registro em ${fmtFullDate(first.date)}`
      : `${points.length} registros entre ${fmtFullDate(first.date)} e ${fmtFullDate(last.date)}`;
  const goalText =
    goal != null ? ` A linha tracejada indica a meta registrada: ${fmtVal(goal)}${u}.` : '';
  const ariaLabel = `Gráfico de ${title.toLowerCase()}: ${period}. ${chartTrendText(points, unit)}. Último valor registrado: ${fmtVal(last.value)}${u}.${goalText} A tabela com todos os valores está disponível logo abaixo do gráfico.`;

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
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="line-chart"
        role="img"
        aria-label={ariaLabel}
        aria-describedby={tableId}
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
      <details className="chart-data">
        <summary>Ver dados do gráfico ({points.length} {points.length === 1 ? 'registro' : 'registros'})</summary>
        <table id={tableId}>
          <caption className="sr-only">{title} por data{u ? `, em ${unit}` : ''}</caption>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">{title}{u ? ` (${unit})` : ''}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={i}>
                <td>{fmtFullDate(p.date)}</td>
                <td>{fmtVal(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
