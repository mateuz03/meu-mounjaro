import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  RatingScale,
  SectionTitle,
  Tag,
  Disclaimer,
  IconPlus,
  IconBook,
  IconEdit,
  IconTrash,
  IconDrop,
  IconMoon,
} from '../components/ui';
import {
  STRONG_EFFECT_MESSAGE,
  fmtNum,
  formatDateLong,
  todayISO,
  weekdayShort,
} from '../lib/helpers';
import type { DailyLog, PerceivedEffect } from '../lib/types';

interface LogForm {
  id?: string;
  log_date: string;
  hunger_level: number | null;
  satiety_level: number | null;
  energy_level: number | null;
  mood_level: number | null;
  water_ml: string;
  sleep_quality: number | null;
  sleep_hours: string;
  physical_activity: string;
  food_notes: string;
  notes: string;
}

const emptyLog = (): LogForm => ({
  log_date: todayISO(),
  hunger_level: null,
  satiety_level: null,
  energy_level: null,
  mood_level: null,
  water_ml: '',
  sleep_quality: null,
  sleep_hours: '',
  physical_activity: '',
  food_notes: '',
  notes: '',
});

interface EffectForm {
  id?: string;
  occurred_on: string;
  name: string;
  intensity: 'leve' | 'moderada' | 'forte';
  approx_time: string;
  duration_text: string;
  status: 'presente' | 'encerrado';
  notes: string;
}

const emptyEffect = (): EffectForm => ({
  occurred_on: todayISO(),
  name: '',
  intensity: 'leve',
  approx_time: '',
  duration_text: '',
  status: 'presente',
  notes: '',
});

