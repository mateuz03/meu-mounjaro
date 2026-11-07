import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, EmptyState, Disclaimer, RatingScale } from '../components/ui';
import { IconApple } from '../components/ui';
import { LineChart, type ChartPoint } from '../components/LineChart';
import { addDays, todayISO, formatDateShort, SLOT_ORDER, SLOT_LABELS } from '../lib/helpers';

const PERIODS = [
  { id: '7', label: '7 dias', days: 7 },
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '3 meses', days: 90 },
] as const;

export function DietEvolution() {
  const { data } = useApp();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['id']>('7');

  const today = todayISO();
  const days = PERIODS.find((p) => p.id === period)!.days;
  const from = addDays(today, -(days - 1));

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of data.diet_meal_logs) {
      if (l.log_date < from || l.log_date > today) continue;
      map.set(l.log_date, (map.get(l.log_date) ?? 0) + (l.calories ?? 0));
    }
    return map;
  }, [data.diet_meal_logs, from, today]);

  const points = useMemo<ChartPoint[]>(() => {
    const list: ChartPoint[] = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(today, -(days - 1 - i));
      const v = byDay.get(d);
      if (v != null && v > 0) list.push({ date: d, value: v });
    }
    return list;
  }, [byDay, days, today]);

  const daysLogged = [...byDay.entries()].filter(([, v]) => v > 0);
  const avg = daysLogged.length > 0
    ? Math.round(daysLogged.reduce((acc, [, v]) => acc + v, 0) / daysLogged.length)
    : null;
  const maxDay = daysLogged.reduce((acc, [d, v]) => (v > (byDay.get(acc) ?? 0) ? d : acc), '');

  // contribuição por horário da refeição
  const slotTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const l of data.diet_meal_logs) {
      if (l.log_date < from || l.log_date > today) continue;
      totals.set(l.meal_slot, (totals.get(l.meal_slot) ?? 0) + (l.calories ?? 0));
    }
    const grand = [...totals.values()].reduce((a, b) => a + b, 0);
    return { totals, grand };
  }, [data.diet_meal_logs, from, today]);

  // dias registrados consecutivos (terminando hoje ou ontem)
  const streak = useMemo(() => {
    let count = 0;
    let cursor = today;
    if (!byDay.get(cursor)) cursor = addDays(today, -1);
    while ((byDay.get(cursor) ?? 0) > 0) {
      count++;
      cursor = addDays(cursor, -1);
    }
    return count;
  }, [byDay, today]);

  const hasLogs = data.diet_meal_logs.length > 0;
  const maxSlot = [...slotTotals.totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div>
      <h1>Evolução</h1>
      <p className="muted mt-small">
        Calorias confirmadas por você nos registros de refeições — somadas a partir do menu que você
        criou.
      </p>

      {!hasLogs ? (
        <Card>
          <EmptyState
            icon={<IconApple size={34} />}
            title="Nenhuma refeição confirmada ainda"
            message="Confirme as refeições que você comeu na aba Refeições — os totais diários aparecem aqui."
          />
        </Card>
      ) : (
        <>
          <div className="stat-grid">
            <Card className="stat-card">
              <span className="stat-label">Média diária</span>
              <span className="stat-big stat-diet">{avg != null ? `${avg}` : '—'}</span>
              <span className="stat-sub">kcal confirmados por dia registrado</span>
            </Card>
            <Card className="stat-card">
              <span className="stat-label">Dias com registro</span>
              <span className="stat-big">{daysLogged.length}</span>
              <span className="stat-sub">nos últimos {days} dias</span>
            </Card>
            <Card className="stat-card">
              <span className="stat-label">Sequência atual</span>
              <span className="stat-big">{streak > 0 ? `${streak}` : '—'}</span>
              <span className="stat-sub">{streak === 1 ? 'dia consecutivo' : 'dias consecutivos'}</span>
            </Card>
          </div>

          <Card>
            <div className="section-title">
              <h2>Calorias por dia</h2>
              <div className="view-toggle">
                {PERIODS.map((p) => (
                  <button key={p.id} className={period === p.id ? 'active' : ''} onClick={() => setPeriod(p.id)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {points.length > 1 ? (
              <LineChart points={points} unit="kcal" color="#d97706" />
            ) : (
              <p className="muted small">
                {points.length === 1
                  ? `Único registro: ${formatDateShort(points[0].date)} — confirme mais dias para ver o gráfico.`
                  : 'Nenhuma refeição confirmada neste período.'}
              </p>
            )}
            {maxDay && avg != null && (
              <p className="muted small">
                Dia com mais kcal confirmados: <strong>{formatDateShort(maxDay)}</strong> ({byDay.get(maxDay)} kcal).
              </p>
            )}
          </Card>

          {maxSlot && slotTotals.grand > 0 && (
            <Card>
              <div className="section-title">
                <h2>Contribuição por refeição</h2>
              </div>
              {SLOT_ORDER.map((s) => {
                const v = slotTotals.totals.get(s) ?? 0;
                const pct = slotTotals.grand > 0 ? Math.round((v / slotTotals.grand) * 100) : 0;
                return (
                  <div className="slot-bar" key={s}>
                    <span className="slot-bar-label">{SLOT_LABELS[s]}</span>
                    <div className="slot-bar-track">
                      <div className="slot-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="slot-bar-value">{v > 0 ? `${v} · ${pct}%` : '—'}</span>
                  </div>
                );
              })}
              <p className="muted small">
                <strong>{SLOT_LABELS[maxSlot as keyof typeof SLOT_LABELS]}</strong> é o horário com mais kcal
                confirmados neste período. A distribuição mostra a sua rotina registrada — sem avaliação
                nutricional.
              </p>
            </Card>
          )}
        </>
      )}

      <Disclaimer>
        A evolução mostra os valores que você confirmou e estima por porção. Não há meta calórica,
        comparação com padrões ou recomendação alimentar. Para orientação nutricional individualizada,
        procure nutricionista.
      </Disclaimer>
    </div>
  );
}
