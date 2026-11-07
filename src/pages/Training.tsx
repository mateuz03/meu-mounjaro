import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Field, Modal, ConfirmDialog, EmptyState, RatingScale, Tag } from '../components/ui';
import { IconDumbbell, IconActivity, IconPlus, IconEdit, IconTrash, IconClock } from '../components/ui';
import { addDays, todayISO, formatDateLong, fmtNum } from '../lib/helpers';
import type { GymExerciseEntry, GymWorkout, SportActivity } from '../lib/types';

interface ExerciseRow {
  name: string;
  sets: string;
  reps: string;
  weight: string;
}

const SPORT_TYPES = [
  { id: 'corrida', label: 'Corrida' },
  { id: 'caminhada', label: 'Caminhada' },
  { id: 'futebol', label: 'Futebol' },
  { id: 'natacao', label: 'Natação' },
  { id: 'ciclismo', label: 'Ciclismo' },
  { id: 'basquete', label: 'Basquete' },
  { id: 'tenis', label: 'Tênis' },
  { id: 'volei', label: 'Vôlei' },
  { id: 'outro', label: 'Outro' },
];

const EFFORT_LABELS = ['Muito leve', 'Leve', 'Moderado', 'Intenso', 'Muito intenso'];

const emptyRow = (): ExerciseRow => ({ name: '', sets: '', reps: '', weight: '' });

