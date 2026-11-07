import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Field, Modal, ConfirmDialog, EmptyState, Tag } from '../components/ui';
import { IconPlus, IconEdit, IconTrash, IconApple, IconRepeat } from '../components/ui';
import { SLOT_ORDER, SLOT_LABELS } from '../lib/helpers';
import type { DietMenuItem, DietMealLog, MealSlot } from '../lib/types';

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
  mealSlot: MealSlot;
  name: string;
  description: string;
  calories: string;
}

export function Menu() {
  const { data, saveRow, saveRows, deleteRow, showToast } = useApp();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ItemForm>({ id: undefined, weekday: 1, mealSlot: 'cafe_manha', name: '', description: '', calories: '' });
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cloneOpen, setCloneOpen] = useState<number | null>(null);
  const [cloneTarget, setCloneTarget] = useState<number>(1);
  const [cloneBusy, setCloneBusy] = useState(false);
  const [deleteClone, setDeleteClone] = useState<number | null>(null);

  const today = todayWeekday();

  const items = useMemo(
    () => [...data.diet_menu_items].sort((a, b) => a.weekday - b.weekday || SLOT_ORDER.indexOf(a.meal_slot) - SLOT_ORDER.indexOf(b.meal_slot) || a.sort_order - b.sort_order),
    [data.diet_menu_items],
  );

  const byDay = useMemo(() => {
    const map = new Map<number, DietMenuItem[]>();
    for (const d of WEEKDAYS) map.set(d.id, []);
    for (const it of items) map.get(it.weekday)?.push(it);
    return map;
  }, [items]);

  function openNewItem(weekday: number, mealSlot: MealSlot) {
    setForm({ id: undefined, weekday, mealSlot, name: '', description: '', calories: '' });
    setFormError('');
    setFormOpen(true);
  }

  function openEditItem(it: DietMenuItem) {
    setForm({
      id: it.id,
      weekday: it.weekday,
      mealSlot: it.meal_slot,
      name: it.name,
      description: it.description || '',
      calories: it.calories != null ? String(it.calories).replace('.', ',') : '',
    });
    setFormError('');
    setFormOpen(true);
  }

  async function submitItem() {
    const name = form.name.trim();
    if (!name) return setFormError('Informe o nome da refeição (ex.: "Frango com arroz").');
    const cal = form.calories ? Number(form.calories.replace(',', '.')) : null;
    if (form.calories && (Number.isNaN(cal) || (cal ?? 0) < 0))
      return setFormError('Calorias inválidas.');
    const siblings = items.filter((x) => x.weekday === form.weekday && x.meal_slot === form.mealSlot && x.id !== form.id);
    const res = await saveRow<DietMenuItem>('diet_menu_items', {
      id: form.id,
      weekday: form.weekday,
      meal_slot: form.mealSlot,
      name,
      description: form.description.trim() || null,
      calories: cal,
      sort_order: form.id ? undefined : siblings.length,
    });
    if (res.ok) setFormOpen(false);
  }

  async function cloneDay() {
    if (cloneOpen == null) return;
    setCloneBusy(true);
    const source = items.filter((x) => x.weekday === cloneOpen);
    const existingCount = new Map<string, number>();
    for (const x of items.filter((y) => y.weekday === cloneTarget)) {
      const key = x.meal_slot;
      existingCount.set(key, (existingCount.get(key) ?? 0) + 1);
    }
    const rows = source.map((x) => ({
      weekday: cloneTarget,
      meal_slot: x.meal_slot,
      sort_order: existingCount.get(x.meal_slot) ?? 0,
      name: x.name,
      description: x.description,
      calories: x.calories,
    }));
    const res = rows.length > 0 ? await saveRows<DietMenuItem>('diet_menu_items', rows) : { ok: true };
    setCloneBusy(false);
    if (res.ok) {
      showToast(rows.length > 0 ? `${rows.length} item(ns) copiado(s) para ${WEEKDAYS[cloneTarget].label}.` : 'O dia de origem está vazio.');
      setCloneOpen(null);
    }
  }

  async function clearDay(weekday: number) {
    const dayItems = items.filter((x) => x.weekday === weekday);
    for (const it of dayItems) await deleteRow('diet_menu_items', it.id);
    setDeleteClone(null);
  }

  return (
    <div>
      <h1>Menu da semana</h1>
      <p className="muted mt-small">
        Planeje o que você pretende comer em cada dia. As calorias que você informa por item alimentam a
        aba Evolução quando você confirma que comeu a refeição.
      </p>

      {items.length === 0 && (
        <Card>
          <EmptyState
            icon={<IconApple size={34} />}
            title="Seu menu está vazio"
            message="Monte o cardápio da semana dia a dia: escolha o dia, o horário da refeição (café da manhã, almoço, lanche, café da tarde ou janta) e os itens com as calorias estimadas por porção."
          />
        </Card>
      )}

      {WEEKDAYS.map((d) => {
        const dayItems = byDay.get(d.id) || [];
        const totalKcal = dayItems.reduce((acc, x) => acc + (x.calories ?? 0), 0);
        return (
          <Card key={d.id} className={d.id === today ? 'card-accent' : ''}>
            <div className="row-head">
              <strong>
                {d.label}
                {d.id === today ? ' · hoje' : ''}
              </strong>
              <div className="row-actions">
                <button className="icon-btn" aria-label="Copiar este dia" disabled={dayItems.length === 0} onClick={() => { setCloneOpen(d.id); setCloneTarget((d.id + 1) % 7); }}>
                  <IconRepeat size={17} />
                </button>
                <button className="icon-btn danger" aria-label="Limpar este dia" disabled={dayItems.length === 0} onClick={() => setDeleteClone(d.id)}>
                  <IconTrash size={17} />
                </button>
              </div>
            </div>

            {dayItems.length === 0 ? (
              <p className="muted small">Nada planejado ainda.</p>
            ) : (
              <div className="menu-day-total small">
                Total do dia: <strong>{totalKcal > 0 ? `${totalKcal} kcal` : '—'}</strong>
              </div>
            )}

            {SLOT_ORDER.map((slot) => {
              const slotItems = dayItems.filter((x) => x.meal_slot === slot);
              return (
                <div className="menu-slot" key={`${d.id}-${slot}`}>
                  <div className="menu-slot-head">
                    <span className="menu-slot-label">{SLOT_LABELS[slot]}</span>
                    <button className="icon-btn" aria-label={`Adicionar item em ${SLOT_LABELS[slot]}`} onClick={() => openNewItem(d.id, slot)}>
                      <IconPlus size={16} />
                    </button>
                  </div>
                  {slotItems.length === 0 ? (
                    <p className="muted small menu-slot-empty">—</p>
                  ) : (
                    slotItems.map((it) => (
                      <div className="menu-item" key={it.id}>
                        <div className="menu-item-body">
                          <strong>{it.name}</strong>
                          {it.description && <span className="muted small">{it.description}</span>}
                        </div>
                        <Tag tone={it.calories != null ? 'good' : 'info'}>
                          {it.calories != null ? `${it.calories} kcal` : 's/ kcal'}
                        </Tag>
                        <div className="row-actions">
                          <button className="icon-btn" onClick={() => openEditItem(it)} aria-label="Editar item">
                            <IconEdit size={17} />
                          </button>
                          <button className="icon-btn danger" onClick={() => setDeleteId(it.id)} aria-label="Remover item">
                            <IconTrash size={17} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </Card>
        );
      })}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={form.id ? 'Editar item do menu' : 'Adicionar item ao menu'}>
        <div className="form-grid">
          <Field label="Dia">
            <select value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}>
              {WEEKDAYS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Refeição">
            <select
              value={form.mealSlot}
              onChange={(e) => setForm({ ...form, mealSlot: e.target.value as MealSlot })}
            >
              {SLOT_ORDER.map((s) => (
                <option key={s} value={s}>{SLOT_LABELS[s]}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Nome do item">
          <input
            placeholder='Ex.: "Frango grelhado com arroz"'
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Descrição / porção (opcional)">
          <input
            placeholder='Ex.: "150g de frango + 4 colheres de arroz"'
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label="Calorias por porção em kcal (opcional)">
          <input
            inputMode="decimal"
            placeholder='Ex.: 560'
            value={form.calories}
            onChange={(e) => setForm({ ...form, calories: e.target.value })}
          />
        </Field>
        <p className="muted small">
          As calorias são a estimativa que você informa por porção. Para refeições compostas, some os
          valores que você costuma usar.
        </p>
        {formError && <p className="field-error">{formError}</p>}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancelar</Button>
          <Button onClick={submitItem}>Salvar</Button>
        </div>
      </Modal>

      <Modal open={cloneOpen != null} onClose={() => setCloneOpen(null)} title="Copiar dia">
        {cloneOpen != null && (
          <>
            <p className="muted small mt-none">
              Copia todos os itens planejados para {WEEKDAYS[cloneOpen].label} ({items.filter((x) => x.weekday === cloneOpen).length} item(ns)) para outro dia — os itens existentes do dia alvo são mantidos.
            </p>
            <Field label="Copiar para">
              <select value={cloneTarget} onChange={(e) => setCloneTarget(Number(e.target.value))}>
                {WEEKDAYS.filter((d) => d.id !== cloneOpen).map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </Field>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setCloneOpen(null)}>Cancelar</Button>
              <Button onClick={cloneDay} disabled={cloneBusy}>Copiar</Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        title="Remover item do menu?"
        message="Este item será removido do cardápio. Os registros de refeições já confirmadas não são afetados."
        onConfirm={async () => {
          if (deleteId) await deleteRow('diet_menu_items', deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmDialog
        open={deleteClone != null}
        title="Limpar o dia?"
        message={deleteClone != null ? `Todos os ${items.filter((x) => x.weekday === deleteClone).length} itens planejados para ${WEEKDAYS[deleteClone].label} serão removidos. Essa ação não pode ser desfeita.` : ''}
        onConfirm={async () => {
          if (deleteClone != null) await clearDay(deleteClone);
        }}
        onCancel={() => setDeleteClone(null)}
      />
    </div>
  );
}

function todayWeekday(): number {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getDay();
}
