import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Field, Modal, EmptyState, Disclaimer, SectionTitle } from '../components/ui';
import { IconDumbbell, IconActivity, IconScale, IconDownload, IconPlus, IconRepeat } from '../components/ui';
import { LineChart, type ChartPoint } from '../components/LineChart';
import { addDays, todayISO, greeting, firstName, formatDateLong, fmtNum, displayToKg, kgToDisplay } from '../lib/helpers';
import type { BodyMeasurement } from '../lib/types';

const PERIODS = [
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '3 meses', days: 90 },
  { id: '180', label: '6 meses', days: 180 },
  { id: 'all', label: 'Tudo', days: 0 },
] as const;

export function FitnessHome() {
  const { data, session, demo, setTab, setAction, showToast, saveRow } = useApp();

  const [weightOpen, setWeightOpen] = useState(false);
  const [wDate, setWDate] = useState(todayISO());
  const [wWeight, setWWeight] = useState('');
  const [wNotes, setWNotes] = useState('');
  const [wError, setWError] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['id']>('90');

  const today = todayISO();
  const weekAgo = addDays(today, -6);
  const unit = data.profile?.weight_unit || 'kg';

  const gymThisWeek = useMemo(
    () => data.gym_workouts.filter((w) => w.workout_date >= weekAgo && w.workout_date <= today).length,
    [data.gym_workouts, weekAgo, today],
  );
  const sportThisWeek = useMemo(
    () => data.sport_activities.filter((a) => a.activity_date >= weekAgo && a.activity_date <= today).length,
    [data.sport_activities, weekAgo, today],
  );
  const lastActivity = useMemo(() => {
    const gyms = data.gym_workouts.map((w) => ({ date: w.workout_date, label: w.title, kind: 'Academia' as const }));
    const sports = data.sport_activities.map((a) => ({
      date: a.activity_date,
      label: SPORT_LABELS[a.sport_type] || a.sport_type,
      kind: 'Esporte' as const,
    }));
    const all = [...gyms, ...sports].sort((a, b) => b.date.localeCompare(a.date));
    return all[0] || null;
  }, [data.gym_workouts, data.sport_activities]);

  const weightLogs = useMemo(
    () =>
      [...data.measurements]
        .filter((m) => m.weight_kg != null)
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
    [data.measurements],
  );
  const firstWeight = weightLogs[0]?.weight_kg ?? null;
  const currentWeight = weightLogs[weightLogs.length - 1]?.weight_kg ?? null;
  const totalDelta =
    firstWeight != null && currentWeight != null
      ? (kgToDisplay(currentWeight, unit) ?? 0) - (kgToDisplay(firstWeight, unit) ?? 0)
      : null;

  const chartPoints = useMemo<ChartPoint[]>(() => {
    const p = PERIODS.find((x) => x.id === period)!;
    const from = p.days > 0 ? addDays(today, -p.days) : '0000-01-01';
    return weightLogs
      .filter((l) => l.entry_date >= from)
      .map((l) => ({ date: l.entry_date, value: kgToDisplay(l.weight_kg, unit) ?? 0 }));
  }, [weightLogs, period, today, unit]);

  const hasAnyFitness =
    data.gym_workouts.length > 0 ||
    data.sport_activities.length > 0 ||
    data.measurements.some((m) => m.weight_kg != null) ||
    data.fitness_routine_items.length > 0;

  async function submitWeight() {
    const kg = Number(wWeight.replace(',', '.'));
    if (!wDate) return setWError('Informe a data.');
    if (!wWeight || Number.isNaN(kg) || kg <= 0) return setWError('Informe um peso válido.');
    setWError('');
    const ok = await saveRow<BodyMeasurement>('body_measurements', {
      entry_date: wDate,
      weight_kg: displayToKg(kg, unit) ?? kg,
      notes: wNotes || null,
    });
    if (ok) {
      setWeightOpen(false);
      setWWeight('');
      setWNotes('');
    }
  }

  async function handlePdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const { exportFitnessPdf: f } = await import('../lib/fitnessPdf');
      await f(data, weightLogs.length ? weightLogs[0].entry_date : today, today);
    } catch {
      showToast('Não foi possível gerar o PDF.', 'error');
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div>
      <h1>{greeting()}, {firstName(data.profile?.full_name, session?.user?.email ?? null)}</h1>
      <p className="muted mt-small">Seu espaço para treinos, atividades e evolução física.</p>

      {!hasAnyFitness && (
        <Card>
          <EmptyState
            icon={<IconDumbbell size={34} />}
            title="Comece registrando seu primeiro treino"
            message="Anote seus treinos de academia, atividades esportivas e seu peso para acompanhar sua evolução ao longo do tempo. Você também pode montar uma rotina semanal."
            action={
              <div className="empty-actions">
                <Button onClick={() => { setAction('gym'); setTab('treinos'); }}>
                  <IconPlus size={18} /> Registrar treino
                </Button>
                <Button variant="secondary" onClick={() => { setAction('sport'); setTab('treinos'); }}>
                  <IconActivity size={18} /> Registrar atividade
                </Button>
              </div>
            }
          />
        </Card>
      )}

      <div className="stat-grid">
        <Card className="stat-card">
          <span className="stat-label">Treinos (7 dias)</span>
          <span className="stat-big stat-fitness">{gymThisWeek}</span>
          <span className="stat-sub">sessões de academia</span>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Atividades (7 dias)</span>
          <span className="stat-big stat-fitness">{sportThisWeek}</span>
          <span className="stat-sub">esportes e atividades</span>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Última atividade</span>
          {lastActivity ? (
            <>
              <strong className="stat-medium">{lastActivity.label}</strong>
              <span className="stat-sub">
                {lastActivity.kind} · {formatDateLong(lastActivity.date)}
              </span>
            </>
          ) : (
            <span className="stat-sub">Nada registrado ainda</span>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle
          action={
            <Button variant="ghost" onClick={() => setWeightOpen(true)}>
              <IconScale size={18} /> Registrar peso
            </Button>
          }
        >
          Peso
        </SectionTitle>
        {currentWeight == null ? (
          <EmptyState
            icon={<IconScale size={30} />}
            title="Sem registros de peso no Fitness"
            message="Registre seu peso aqui para acompanhar a evolução junto dos seus treinos."
            action={
              <Button onClick={() => setWeightOpen(true)}>
                <IconPlus size={18} /> Registrar peso
              </Button>
            }
          />
        ) : (
          <>
            <div className="weight-summary">
              <div>
                <span className="stat-label">Peso atual</span>
                <span className="stat-big">{fmtNum(kgToDisplay(currentWeight, unit), unit)}</span>
              </div>
              <div>
                <span className="stat-label">Desde o início</span>
                <span className={`stat-delta ${totalDelta && totalDelta !== 0 ? (totalDelta < 0 ? 'delta-down' : 'delta-up') : ''}`}>
                  {totalDelta == null || Math.abs(totalDelta) < 0.05
                    ? '—'
                    : `${totalDelta > 0 ? '+' : '−'}${fmtNum(Math.abs(totalDelta))} ${unit}`}
                </span>
              </div>
            </div>
            <div className="view-toggle">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  className={period === p.id ? 'active' : ''}
                  onClick={() => setPeriod(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {chartPoints.length > 1 ? (
              <LineChart points={chartPoints} unit={unit} color="#65a30d" />
            ) : (
              <p className="muted small">Registre o peso mais alguns dias para ver o gráfico.</p>
            )}
          </>
        )}
      </Card>

      <div className="quick-actions">
        <Card className="link-card" onClick={() => { setAction('gym'); setTab('treinos'); }}>
          <IconDumbbell />
          <div>
            <strong>Registrar treino</strong>
            <span>Exercícios, séries, repetições e carga</span>
          </div>
        </Card>
        <Card className="link-card" onClick={() => { setAction('sport'); setTab('treinos'); }}>
          <IconActivity />
          <div>
            <strong>Registrar atividade</strong>
            <span>Corrida, futebol, natação e mais</span>
          </div>
        </Card>
      </div>

      <div className="quick-actions">
        <Card className="link-card" onClick={() => setTab('rotina')}>
          <IconRepeat />
          <div>
            <strong>Rotina semanal</strong>
            <span>Planeje os treinos de cada dia</span>
          </div>
        </Card>
        <Card
          className="link-card"
          onClick={() => (demo ? showToast('Modo demonstração: PDF indisponível.', 'info') : handlePdf())}
        >
          <IconDownload />
          <div>
            <strong>{pdfBusy ? 'Gerando PDF…' : 'Exportar PDF fitness'}</strong>
            <span>Histórico de treinos e atividades</span>
          </div>
        </Card>
      </div>

      <Disclaimer>
        Este espaço registra as informações que você adicionou e não oferece orientação de treino,
        diagnóstico ou prescrição. Consulte um profissional de educação física para orientação individualizada.
      </Disclaimer>

      <Modal open={weightOpen} onClose={() => setWeightOpen(false)} title="Registrar peso">
        <div className="form-grid">
          <Field label="Data">
            <input type="date" value={wDate} onChange={(e) => setWDate(e.target.value)} />
          </Field>
          <Field label={`Peso (${unit})`}>
            <input
              inputMode="decimal"
              placeholder="Ex.: 84,5"
              value={wWeight}
              onChange={(e) => setWWeight(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Observações (opcional)">
          <textarea rows={2} value={wNotes} onChange={(e) => setWNotes(e.target.value)} />
        </Field>
        {wError && <p className="field-error">{wError}</p>}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setWeightOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submitWeight}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}

export const SPORT_LABELS: Record<string, string> = {
  corrida: 'Corrida',
  caminhada: 'Caminhada',
  futebol: 'Futebol',
  natacao: 'Natação',
  ciclismo: 'Ciclismo',
  basquete: 'Basquete',
  tenis: 'Tênis',
  volei: 'Vôlei',
  outro: 'Outro',
};