export function Training() {
  const { data, saveRow, saveRows, deleteRow, action, setAction } = useApp();

  const [view, setView] = useState<'gym' | 'sport'>('gym');

  // ---- academia ----
  const [gymOpen, setGymOpen] = useState(false);
  const [gymId, setGymId] = useState<string | undefined>(undefined);
  const [gymDate, setGymDate] = useState(todayISO());
  const [gymTime, setGymTime] = useState('');
  const [gymTitle, setGymTitle] = useState('');
  const [gymNotes, setGymNotes] = useState('');
  const [rows, setRows] = useState<ExerciseRow[]>([emptyRow()]);
  const [gymError, setGymError] = useState('');
  const [gymBusy, setGymBusy] = useState(false);
  const [deleteGym, setDeleteGym] = useState<string | null>(null);

  // ---- esporte ----
  const [sportOpen, setSportOpen] = useState(false);
  const [sportId, setSportId] = useState<string | undefined>(undefined);
  const [sportDate, setSportDate] = useState(todayISO());
  const [sportType, setSportType] = useState('corrida');
  const [sportDuration, setSportDuration] = useState('');
  const [sportDistance, setSportDistance] = useState('');
  const [sportEffort, setSportEffort] = useState<number | null>(null);
  const [sportNotes, setSportNotes] = useState('');
  const [sportError, setSportError] = useState('');
  const [deleteSport, setDeleteSport] = useState<string | null>(null);

  // atalhos do dashboard: abre o formulário correspondente
  useEffect(() => {
    if (action === 'gym') {
      setView('gym');
      openGymNew();
      setAction(null);
    } else if (action === 'sport') {
      setView('sport');
      openSportNew();
      setAction(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const exercisesByWorkout = useMemo(() => {
    const map = new Map<string, GymExerciseEntry[]>();
    for (const e of data.gym_exercise_entries) {
      const list = map.get(e.workout_id) || [];
      list.push(e);
      map.set(e.workout_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [data.gym_exercise_entries]);

  const gymList = useMemo(
    () => [...data.gym_workouts].sort((a, b) => b.workout_date.localeCompare(a.workout_date)),
    [data.gym_workouts],
  );
  const sportList = useMemo(
    () => [...data.sport_activities].sort((a, b) => b.activity_date.localeCompare(a.activity_date)),
    [data.sport_activities],
  );

  function openGymNew() {
    setGymId(undefined);
    setGymDate(todayISO());
    setGymTime('');
    setGymTitle('');
    setGymNotes('');
    setRows([emptyRow()]);
    setGymError('');
    setGymOpen(true);
  }

  function openGymEdit(w: GymWorkout) {
    setGymId(w.id);
    setGymDate(w.workout_date);
    setGymTime(w.workout_time || '');
    setGymTitle(w.title);
    setGymNotes(w.notes || '');
    const entries = exercisesByWorkout.get(w.id) || [];
    setRows(
      entries.map((e) => ({
        name: e.exercise_name,
        sets: e.sets != null ? String(e.sets) : '',
        reps: e.reps != null ? String(e.reps) : '',
        weight: e.weight_kg != null ? String(e.weight_kg).replace('.', ',') : '',
      })),
    );
    setGymError('');
    setGymOpen(true);
  }

  async function submitGym() {
    const title = gymTitle.trim() || 'Treino';
    if (!gymDate) return setGymError('Informe a data.');
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) return setGymError('Adicione pelo menos um exercício com nome.');
    setGymBusy(true);
    const res = await saveRow<GymWorkout>('gym_workouts', {
      id: gymId,
      workout_date: gymDate,
      workout_time: gymTime || null,
      title,
      notes: gymNotes || null,
    });
    setGymBusy(false);
    if (!res.ok) return;
    const wid = res.id ?? gymId;
    if (gymId) {
      const old = exercisesByWorkout.get(gymId) || [];
      for (const e of old) await deleteRow('gym_exercise_entries', e.id);
    }
    if (wid) {
      const insert = await saveRows<GymExerciseEntry>(
        'gym_exercise_entries',
        valid.map((r, i) => ({
          workout_id: wid,
          sort_order: i,
          exercise_name: r.name.trim(),
          sets: r.sets ? Number(r.sets) : null,
          reps: r.reps ? Number(r.reps) : null,
          weight_kg: r.weight ? Number(r.weight.replace(',', '.')) : null,
        })),
      );
      if (!insert.ok) return;
    }
    setGymOpen(false);
  }

  function openSportNew() {
    setSportId(undefined);
    setSportDate(todayISO());
    setSportType('corrida');
    setSportDuration('');
    setSportDistance('');
    setSportEffort(null);
    setSportNotes('');
    setSportError('');
    setSportOpen(true);
  }

  function openSportEdit(a: SportActivity) {
    setSportId(a.id);
    setSportDate(a.activity_date);
    setSportType(a.sport_type);
    setSportDuration(a.duration_minutes != null ? String(a.duration_minutes) : '');
    setSportDistance(a.distance_km != null ? String(a.distance_km).replace('.', ',') : '');
    setSportEffort(a.perceived_effort);
    setSportNotes(a.notes || '');
    setSportError('');
    setSportOpen(true);
  }

  async function submitSport() {
    if (!sportDate) return setSportError('Informe a data.');
    const dur = sportDuration ? Number(sportDuration) : null;
    if (sportDuration && (Number.isNaN(dur) || (dur ?? 0) <= 0))
      return setSportError('Duração inválida.');
    const dist = sportDistance ? Number(sportDistance.replace(',', '.')) : null;
    if (sportDistance && (Number.isNaN(dist) || (dist ?? 0) <= 0))
      return setSportError('Distância inválida.');
    const res = await saveRow<SportActivity>('sport_activities', {
      id: sportId,
      activity_date: sportDate,
      sport_type: sportType,
      duration_minutes: dur,
      distance_km: dist,
      perceived_effort: sportEffort,
      notes: sportNotes || null,
    });
    if (res.ok) setSportOpen(false);
  }

  return (
    <div>
      <h1>Treinos</h1>
      <p className="muted mt-small">Registre o que você treinou — do seu jeito, no seu ritmo.</p>

      <div className="view-toggle">
        <button className={view === 'gym' ? 'active' : ''} onClick={() => setView('gym')}>
          Academia
        </button>
        <button className={view === 'sport' ? 'active' : ''} onClick={() => setView('sport')}>
          Esportes
        </button>
      </div>

      {view === 'gym' ? (
        <>
          <div className="page-toolbar">
            <Button onClick={openGymNew}>
              <IconPlus size={18} /> Registrar treino
            </Button>
          </div>
          {gymList.length === 0 ? (
            <Card>
              <EmptyState
                icon={<IconDumbbell size={34} />}
                title="Nenhum treino de academia registrado"
                message="Anote os exercícios, séries, repetições e cargas de cada sessão para acompanhar sua evolução."
                action={
                  <Button onClick={openGymNew}>
                    <IconPlus size={18} /> Registrar primeiro treino
                  </Button>
                }
              />
            </Card>
          ) : (
            gymList.slice(0, 30).map((w) => {
              const entries = exercisesByWorkout.get(w.id) || [];
              const volume = entries.reduce(
                (acc, e) => acc + (e.sets ?? 0) * (e.reps ?? 0) * (e.weight_kg ?? 0),
                0,
              );
              return (
                <Card key={w.id} className="card-accent">
                  <div className="row-head">
                    <div>
                      <strong>{w.title}</strong>
                      <span className="muted small block">
                        {formatDateLong(w.workout_date)}
                        {w.workout_time ? ` · ${w.workout_time}` : ''}
                        {volume > 0 ? ` · volume ${fmtNum(volume)} kg` : ''}
                      </span>
                    </div>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => openGymEdit(w)} aria-label="Editar treino">
                        <IconEdit size={18} />
                      </button>
                      <button className="icon-btn danger" onClick={() => setDeleteGym(w.id)} aria-label="Excluir treino">
                        <IconTrash size={18} />
                      </button>
                    </div>
                  </div>
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Exercício</th>
                        <th>Séries</th>
                        <th>Reps</th>
                        <th>Carga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e) => (
                        <tr key={e.id}>
                          <td>{e.exercise_name}</td>
                          <td>{e.sets ?? '—'}</td>
                          <td>{e.reps ?? '—'}</td>
                          <td>{e.weight_kg != null ? `${fmtNum(e.weight_kg)} kg` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {w.notes && <p className="muted small mt">{w.notes}</p>}
                </Card>
              );
            })
          )}
        </>
      ) : (
        <>
          <div className="page-toolbar">
            <Button onClick={openSportNew}>
              <IconPlus size={18} /> Registrar atividade
            </Button>
          </div>
          {sportList.length === 0 ? (
            <Card>
              <EmptyState
                icon={<IconActivity size={34} />}
                title="Nenhuma atividade esportiva registrada"
                message="Corrida, futebol, natação, ciclismo… registre a duração e o esforço que você percebeu."
                action={
                  <Button onClick={openSportNew}>
                    <IconPlus size={18} /> Registrar primeira atividade
                  </Button>
                }
              />
            </Card>
          ) : (
            sportList.slice(0, 30).map((a) => (
              <Card key={a.id} className="card-accent">
                <div className="row-head">
                  <div>
                    <strong>{SPORT_TYPES.find((t) => t.id === a.sport_type)?.label || a.sport_type}</strong>
                    <span className="muted small block">
                      {formatDateLong(a.activity_date)}
                      {a.duration_minutes != null ? ` · ${a.duration_minutes} min` : ''}
                      {a.distance_km != null ? ` · ${fmtNum(a.distance_km)} km` : ''}
                    </span>
                  </div>
                  <div className="row-actions">
                    <button className="icon-btn" onClick={() => openSportEdit(a)} aria-label="Editar atividade">
                      <IconEdit size={18} />
                    </button>
                    <button className="icon-btn danger" onClick={() => setDeleteSport(a.id)} aria-label="Excluir atividade">
                      <IconTrash size={18} />
                    </button>
                  </div>
                </div>
                {a.perceived_effort != null && (
                  <p className="small mt-none">
                    <Tag tone="info">Esforço percebido: {EFFORT_LABELS[a.perceived_effort - 1]}</Tag>
                  </p>
                )}
                {a.notes && <p className="muted small mt">{a.notes}</p>}
              </Card>
            ))
          )}
        </>
      )}

      {/* ---------- modal academia ---------- */}
      <Modal open={gymOpen} onClose={() => setGymOpen(false)} title={gymId ? 'Editar treino' : 'Registrar treino'}>
        <div className="form-grid">
          <Field label="Data">
            <input type="date" value={gymDate} onChange={(e) => setGymDate(e.target.value)} />
          </Field>
          <Field label="Horário (opcional)">
            <input type="time" value={gymTime} onChange={(e) => setGymTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Nome do treino">
          <input
            placeholder="Ex.: Treino A — Superiores"
            value={gymTitle}
            onChange={(e) => setGymTitle(e.target.value)}
          />
        </Field>

        <div className="field-label">Exercícios</div>
        {rows.map((r, i) => (
          <div className="exercise-row" key={i}>
            <input
              placeholder="Exercício"
              value={r.name}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <input
              inputMode="numeric"
              placeholder="Séries"
              value={r.sets}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, sets: e.target.value } : x)))}
            />
            <input
              inputMode="numeric"
              placeholder="Reps"
              value={r.reps}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, reps: e.target.value } : x)))}
            />
            <input
              inputMode="decimal"
              placeholder="kg"
              value={r.weight}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))}
            />
            <button
              className="icon-btn danger"
              aria-label="Remover exercício"
              onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : [emptyRow()])}
            >
              <IconTrash size={16} />
            </button>
          </div>
        ))}
        <Button variant="ghost" onClick={() => setRows([...rows, emptyRow()])}>
          <IconPlus size={16} /> Adicionar exercício
        </Button>

        <Field label="Observações (opcional)">
          <textarea rows={2} value={gymNotes} onChange={(e) => setGymNotes(e.target.value)} />
        </Field>
        {gymError && <p className="field-error">{gymError}</p>}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setGymOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submitGym} disabled={gymBusy}>
            Salvar
          </Button>
        </div>
      </Modal>

      {/* ---------- modal esporte ---------- */}
      <Modal open={sportOpen} onClose={() => setSportOpen(false)} title={sportId ? 'Editar atividade' : 'Registrar atividade'}>
        <Field label="Data">
          <input type="date" value={sportDate} onChange={(e) => setSportDate(e.target.value)} />
        </Field>
        <Field label="Tipo de atividade">
          <div className="chip-row">
            {SPORT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`chip ${sportType === t.id ? 'chip-active' : ''}`}
                onClick={() => setSportType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="form-grid">
          <Field label="Duração (min)">
            <input
              inputMode="numeric"
              placeholder="Ex.: 40"
              value={sportDuration}
              onChange={(e) => setSportDuration(e.target.value)}
            />
          </Field>
          <Field label="Distância km (opcional)">
            <input
              inputMode="decimal"
              placeholder="Ex.: 5,2"
              value={sportDistance}
              onChange={(e) => setSportDistance(e.target.value)}
            />
          </Field>
        </div>
        <RatingScale
          label="Esforço percebido"
          value={sportEffort}
          onChange={setSportEffort}
          labels={['Muito leve', 'Muito intenso']}
        />
        <Field label="Observações (opcional)">
          <textarea rows={2} value={sportNotes} onChange={(e) => setSportNotes(e.target.value)} />
        </Field>
        {sportError && <p className="field-error">{sportError}</p>}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setSportOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submitSport}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteGym != null}
        title="Excluir treino?"
        message="O treino e todos os exercícios registrados nele serão apagados. Essa ação não pode ser desfeita."
        onConfirm={async () => {
          if (deleteGym) await deleteRow('gym_workouts', deleteGym);
          setDeleteGym(null);
        }}
        onCancel={() => setDeleteGym(null)}
      />
      <ConfirmDialog
        open={deleteSport != null}
        title="Excluir atividade?"
        message="Essa atividade esportiva será apagada. Essa ação não pode ser desfeita."
        onConfirm={async () => {
          if (deleteSport) await deleteRow('sport_activities', deleteSport);
          setDeleteSport(null);
        }}
        onCancel={() => setDeleteSport(null)}
      />

      {gymList.length > 0 && view === 'gym' && (
        <p className="muted small center">
          <IconClock size={14} /> Exibindo os {Math.min(30, gymList.length)} treinos mais recentes
        </p>
      )}
      {gymList.length === 0 && sportList.length === 0 && view === 'sport' && (
        <p className="muted small center">
          Dica: você pode vincular atividades ao dia na sua rotina semanal.
        </p>
      )}
    </div>
  );
}
