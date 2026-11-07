import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Field, Modal, ConfirmDialog, EmptyState, Disclaimer, Tag } from '../components/ui';
import { IconApple, IconListChecks, IconCheck, IconPlus, IconTrash } from '../components/ui';
import { parseISO, toISO, addDays, todayISO, formatDateLong, SLOT_ORDER, SLOT_LABELS } from '../lib/helpers';
import type { DietMenuItem, DietMealLog, MealSlot } from '../lib/types';

const WEEKDAY_SHORT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function Meals() {
  const { data, saveRow, deleteRow } = useApp();

  const [extraOpen, setExtraOpen] = useState<MealSlot | null>(null);
  const [extraName, setExtraName] = useState('');
  const [extraCalories, setExtraCalories] = useState('');
  const [extraError, setExtraError] = useState('');
  const [deleteLog, setDeleteLog] = useState<string | null>(null);

  const today = todayISO();
  const todayWeekday = parseISO(today).getDay();

  const menuBySlot = useMemo(() => {
    const map = new Map<MealSlot, DietMenuItem[]>();
    for (const s of SLOT_ORDER) map.set(s, []);
    for (const it of data.diet_menu_items) {
      if (it.weekday !== todayWeekday) continue;
      map.get(it.meal_slot)?.push(it);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [data.diet_menu_items, todayWeekday]);

  const todayLogs = useMemo(
    () => data.diet_meal_logs.filter((l) => l.log_date === today),
    [data.diet_meal_logs, today],
  );
  const logByMenuItem = useMemo(() => {
    const map = new Map<string, DietMealLog>();
    for (const l of todayLogs) if (l.menu_item_id) map.set(l.menu_item_id, l);
    return map;
  }, [todayLogs]);
  const todayKcal = todayLogs.reduce((acc, l) => acc + (l.calories ?? 0), 0);

  // extras fora do cardápio (sem menu_item_id)
  const extrasBySlot = useMemo(() => {
    const map = new Map<MealSlot, DietMealLog[]>();
    for (const l of todayLogs) {
      if (l.menu_item_id) continue;
      const list = map.get(l.meal_slot) || [];
      list.push(l);
      map.set(l.meal_slot, list);
    }
    return map;
  }, [todayLogs]);

  // navegação entre dias (consulta de outros dias)
  const [viewDate, setViewDate] = useState(today);
  const isToday = viewDate === today;
  const viewWeekday = parseISO(viewDate).getDay();
  const viewLogs = useMemo(
    () => data.diet_meal_logs.filter((l) => l.log_date === viewDate),
    [data.diet_meal_logs, viewDate],
  );
  const viewKcal = viewLogs.reduce((acc, l) => acc + (l.calories ?? 0), 0);
  const viewLogByMenuItem = useMemo(() => {
    const map = new Map<string, DietMealLog>();
    for (const l of viewLogs) if (l.menu_item_id) map.set(l.menu_item_id, l);
    return map;
  }, [viewLogs]);
  const viewMenuBySlot = useMemo(() => {
    const map = new Map<MealSlot, DietMenuItem[]>();
    for (const s of SLOT_ORDER) map.set(s, []);
    for (const it of data.diet_menu_items) {
      if (it.weekday !== viewWeekday) continue;
      map.get(it.meal_slot)?.push(it);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [data.diet_menu_items, viewWeekday]);

  const hasMenu = data.diet_menu_items.length > 0;

  async function toggleMenu(it: DietMenuItem) {
    const existing = (isToday ? logByMenuItem : viewLogByMenuItem).get(it.id);
    if (existing) {
      await deleteRow('diet_meal_logs', existing.id);
      return;
    }
    if (!isToday) return;
    await saveRow<DietMealLog>('diet_meal_logs', {
      log_date: today,
      meal_slot: it.meal_slot,
      menu_item_id: it.id,
      calories: it.calories,
    });
  }

  async function submitExtra() {
    const name = extraName.trim();
    if (!name) return setExtraError('Informe o que você comeu.');
    const cal = extraCalories ? Number(extraCalories.replace(',', '.')) : null;
    if (extraCalories && (Number.isNaN(cal) || (cal ?? 0) < 0))
      return setExtraError('Calorias inválidas.');
    const res = await saveRow<DietMealLog>('diet_meal_logs', {
      log_date: today,
      meal_slot: extraOpen!,
      menu_item_id: null,
      extra_name: name,
      calories: cal,
    });
    if (res.ok) {
      setExtraOpen(null);
      setExtraName('');
      setExtraCalories('');
      setExtraError('');
    }
  }

  function shiftDate(n: number) {
    setViewDate(addDays(viewDate, n));
  }

  return (
    <div>
      <h1>Refeições</h1>
      <p className="muted mt-small">Confirme o que você comeu. O cardápio do dia alimenta o total de calorias.</p>

      {!hasMenu && (
        <Card>
          <EmptyState
            icon={<IconListChecks size={34} />}
            title="Sem cardápio para hoje"
            message="Monte o menu da semana para confirmar as refeições com um toque. Você também pode registrar algo fora do cardápio."
          />
        </Card>
      )}

      <Card className="diet-day-bar">
        <button className="icon-btn" aria-label="Dia anterior" onClick={() => shiftDate(-1)}>
          ‹
        </button>
        <div className="diet-day-title">
          <strong>{isToday ? 'Hoje' : WEEKDAY_SHORT[viewWeekday]}</strong>
          <span className="muted small">{formatDateLong(viewDate)}</span>
        </div>
        <button className="icon-btn" aria-label="Próximo dia" disabled={isToday} onClick={() => shiftDate(1)}>
          ›
        </button>
        <div className="diet-day-kcal">
          <Tag tone={viewKcal > 0 ? 'good' : 'info'}>{viewKcal > 0 ? `${viewKcal} kcal` : '0 kcal'}</Tag>
        </div>
      </Card>

      {SLOT_ORDER.map((slot) => {
        const slotMenu = (isToday ? menuBySlot : viewMenuBySlot).get(slot) || [];
        const slotExtras = isToday ? extrasBySlot.get(slot) || [] : viewLogs.filter((l) => l.meal_slot === slot && !l.menu_item_id);
        const slotKcal = [
          ...slotMenu.filter((m) => (isToday ? logByMenuItem : viewLogByMenuItem).has(m.id)),
          ...slotExtras,
        ].reduce((acc, x) => acc + (('calories' in x ? x.calories : null) ?? 0), 0);
        return (
          <Card key={slot}>
            <div className="section-title">
              <h2>{SLOT_LABELS[slot]}</h2>
              {slotKcal > 0 && <span className="slot-kcal">{slotKcal} kcal</span>}
            </div>

            {slotMenu.length === 0 && slotExtras.length === 0 ? (
              <p className="muted small">Nada planejado para {SLOT_LABELS[slot].toLowerCase()}.</p>
            ) : (
              <>
                {slotMenu.map((m) => {
                  const existing = (isToday ? logByMenuItem : viewLogByMenuItem).get(m.id);
                  const log = (isToday ? todayLogs : viewLogs).find((l) => l.menu_item_id === m.id);
                  return (
                    <div className={`meal-row ${existing ? 'eaten' : ''}`} key={m.id}>
                      <div className="meal-row-body">
                        <strong>{m.name}</strong>
                        {m.description && <span className="muted small">{m.description}</span>}
                      </div>
                      {m.calories != null && <Tag tone="info">{m.calories} kcal</Tag>}
                      {isToday ? (
                        <button
                          type="button"
                          className={`meal-ok ${existing ? 'eaten' : ''}`}
                          aria-label={existing ? 'Desmarcar refeição' : 'Marcar que comeu esta refeição'}
                          aria-pressed={Boolean(existing)}
                          onClick={() => toggleMenu(m)}
                        >
                          <IconCheck size={16} />
                          {existing ? 'Comi' : 'Ok'}
                        </button>
                      ) : (
                        existing && <Tag tone="good">Comi</Tag>
                      )}
                      {isToday && log && (
                        <button className="icon-btn danger" aria-label="Remover registro" onClick={() => setDeleteLog(log.id)}>
                          <IconTrash size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {slotExtras.map((ex) => (
                  <div className="meal-row eaten" key={ex.id}>
                    <div className="meal-row-body">
                      <strong>{ex.extra_name}</strong>
                      <span className="muted small">fora do cardápio</span>
                    </div>
                    {ex.calories != null && <Tag tone="info">{ex.calories} kcal</Tag>}
                    {isToday && (
                      <button className="icon-btn danger" aria-label="Remover registro" onClick={() => setDeleteLog(ex.id)}>
                        <IconTrash size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}

            {isToday && (
              <Button variant="ghost" onClick={() => { setExtraOpen(slot); setExtraError(''); }}>
                <IconPlus size={16} /> Comi algo fora do cardápio
              </Button>
            )}
          </Card>
        );
      })}

      <Disclaimer>
        As calorias mostradas são as estimativas que você informou por porção. Este espaço registra o que
        você adicionou e não faz avaliação nutricional, cálculo de necessidades ou recomendação de dieta.
        Para orientação individualizada, procure nutricionista.
      </Disclaimer>

      <Modal open={extraOpen != null} onClose={() => setExtraOpen(null)} title="Registrar algo fora do cardápio">
        {extraOpen != null && (
          <>
            <p className="muted small mt-none">
              {SLOT_LABELS[extraOpen]} · {formatDateLong(today)}
            </p>
            <Field label="O que você comeu">
              <input
                placeholder='Ex.: "Fatia de pizza"'
                value={extraName}
                onChange={(e) => setExtraName(e.target.value)}
              />
            </Field>
            <Field label="Calorias em kcal (opcional)">
              <input
                inputMode="decimal"
                placeholder='Ex.: 250'
                value={extraCalories}
                onChange={(e) => setExtraCalories(e.target.value)}
              />
            </Field>
            {extraError && <p className="field-error">{extraError}</p>}
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setExtraOpen(null)}>Cancelar</Button>
              <Button onClick={submitExtra}>Salvar</Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteLog != null}
        title="Remover registro?"
        message="O registro desta refeição confirmada será apagado (o total do dia diminui). Essa ação não pode ser desfeita."
        onConfirm={async () => {
          if (deleteLog) await deleteRow('diet_meal_logs', deleteLog);
          setDeleteLog(null);
        }}
        onCancel={() => setDeleteLog(null)}
      />
    </div>
  );
}
