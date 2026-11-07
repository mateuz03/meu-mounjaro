import React from 'react';

const SITES = ['Abdômen', 'Coxa', 'Braço', 'Nádega'] as const;

/**
 * Simple body illustration: click a region to select the injection site.
 */
export function BodyMap({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (site: string) => void;
}) {
  const hit = (site: string) => (
    <g key={site} onClick={() => onChange(site)} style={{ cursor: 'pointer' }}>
      <circle
        cx={HOTSPOTS[site].x}
        cy={HOTSPOTS[site].y}
        r="13"
        fill={value === site ? '#0d9488' : '#0d948822'}
        stroke={value === site ? '#0d9488' : '#5eead4'}
        strokeWidth="2"
      />
      <circle cx={HOTSPOTS[site].x} cy={HOTSPOTS[site].y} r="5" fill={value === site ? '#fff' : '#0d9488'} />
    </g>
  );

  return (
    <div className="bodymap-wrap">
      <svg viewBox="0 0 160 260" className="bodymap" role="group" aria-label="Selecionar local da aplicação">
        {/* head */}
        <circle cx="80" cy="22" r="14" fill="#e0f2f1" stroke="#99f6e4" strokeWidth="2" />
        {/* torso */}
        <path
          d="M55 40 Q80 32 105 40 L110 110 Q80 122 50 110 Z"
          fill="#e0f2f1"
          stroke="#99f6e4"
          strokeWidth="2"
        />
        {/* arms */}
        <path d="M55 44 L38 55 L30 120 L42 122 L52 70 Z" fill="#e0f2f1" stroke="#99f6e4" strokeWidth="2" />
        <path d="M105 44 L122 55 L130 120 L118 122 L108 70 Z" fill="#e0f2f1" stroke="#99f6e4" strokeWidth="2" />
        {/* legs */}
        <path d="M58 118 L50 240 L72 240 L78 130 Z" fill="#e0f2f1" stroke="#99f6e4" strokeWidth="2" />
        <path d="M102 118 L110 240 L88 240 L82 130 Z" fill="#e0f2f1" stroke="#99f6e4" strokeWidth="2" />
        {/* buttocks hint */}
        <path d="M55 110 Q80 122 105 110 L104 124 Q80 134 56 124 Z" fill="#f0fdfa" stroke="#ccfbf1" strokeWidth="1.5" />
        {SITES.map((s) => hit(s))}
      </svg>
      <div className="bodymap-legend">
        {SITES.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip ${value === s ? 'chip-active' : ''}`}
            onClick={() => onChange(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

const HOTSPOTS: Record<string, { x: number; y: number }> = {
  'Abdômen': { x: 80, y: 88 },
  'Coxa': { x: 64, y: 175 },
  'Braço': { x: 34, y: 95 },
  'Nádega': { x: 98, y: 118 },
};
