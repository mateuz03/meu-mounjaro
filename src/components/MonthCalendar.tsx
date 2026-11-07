import React, { useMemo, useState } from 'react';
import { IconChevronLeft, IconChevronRight } from './ui';
import { toISO, formatMonthYear } from '../lib/helpers';

export interface CalendarEvent {
  date: string;
  kind: 'aplicacao' | 'aplicacao_prevista' | 'pesagem' | 'consulta' | 'exame' | 'lembrete';
  label: string;
}

const KIND_STYLE: Record<CalendarEvent['kind'], { color: string; name: string }> = {
  aplicacao: { color: '#0d9488', name: 'Aplicação' },
  aplicacao_prevista: { color: '#14b8a6', name: 'Aplicação prevista' },
  pesagem: { color: '#3b82f6', name: 'Pesagem' },
  consulta: { color: '#8b5cf6', name: 'Consulta' },
  exame: { color: '#f59e0b', name: 'Exame' },
  lembrete: { color: '#94a3b8', name: 'Lembrete' },
};

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function MonthCalendar({
  events,
  selectedDate,
  onSelectDay,
}: {
  events: CalendarEvent[];
  selectedDate?: string;
  onSelectDay?: (date: string) => void;
}) {
  const today = toISO(new Date());
  const [view, setView] = useState(() => {
    const base = selectedDate || today;
    const [y, m] = base.split('-').map(Number);
    return { y, m };
  });

  const { weeks, label } = useMemo(() => {
    const first = new Date(view.y, view.m - 1, 1);
    const startDow = first.getDay();
    const start = new Date(view.y, view.m - 1, 1 - startDow);
    const grid: { iso: string; day: number; inMonth: boolean }[][] = [];
    const cur = new Date(start);
    for (let w = 0; w < 6; w++) {
      const row: { iso: string; day: number; inMonth: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        row.push({
          iso: toISO(cur),
          day: cur.getDate(),
          inMonth: cur.getMonth() === view.m - 1,
        });
        cur.setDate(cur.getDate() + 1);
      }
      grid.push(row);
      const done = grid.flat().filter((c) => c.inMonth).length;
      if (done >= new Date(view.y, view.m, 0).getDate()) break;
    }
    return { weeks: grid, label: formatMonthYear(`${view.y}-${String(view.m).padStart(2, '0')}-01`) };
  }, [view]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const arr = map.get(e.date) || [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [events]);

  const shift = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m - 1 + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    });
  };

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mês anterior">
          <IconChevronLeft size={18} />
        </button>
        <span className="calendar-month">{label}</span>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Próximo mês">
          <IconChevronRight size={18} />
        </button>
      </div>
      <div className="calendar-grid calendar-weekdays">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      {weeks.map((row, ri) => (
        <div className="calendar-grid" key={ri}>
          {row.map((cell) => {
            const evts = byDate.get(cell.iso) || [];
            const kinds = [...new Set(evts.map((e) => e.kind))];
            const isToday = cell.iso === today;
            const isSel = cell.iso === selectedDate;
            return (
              <button
                key={cell.iso}
                type="button"
                className={[
                  'calendar-cell',
                  cell.inMonth ? '' : 'out',
                  isToday ? 'today' : '',
                  isSel ? 'selected' : '',
                ].join(' ')}
                onClick={() => onSelectDay?.(cell.iso)}
              >
                <span className="calendar-daynum">{cell.day}</span>
                <span className="calendar-dots">
                  {kinds.slice(0, 4).map((k) => (
                    <i key={k} style={{ background: KIND_STYLE[k].color }} title={KIND_STYLE[k].name} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      ))}
      <div className="calendar-legend">
        {Object.entries(KIND_STYLE).map(([k, v]) => (
          <span key={k} className="legend-item">
            <i style={{ background: v.color }} /> {v.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export { KIND_STYLE };