export function Diary() {
  const { data, saveRow, deleteRow, action, setAction } = useApp();

  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState<LogForm>(emptyLog);
  const [logError, setLogError] = useState<string | null>(null);
  const [savingLog, setSavingLog] = useState(false);

  const [effectOpen, setEffectOpen] = useState(false);
  const [effectForm, setEffectForm] = useState<EffectForm>(emptyEffect);
  const [effectError, setEffectError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<
    { table: 'daily_logs' | 'perceived_effects'; id: string; label: string } | null
  >(null);

  useEffect(() => {
    if (action === 'new-log') {
      setLogForm(emptyLog());
      setLogOpen(true);
      setAction(null);
    }
  }, [action, setAction]);

  const logsSorted = useMemo(
    () => [...data.logs].sort((a, b) => (a.log_date > b.log_date ? -1 : 1)),
    [data.logs],
  );
  const existingToday = logsSorted.find((l) => l.log_date === todayISO());

  const effectsSorted = useMemo(
    () => [...data.effects].sort((a, b) => (a.occurred_on > b.occurred_on ? -1 : 1)),
    [data.effects],
  );

  const last7 = useMemo(() => logsSorted.slice(0, 7).reverse(), [logsSorted]);

  const openLog = (l?: DailyLog) => {
    setLogForm(
      l
        ? {
            id: l.id,
            log_date: l.log_date,
            hunger_level: l.hunger_level,
            satiety_level: l.satiety_level,
            energy_level: l.energy_level,
            mood_level: l.mood_level,
            water_ml: l.water_ml != null ? String(l.water_ml) : '',
            sleep_quality: l.sleep_quality,
            sleep_hours: l.sleep_hours != null ? String(l.sleep_hours) : '',
            physical_activity: l.physical_activity || '',
            food_notes: l.food_notes || '',
            notes: l.notes || '',
          }
        : emptyLog(),
    );
    setLogError(null);
    setLogOpen(true);
  };

  const submitLog = async () => {
    if (!logForm.log_date) {
      setLogError('Informe a data.');
      return;
    }
    setSavingLog(true);
    const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
    const res = await saveRow<DailyLog>('daily_logs', {
      id: logForm.id,
      log_date: logForm.log_date,
      hunger_level: logForm.hunger_level,
      satiety_level: logForm.satiety_level,
      energy_level: logForm.energy_level,
      mood_level: logForm.mood_level,
      water_ml: num(logForm.water_ml),
      sleep_quality: logForm.sleep_quality,
      sleep_hours: num(logForm.sleep_hours),
      physical_activity: logForm.physical_activity || null,
      food_notes: logForm.food_notes || null,
      notes: logForm.notes || null,
    });
    setSavingLog(false);
    if (res.ok) setLogOpen(false);
  };

  const openEffect = (e?: PerceivedEffect) => {
    setEffectForm(
      e
        ? {
            id: e.id,
            occurred_on: e.occurred_on,
            name: e.name,
            intensity: e.intensity,
            approx_time: e.approx_time || '',
            duration_text: e.duration_text || '',
            status: e.status,
            notes: e.notes || '',
          }
        : emptyEffect(),
    );
    setEffectError(null);
    setEffectOpen(true);
  };

  const submitEffect = async () => {
    if (!effectForm.name.trim()) {
      setEffectError('Descreva o efeito percebido.');
      return;
    }
    if (!effectForm.occurred_on) {
      setEffectError('Informe a data.');
      return;
    }
    const res = await saveRow<PerceivedEffect>('perceived_effects', {
      id: effectForm.id,
      occurred_on: effectForm.occurred_on,
      name: effectForm.name.trim(),
      intensity: effectForm.intensity,
      approx_time: effectForm.approx_time || null,
      duration_text: effectForm.duration_text || null,
      status: effectForm.status,
      notes: effectForm.notes || null,
    });
    if (res.ok) setEffectOpen(false);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Diário</h1>
          <p className="page-sub">Registro rápido do seu dia e dos efeitos que você percebe.</p>
        </div>
        <div className="head-actions">
          <Button onClick={() => openLog()}>
            <IconPlus size={18} /> {existingToday ? 'Editar registro de hoje' : 'Fazer registro diário'}
          </Button>
          <Button variant="secondary" onClick={() => openEffect()}>
            <IconPlus size={18} /> Registrar efeito
          </Button>
        </div>
      </div>

      {existingToday && (
        <Card className="card-accent">
          <div className="stat-head">
            <span className="stat-label">Registro de hoje</span>
            <Tag tone="good">Registrado</Tag>
          </div>
          <div className="day-summary">
            <div><span>Fome</span><strong>{existingToday.hunger_level ?? '—'}/5</strong></div>
            <div><span>Saciedade</span><strong>{existingToday.satiety_level ?? '—'}/5</strong></div>
            <div><span>Energia</span><strong>{existingToday.energy_level ?? '—'}/5</strong></div>
            <div><span>Humor</span><strong>{existingToday.mood_level ?? '—'}/5</strong></div>
            <div><span>Água</span><strong>{existingToday.water_ml != null ? `${fmtNum(existingToday.water_ml, 'ml')}` : '—'}</strong></div>
            <div><span>Sono</span><strong>{existingToday.sleep_hours != null ? `${fmtNum(existingToday.sleep_hours, 'h')}` : '—'}</strong></div>
          </div>
        </Card>
      )}

      {last7.length > 0 && (
        <>
          <SectionTitle>Últimos 7 registros</SectionTitle>
          <Card>
            <div className="mini-strip">
              {last7.map((l) => (
                <div key={l.id} className="mini-day">
                  <span className="mini-wd">{weekdayShort(l.log_date)}</span>
                  <div className="mini-bars">
                    <div className="mini-dot" style={{ opacity: l.energy_level ? 0.3 + (l.energy_level / 5) * 0.7 : 0.15 }} title={`Energia: ${l.energy_level ?? '—'}`} />
                    <div className="mini-dot" style={{ opacity: l.mood_level ? 0.3 + (l.mood_level / 5) * 0.7 : 0.15 }} title={`Humor: ${l.mood_level ?? '—'}`} />
                  </div>
                  <span className="mini-water"><IconDrop size={12} />{l.water_ml ? Math.round(l.water_ml / 100) / 10 + 'L' : '—'}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <SectionTitle>Efeitos percebidos</SectionTitle>
      <Card>
        {effectsSorted.length === 0 ? (
          <p className="muted">
            Nenhum efeito registrado. Registrar o que você percebe ajuda a montar um histórico para
            conversar com o profissional responsável. O aplicativo não identifica causas nem avalia
            gravidade.
          </p>
        ) : (
          <ul className="effect-list">
            {effectsSorted.slice(0, 10).map((e) => (
              <li key={e.id}>
                <Tag tone={e.intensity === 'forte' ? 'warn' : e.intensity === 'leve' ? 'good' : 'neutral'}>
                  {e.intensity}
                </Tag>
                <div className="effect-info">
                  <strong>{e.name}</strong>
                  <span className="muted small">
                    {formatDateLong(e.occurred_on)}
                    {e.approx_time ? ` · ~${e.approx_time}` : ''}
                    {e.duration_text ? ` · duração: ${e.duration_text}` : ''} ·{' '}
                    {e.status === 'presente' ? 'Presente' : 'Encerrado'}
                  </span>
                  {e.notes && <span className="muted small">{e.notes}</span>}
                </div>
                <div className="tl-actions">
                  <button className="icon-btn" onClick={() => openEffect(e)} aria-label="Editar">
                    <IconEdit size={18} />
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() => setPendingDelete({ table: 'perceived_effects', id: e.id, label: e.name })}
                    aria-label="Excluir"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SectionTitle
        action={
          logsSorted.length > 0 ? (
            <Button variant="ghost" onClick={() => openLog(logsSorted[0])}>
              <IconEdit size={16} /> Editar hoje
            </Button>
          ) : undefined
        }
      >
        Histórico do diário
      </SectionTitle>
      {logsSorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconBook />}
            title="Seu diário está vazio"
            message="Um registro por dia leva menos de um minuto: fome, energia, sono, água e como foi sua alimentação."
            action={
              <Button onClick={() => openLog()}>
                <IconPlus size={18} /> Fazer primeiro registro
              </Button>
            }
          />
        </Card>
      ) : (
        logsSorted.map((l) => (
          <Card key={l.id} className="log-row">
            <div className="measure-date">{formatDateLong(l.log_date)}</div>
            <div className="log-body">
              <div className="log-scales">
                <span>Fome {l.hunger_level ?? '—'}/5</span>
                <span>Saciedade {l.satiety_level ?? '—'}/5</span>
                <span>Energia {l.energy_level ?? '—'}/5</span>
                <span>Humor {l.mood_level ?? '—'}/5</span>
                <span><IconDrop size={12} /> {l.water_ml != null ? `${fmtNum(l.water_ml, 'ml')}` : '—'}</span>
                <span><IconMoon size={12} /> {l.sleep_hours != null ? `${fmtNum(l.sleep_hours, 'h')}` : '—'}{l.sleep_quality ? ` (qualidade ${l.sleep_quality}/5)` : ''}</span>
              </div>
              {l.physical_activity && <span className="muted small">Atividade: {l.physical_activity}</span>}
              {l.food_notes && <span className="muted small">Alimentação: {l.food_notes}</span>}
              {l.notes && <span className="muted small">Obs.: {l.notes}</span>}
            </div>
            <div className="tl-actions">
              <button className="icon-btn" onClick={() => openLog(l)} aria-label="Editar">
                <IconEdit size={18} />
              </button>
              <button
                className="icon-btn danger"
                onClick={() => setPendingDelete({ table: 'daily_logs', id: l.id, label: `registro de ${formatDateLong(l.log_date)}` })}
                aria-label="Excluir"
              >
                <IconTrash size={18} />
              </button>
            </div>
          </Card>
        ))
      )}

      {/* Modal registro diário */}
      <Modal open={logOpen} onClose={() => setLogOpen(false)} title={logForm.id ? 'Editar registro do dia' : 'Registro diário'} wide>
        <Field label="Data" required>
          <input type="date" value={logForm.log_date} onChange={(e) => setLogForm({ ...logForm, log_date: e.target.value })} />
        </Field>
        <div className="rating-grid">
          <RatingScale label="Nível de fome" value={logForm.hunger_level} onChange={(v) => setLogForm({ ...logForm, hunger_level: v })} labels={['Baixa', 'Muita']} />
          <RatingScale label="Saciedade" value={logForm.satiety_level} onChange={(v) => setLogForm({ ...logForm, satiety_level: v })} labels={['Baixa', 'Alta']} />
          <RatingScale label="Energia" value={logForm.energy_level} onChange={(v) => setLogForm({ ...logForm, energy_level: v })} labels={['Baixa', 'Alta']} />
          <RatingScale label="Humor" value={logForm.mood_level} onChange={(v) => setLogForm({ ...logForm, mood_level: v })} labels={['Baixo', 'Ótimo']} />
          <RatingScale label="Qualidade do sono" value={logForm.sleep_quality} onChange={(v) => setLogForm({ ...logForm, sleep_quality: v })} labels={['Ruim', 'Ótima']} />
        </div>
        <div className="form-grid">
          <Field label="Quantidade de água (ml)">
            <input type="number" inputMode="numeric" min="0" step="50" placeholder="Ex.: 2000" value={logForm.water_ml} onChange={(e) => setLogForm({ ...logForm, water_ml: e.target.value })} />
            <div className="dose-chips">
              {[1000, 1500, 2000, 2500, 3000].map((v) => (
                <button key={v} type="button" className={`chip ${logForm.water_ml === String(v) ? 'chip-active' : ''}`} onClick={() => setLogForm({ ...logForm, water_ml: String(v) })}>
                  {v / 1000}L
                </button>
              ))}
            </div>
          </Field>
          <Field label="Horas de sono">
            <input type="number" inputMode="decimal" step="0.5" min="0" placeholder="Ex.: 7,5" value={logForm.sleep_hours} onChange={(e) => setLogForm({ ...logForm, sleep_hours: e.target.value })} />
          </Field>
        </div>
        <Field label="Atividade física realizada">
          <input type="text" placeholder="Ex.: caminhada 30 min, musculação…" value={logForm.physical_activity} onChange={(e) => setLogForm({ ...logForm, physical_activity: e.target.value })} />
        </Field>
        <Field label="Alimentação do dia (campo livre)">
          <textarea rows={3} placeholder="O que você quiser anotar sobre sua alimentação" value={logForm.food_notes} onChange={(e) => setLogForm({ ...logForm, food_notes: e.target.value })} />
        </Field>
        <Field label="Observações gerais">
          <textarea rows={2} value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} />
        </Field>
        {logError && <p className="form-error">{logError}</p>}
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setLogOpen(false)}>Cancelar</Button>
          <Button onClick={submitLog} disabled={savingLog}>{savingLog ? 'Salvando…' : 'Salvar registro'}</Button>
        </div>
      </Modal>

      {/* Modal efeito */}
      <Modal open={effectOpen} onClose={() => setEffectOpen(false)} title={effectForm.id ? 'Editar efeito' : 'Registrar efeito percebido'}>
        <Field label="Nome ou descrição" required>
          <input type="text" placeholder="Ex.: náusea, dor de cabeça…" value={effectForm.name} onChange={(e) => setEffectForm({ ...effectForm, name: e.target.value })} />
        </Field>
        <div className="form-grid">
          <Field label="Data" required>
            <input type="date" value={effectForm.occurred_on} onChange={(e) => setEffectForm({ ...effectForm, occurred_on: e.target.value })} />
          </Field>
          <Field label="Horário aproximado">
            <input type="time" value={effectForm.approx_time} onChange={(e) => setEffectForm({ ...effectForm, approx_time: e.target.value })} />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Intensidade">
            <select value={effectForm.intensity} onChange={(e) => setEffectForm({ ...effectForm, intensity: e.target.value as EffectForm['intensity'] })}>
              <option value="leve">Leve</option>
              <option value="moderada">Moderada</option>
              <option value="forte">Forte</option>
            </select>
          </Field>
          <Field label="Situação atual">
            <select value={effectForm.status} onChange={(e) => setEffectForm({ ...effectForm, status: e.target.value as EffectForm['status'] })}>
              <option value="presente">Presente agora</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </Field>
        </div>
        <Field label="Duração">
          <input type="text" placeholder="Ex.: cerca de 2 horas" value={effectForm.duration_text} onChange={(e) => setEffectForm({ ...effectForm, duration_text: e.target.value })} />
        </Field>
        <Field label="Observações">
          <textarea rows={2} value={effectForm.notes} onChange={(e) => setEffectForm({ ...effectForm, notes: e.target.value })} />
        </Field>

        {effectForm.intensity === 'forte' && (
          <Disclaimer variant="warn">{STRONG_EFFECT_MESSAGE}</Disclaimer>
        )}
        <p className="field-hint">
          O registro de um efeito não significa que ele foi causado pelo medicamento, e o aplicativo
          não diagnostica efeitos.
        </p>
        {effectError && <p className="form-error">{effectError}</p>}
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setEffectOpen(false)}>Cancelar</Button>
          <Button onClick={submitEffect}>Salvar efeito</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete != null}
        title="Excluir registro"
        message={`Excluir ${pendingDelete?.label ?? ''}? Esta ação não pode ser desfeita.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) {
            await deleteRow(pendingDelete.table, pendingDelete.id);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
