import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Field, Modal, ConfirmDialog, EmptyState, Tag } from '../components/ui';
import { IconPlus, IconEdit, IconTrash, IconRepeat, IconCheck, IconDumbbell, IconActivity } from '../components/ui';
import { todayISO, formatDateLong, fmtNum } from '../lib/helpers';
import type { FitnessRoutineItem, GymExerciseEntry, GymWorkout } from '../lib/types';

const WEEKDAYS = [
  { id: 0, label: 'Domingo', short: 'Dom' },
  { id: 1, label: 'Segunda', short: 'Seg' },
  { id: 2, label: 'Terça', short: 'Ter' },
  { id: 3, label: 'Quarta', short: 'Qua' },
  { id: 4, label: 'Quinta', short: 'Qui' },
  { id: 5, label: 'Sexta', short: 'Sex' },
  { id: 6, label: 'Sábado', short: 'Sáb' },
];

interface ItemForm {
  id?: string;
  weekday: number;
  kind: 'academia' | 'esporte';
  title: string;
  exerciseName: string;
  sets: string;
  reps: string;
  targetWeight: string;
  notes: string;
}

const emptyItem = (weekday: number): ItemForm => ({
  weekday,
  kind: 'academia',
  title: '',
  exerciseName: '',
  sets: '',
  reps: '',
  targetWeight: '',
  notes: '',
});

