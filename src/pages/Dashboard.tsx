import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Card,
  SectionTitle,
  Button,
  EmptyState,
  Disclaimer,
  Tag,
  IconSyringe,
  IconScale,
  IconBook,
  IconPlus,
  IconBox,
  IconClock,
  IconAlert,
} from '../components/ui';
import { LineChart, type ChartPoint } from '../components/LineChart';
import {
  greeting,
  firstName,
  todayISO,
  addDays,
  daysUntil,
  formatDateLong,
  weekdayShort,
  kgToDisplay,
  fmtNum,
  MANDATORY_DISCLAIMER,
} from '../lib/helpers';

export function Dashboard() {
  const { data, setTab, setAction, session, demo } = useApp();
  const profile = data.profile;
  const wUnit = profile?.weight_unit ?? 'kg';

  const today = todayISO();

  const applications = useMemo(
    () => [...data.applications].sort((a, b) => (a.application_date < b.application_date ? 1 : -1)),
    [data.applications],
  );
  const lastApp = applications[0];

  const nextReminder = useMemo(() => {
    return data.reminders
      .filter((r) => r.kind === 'aplicacao' && !r.is_done && r.remind_date >= today)
      .sort((a, b) => (a.remind_date > b.remind_date ? 1 : -1))[0];
  }, [data.reminders, today]);

  const measurements = useMemo(
    () =>
      [...data.measurements]
        .filter((m) => m.weight_kg != null)
        .sort((a, b) => (a.entry_date > b.entry_date ? 1 : -1)),
    [data.measurements],
  );
  const firstWeight = measurements[0];
  const currentWeight = measurements[measurements.length - 1];
  const diff =
    firstWeight && currentWeight
      ? (currentWeight.weight_kg ?? 0) - (firstWeight.weight_kg ?? 0)
      : null;

  const chartPoints: ChartPoint[] = useMemo(
    () => measurements.map((m) => ({ date: m.entry_date, value: m.weight_kg ?? 0 })),
    [measurements],
  );

  const stock = useMemo(
    () =>
      data.inventory.reduce((sum, i) => sum + (Number(i.quantity_available) || 0), 0),
    [data.inventory],
  );
  const stockName = data.inventory[0]?.product_name || null;

  const recentEffects = useMemo(
    () =>
      [...data.effects]
        .sort((a, b) => (a.occurred_on > b.occurred_on ? -1 : 1))
        .slice(0, 3),
    [data.effects],
  );

  const daysToNext = nextReminder ? daysUntil(nextReminder.remind_date) : null;

  // Resumo da semana (últimos 7 dias do diário)
  const weekLogs = useMemo(() => {
    const cutoff = addDays(today, -6);
    return data.logs
      .filter((l) => l.log_date >= cutoff)
      .sort((a, b) => (a.log_date > b.log_date ? 1 : -1));
  }, [data.logs, today]);

  const weekAvg = (vals: (number | null)[]): number | null => {
    const v = vals.filter((x): x is number => x != null);
    return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null;
  };
  const weekEnergy = weekAvg(weekLogs.map((l) => l.energy_level));
  const weekMood = weekAvg(weekLogs.map((l) => l.mood_level));
  const weekSleep = weekAvg(weekLogs.map((l) => l.sleep_hours));
  const weekWater = weekAvg(weekLogs.map((l) => l.water_ml));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, -6 + i);
      return { date: d, logged: weekLogs.some((l) => l.log_date === d) };
    });
  }, [weekLogs, today]);

  // Semana anterior (7 dias anteriores à semana atual) para comparação
  const prevWeekLogs = useMemo(() => {
    const start = addDays(today, -13);
    const end = addDays(today, -7);
    return data.logs.filter((l) => l.log_date >= start && l.log_date <= end);
  }, [data.logs, today]);

  const prevEnergy = weekAvg(prevWeekLogs.map((l) => l.energy_level));
  const prevMood = weekAvg(prevWeekLogs.map((l) => l.mood_level));
  const prevSleep = weekAvg(prevWeekLogs.map((l) => l.sleep_hours));
  const prevWater = weekAvg(prevWeekLogs.map((l) => l.water_ml));

  /** Diferença em relação à semana anterior: "+0,3", "−0,5", "0" ou null */
  const delta = (cur: number | null, prev: number | null): string | null => {
    if (cur == null || prev == null) return null;
    const d = Math.round((cur - prev) * 10) / 10;
    return d > 0 ? `+${fmtNum(d)}` : d < 0 ? `−${fmtNum(Math.abs(d))}` : '0';
  };

  /** Direção da diferença para colorir: alta = verde, baixa = laranja */
  const deltaDir = (cur: number | null, prev: number | null): '' | 'up' | 'down' => {
    if (cur == null || prev == null) return '';
    const d = Math.round((cur - prev) * 10) / 10;
    return d > 0 ? 'up' : d < 0 ? 'down' : '';
  };

  const waterDeltaL = weekWater != null && prevWater != null ? Math.round((weekWater - prevWater) / 100) / 10 : null;

  const go = (t: Parameters<typeof setTab>[0], a: string) => {
    setTab(t);
    setAction(a);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>
            {greeting()}
            {profile?.full_name ? `, ${firstName(profile.full_name, session?.user.email)}` : ''}
          </h1>
          <p className="page-sub">{formatDateLong(today)}</p>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Próxima aplicação */}
        <Card className="card-accent">
          <div className="stat-head">
            <span className="stat-label">Próxima aplicação programada</span>
            <IconClock />
          </div>
          {nextReminder ? (
            <>
              <div className="stat-big">
                {daysToNext === 0
                  ? 'Hoje'
                  : daysToNext === 1
                    ? 'Amanhã'
                    : `Em ${daysToNext} ${daysToNext === 1 ? 'dia' : 'dias'}`}
              </div>
              <p className="stat-sub">
                {formatDateLong(nextReminder.remind_date)}
                {nextReminder.remind_time ? ` às ${nextReminder.remind_time}` : ''}
                {nextReminder.planned_dose
                  ? ` · Dose registrada por você: ${fmtNum(nextReminder.planned_dose)} ${nextReminder.planned_dose_unit ?? 'mg'}`
                  : ''}
              </p>
            </>
          ) : (
            <p className="stat-empty">
              Nenhuma aplicação programada. Você pode programar um lembrete em Aplicações.
            </p>
          )}
          <div className="divider" />
          <div className="stat-row">
            <span>Última aplicação</span>
            <strong>
              {lastApp ? formatDateLong(lastApp.application_date) : '—'}
            </strong>
          </div>
          {lastApp && (
            <div className="stat-row">
              <span>Dose registrada</span>
              <strong>
                {fmtNum(lastApp.dose)} {lastApp.dose_unit}
              </strong>
            </div>
          )}
        </Card>

        {/* Peso */}
        <Card>
          <div className="stat-head">
            <span className="stat-label">Peso atual</span>
            <IconScale />
          </div>
          {currentWeight ? (
            <>
              <div className="stat-big">
                {fmtNum(kgToDisplay(currentWeight.weight_kg, wUnit), wUnit)}
              </div>
              {diff != null && (
                <p className="stat-sub">
                  <Tag tone={diff <= 0 ? 'good' : 'warn'}>
                    {diff > 0 ? '+' : ''}
                    {fmtNum(
                      wUnit === 'kg' ? diff : (kgToDisplay(diff, 'lb') ?? 0),
                      wUnit,
                    )}{' '}
                    desde o início
                  </Tag>
                </p>
              )}
            </>
          ) : (
            <p className="stat-empty">Nenhum peso registrado ainda.</p>
          )}
          <div className="divider" />
          <div className="stat-row">
            <span>Estimativa restante do medicamento</span>
            <strong>{stock > 0 ? `${fmtNum(stock)} un.` : '—'}</strong>
          </div>
          {stockName && <p className="stat-sub small">{stockName}</p>}
          <Button variant="soft" className="mt" onClick={() => go('estoque', '')}>
            <IconBox size={18} /> Controle do medicamento
          </Button>
        </Card>
      </div>

      {/* Ações */}
      <div className="quick-actions">
        <Button onClick={() => go('aplicacoes', 'new-application')}>
          <IconPlus size={18} /> Registrar aplicação
        </Button>
        <Button variant="secondary" onClick={() => go('evolucao', 'new-weight')}>
          <IconScale size={18} /> Registrar peso
        </Button>
        <Button variant="secondary" onClick={() => go('diario', 'new-log')}>
          <IconBook size={18} /> Fazer registro diário
        </Button>
      </div>

      {/* Gráfico */}
      <SectionTitle>Evolução do peso</SectionTitle>
      <Card>
        {chartPoints.length >= 2 ? (
          <>
            <LineChart
              points={chartPoints}
              unit={wUnit}
              goal={profile?.goal_weight_kg ? kgToDisplay(profile.goal_weight_kg, wUnit) : null}
            />
            <Button variant="ghost" onClick={() => setTab('evolucao')}>
              Ver evolução completa
            </Button>
          </>
        ) : (
          <EmptyState
            icon={<IconScale />}
            title={chartPoints.length === 1 ? 'Falta pouco' : 'Sem dados de peso ainda'}
            message={
              chartPoints.length === 1
                ? 'Registre mais um peso para visualizar seu gráfico de evolução.'
                : 'Registre seu peso em Evolução para acompanhar sua trajetória ao longo do tempo.'
            }
            action={
              <Button variant="secondary" onClick={() => go('evolucao', 'new-weight')}>
                <IconPlus size={18} /> Registrar peso
              </Button>
            }
          />
        )}
      </Card>

      {/* Como foi sua semana */}
      <SectionTitle
        action={
          <Button variant="ghost" onClick={() => setTab('diario')}>
            Abrir diário
          </Button>
        }
      >
        Como foi sua semana
      </SectionTitle>
      <Card>
        {weekLogs.length === 0 ? (
          <p className="muted">
            Nenhum registro diário nos últimos 7 dias. Um registro por dia leva menos de um minuto
            e mostra aqui as médias de energia, sono e hidratação da sua semana.
          </p>
        ) : (
          <>
            <div className="day-summary cols-4">
              <div>
                <span>Energia</span>
                <strong>{weekEnergy != null ? `${fmtNum(weekEnergy)}/5` : '—'}</strong>
                <em className={`week-delta ${deltaDir(weekEnergy, prevEnergy)}`}>
                  {delta(weekEnergy, prevEnergy) ?? ''}
                </em>
              </div>
              <div>
                <span>Humor</span>
                <strong>{weekMood != null ? `${fmtNum(weekMood)}/5` : '—'}</strong>
                <em className={`week-delta ${deltaDir(weekMood, prevMood)}`}>
                  {delta(weekMood, prevMood) ?? ''}
                </em>
              </div>
              <div>
                <span>Sono</span>
                <strong>{weekSleep != null ? `${fmtNum(weekSleep, 'h')}` : '—'}</strong>
                <em className={`week-delta ${deltaDir(weekSleep, prevSleep)}`}>
                  {delta(weekSleep, prevSleep) ?? ''}
                </em>
              </div>
              <div>
                <span>Hidratação</span>
                <strong>
                  {weekWater != null ? `${fmtNum(Math.round(weekWater / 100) / 10, 'L')}` : '—'}
                </strong>
                <em className={`week-delta ${waterDeltaL == null ? '' : waterDeltaL > 0 ? 'up' : waterDeltaL < 0 ? 'down' : ''}`}>
                  {waterDeltaL == null
                    ? ''
                    : waterDeltaL > 0
                      ? `+${fmtNum(waterDeltaL)} L`
                      : waterDeltaL < 0
                        ? `−${fmtNum(Math.abs(waterDeltaL))} L`
                        : '0 L'}
                </em>
              </div>
            </div>
            <div className="week-strip">
              {weekDays.map((d) => (
                <span
                  key={d.date}
                  className={`week-dot ${d.logged ? 'logged' : ''}`}
                  title={`${weekdayShort(d.date)}: ${d.logged ? 'registro feito' : 'sem registro'}`}
                />
              ))}
              <span className="muted small">
                {weekLogs.length} de 7 dias com registro
              </span>
            </div>
            <div className="legend-row">
              <span className="legend-item">
                <i className="legend-dot up" /> aumento vs semana anterior
              </span>
              <span className="legend-item">
                <i className="legend-dot down" /> redução vs semana anterior
              </span>
              <span className="legend-item">
                <i className="legend-dot flat" /> sem alteração
              </span>
            </div>
            <p className="muted small mt">
              {prevWeekLogs.length > 0
                ? 'Diferenças comparadas com a semana anterior (dias −13 a −7). Registre os mesmos itens nas duas semanas para uma comparação completa.'
                : 'Sem registros na semana anterior para comparar — as diferenças aparecem quando você mantém o registro por duas semanas seguidas.'}
            </p>
          </>
        )}
      </Card>

      {/* Efeitos */}
      <SectionTitle
        action={
          <Button variant="ghost" onClick={() => setTab('diario')}>
            Ver diário
          </Button>
        }
      >
        Últimos efeitos registrados
      </SectionTitle>
      <Card>
        {recentEffects.length === 0 ? (
          <p className="muted">
            Nenhum efeito registrado. No Diário você pode registrar o que perceber — o app não faz
            avaliações médicas.
          </p>
        ) : (
          <ul className="effect-list">
            {recentEffects.map((e) => (
              <li key={e.id}>
                <Tag tone={e.intensity === 'forte' ? 'warn' : e.intensity === 'leve' ? 'good' : 'neutral'}>
                  {e.intensity}
                </Tag>
                <strong>{e.name}</strong>
                <span className="muted">
                  {formatDateLong(e.occurred_on)} · {e.status === 'presente' ? 'Presente' : 'Encerrado'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Disclaimer variant="warn">
        {MANDATORY_DISCLAIMER}
      </Disclaimer>
      {demo && (
        <p className="muted center small">
          <IconAlert size={14} /> Você está vendo dados fictícios de demonstração.
        </p>
      )}
    </div>
  );
}