export function Routine() {
  const { data, saveRow, saveRows, deleteRow, showToast } = useApp();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ItemForm>(emptyItem(1));
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [logTodayOpen, setLogTodayOpen] = useState(false);
  const [logBusy, setLogBusy] = useState(false);

  const today = todayISO();
  const todayWeekday = new Date(today + 'T12:00:00').getDay();

  const items = useMemo(
    () => [...data.fitness_routine_items].sort((a, b) => a.weekday - b.weekday || a.sort_order - b.sort_order),
    [data.fitness_routine_items],
  );

  const byDay = useMemo(() => {
    const map = new Map<number, FitnessRoutineItem[]>();
    for (const d of WEEKDAYS) map.set(d.id, []);
    for (const it of items) map.get(it.weekday)?.push(it);
    return map;
  }, [items]);

  const todayItems = byDay.get(todayWeekday) || [];

  function openNewItem(weekday: number) {
    setForm(emptyItem(weekday));
    setFormError('');
    setFormOpen(true);
  }

  function openEditItem(it: FitnessRoutineItem) {
    setForm({
      id: it.id,
      weekday: it.weekday,
      kind: it.kind,
      title: it.title,
      exerciseName: it.exercise_name || '',
      sets: it.sets != null ? String(it.sets) : '',
      reps: it.reps != null ? String(it.reps) : '',
      targetWeight: it.target_weight_kg != null ? String(it.target_weight_kg).replace('.', ',') : '',
      notes: it.notes || '',
    });
    setFormError('');
    setFormOpen(true);
  }

  async function submitItem() {
    const title = form.title.trim();
    if (!title) return setFormError('Dê um título ao item (ex.: "Treino A" ou "Futebol").');
    if (form.kind === 'academia' && !form.exerciseName.trim())
      return setFormError('Informe o exercício.');
    const res = await saveRow<FitnessRoutineItem>('fitness_routine_items', {
      id: form.id,
      weekday: form.weekday,
      kind: form.kind,
      title,
      exercise_name: form.kind === 'academia' ? form.exerciseName.trim() : null,
      sets: form.sets ? Number(form.sets) : null,
      reps: form.reps ? Number(form.reps) : null,
      target_weight_kg: form.targetWeight ? Number(form.targetWeight.replace(',', '.')) : null,
      notes: form.notes || null,
      sort_order: form.id ? undefined : (byDay.get(form.weekday)?.length ?? 0),
    });
    if (res.ok) setFormOpen(false);
  }

  async function move(it: FitnessRoutineItem, dir: -1 | 1) {
    const siblings = byDay.get(it.weekday) || [];
    const idx = siblings.findIndex((x) => x.id === it.id);
    const swapWith = siblings[idx + dir];
    if (!swapWith) return;
    await saveRow<FitnessRoutineItem>('fitness_routine_items', { id: it.id, sort_order: swapWith.sort_order });
    await saveRow<FitnessRoutineItem>('fitness_routine_items', { id: swapWith.id, sort_order: it.sort_order });
  }

  async function logToday() {
    const gymItems = todayItems.filter((it) => it.kind === 'academia');
    setLogBusy(true);
    const res = await saveRow<GymWorkout>('gym_workouts', {
      workout_date: today,
      title: gymItems[0]?.title || 'Treino do dia',
      notes: null,
    });
    if (res.ok && res.id) {
      const rows = gymItems.map((it, i) => ({
        workout_id: res.id!,
        sort_order: i,
        exercise_name: it.exercise_name || it.title,
        sets: it.sets,
        reps: it.reps,
        weight_kg: it.target_weight_kg,
      }));
      const ins = await saveRows<GymExerciseEntry>('gym_exercise_entries', rows);
      setLogBusy(false);
      if (ins.ok) {
        showToast('Treino de hoje registrado a partir da rotina.');
        setLogTodayOpen(false);
      }
    } else {
      setLogBusy(false);
    }
  }

  return (
    <div>
      <h1>Rotina semanal</h1>
      <p className="muted mt-small">
        Monte o plano da sua semana — você define o que acontece em cada dia. O app não sugere nem altera
        sua programação.
      </p>

      {todayItems.length > 0 && (
        <Card className="card-accent">
          <div className="row-head">
            <div>
              <strong>Hoje · {WEEKDAYS[todayWeekday].label}</strong>
              <span className="muted small block">{formatDateLong(today)}</span>
            </div>
            <Button onClick={() => setLogTodayOpen(true)} disabled={logBusy}>
              <IconCheck size={18} /> Registrar treino de hoje
            </Button>
          </div>
          <div className="routine-day-items">
            {todayItems.map((it) => (
              <RoutineChip key={it.id} item={it} />
            ))}
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconRepeat size={34} />}
            title="Sua rotina está vazia"
            message="Monte o plano da semana: escolha o dia, o tipo (academia ou esporte) e os exercícios. Depois registre os treinos realizados com um toque."
            action={
              <Button onClick={() => openNewItem(todayWeekday)}>
                <IconPlus size={18} /> Adicionar primeiro item
              </Button>
            }
          />
        </Card>
      ) : (
        WEEKDAYS.map((d) => {
          const dayItems = byDay.get(d.id) || [];
          return (
            <Card key={d.id} className={d.id === todayWeekday ? 'card-accent' : ''}>
              <div className="row-head">
                <strong>
                  {d.label}
                  {d.id === todayWeekday ? ' · hoje' : ''}
                </strong>
                <button className="icon-btn" onClick={() => openNewItem(d.id)} aria-label={`Adicionar item em ${d.label}`}>
                  <IconPlus size={18} />
                </button>
              </div>
              {dayItems.length === 0 ? (
                <p className="muted small">Descanso ou livre.</p>
              ) : (
                <div className="routine-day-items">
                  {dayItems.map((it, i) => (
                    <div className="routine-item" key={it.id}>
                      <RoutineChip item={it} />
                      <div className="row-actions">
                        <button className="icon-btn" aria-label="Mover para cima" disabled={i === 0} onClick={() => move(it, -1)}>
                          ↑
                        </button>
                        <button
                          className="icon-btn"
                          aria-label="Mover para baixo"
                          disabled={i === dayItems.length - 1}
                          onClick={() => move(it, 1)}
                        >
                          ↓
                        </button>
                        <button className="icon-btn" onClick={() => openEditItem(it)} aria-label="Editar item">
                          <IconEdit size={18} />
                        </button>
                        <button className="icon-btn danger" onClick={() => setDeleteId(it.id)} aria-label="Excluir item">
                          <IconTrash size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={form.id ? 'Editar item' : 'Adicionar item'}>
        <Field label="Dia da semana">
          <select value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}>
            {WEEKDAYS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo">
          <div className="chip-row">
            <button
              type="button"
              className={`chip ${form.kind === 'academia' ? 'chip-active' : ''}`}
              onClick={() => setForm({ ...form, kind: 'academia' })}
            >
              <IconDumbbell size={15} /> Academia
            </button>
            <button
              type="button"
              className={`chip ${form.kind === 'esporte' ? 'chip-active' : ''}`}
              onClick={() => setForm({ ...form, kind: 'esporte' })}
            >
              <IconActivity size={15} /> Esporte
            </button>
          </div>
        </Field>
        <Field label={form.kind === 'academia' ? 'Nome do treino' : 'Nome da atividade'}>
          <input
            placeholder={form.kind === 'academia' ? 'Ex.: Treino A — Superiores' : 'Ex.: Futebol com amigos'}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        {form.kind === 'academia' && (
          <>
            <Field label="Exercício principal">
              <input
                placeholder="Ex.: Supino reto"
                value={form.exerciseName}
                onChange={(e) => setForm({ ...form, exerciseName: e.target.value })}
              />
            </Field>
            <div className="form-grid form-grid-3">
              <Field label="Séries">
                <input inputMode="numeric" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} />
              </Field>
              <Field label="Reps">
                <input inputMode="numeric" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} />
              </Field>
              <Field label="Carga (kg)">
                <input
                  inputMode="decimal"
                  value={form.targetWeight}
                  onChange={(e) => setForm({ ...form, targetWeight: e.target.value })}
                />
              </Field>
            </div>
            <p className="muted small">
              Um item por exercício — adicione outros itens no mesmo dia para montar o treino completo.
            </p>
          </>
        )}
        <Field label="Observações (opcional)">
          <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        {formError && <p className="field-error">{formError}</p>}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setFormOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submitItem}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={logTodayOpen}
        title="Registrar treino de hoje?"
        message={
          todayItems.filter((i) => i.kind === 'academia').length > 0
            ? `Será criado um treino de academia de hoje (${formatDateLong(today)}) com ${todayItems.filter((i) => i.kind === 'academia').length} exercício(s) da sua rotina, com as cargas-alvo preenchidas. Você poderá ajustar depois.`
            : `Os itens de esporte da rotina não geram treino de academia. Adicione itens de academia ao dia de hoje para usar este botão.`
        }
        confirmLabel="Registrar"
        onConfirm={logToday}
        onCancel={() => setLogTodayOpen(false)}
      />

      <ConfirmDialog
        open={deleteId != null}
        title="Excluir item da rotina?"
        message="Este item será removido da rotina semanal. Essa ação não pode ser desfeita."
        onConfirm={async () => {
          if (deleteId) await deleteRow('fitness_routine_items', deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function RoutineChip({ item }: { item: FitnessRoutineItem }) {
  const detail =
    item.kind === 'academia'
      ? [
          item.exercise_name,
          item.sets != null ? `${item.sets}x` : null,
          item.reps != null ? `${item.reps} reps` : null,
          item.target_weight_kg != null ? `${fmtNum(item.target_weight_kg)} kg` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : item.notes || null;
  return (
    <div className="routine-chip">
      <strong>{item.title}</strong>
      {detail && <span>{detail}</span>}
      <Tag tone={item.kind === 'academia' ? 'info' : 'good'}>{item.kind === 'academia' ? 'Academia' : 'Esporte'}</Tag>
    </div>
  );
}
