import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  SectionTitle,
  Tag,
  IconPlus,
  IconSyringe,
  IconEdit,
  IconTrash,
  IconCalendar,
  IconCheck,
  IconUndo,
} from '../components/ui';
import { BodyMap } from '../components/BodyMap';
import { MonthCalendar, type CalendarEvent } from '../components/MonthCalendar';
import {
  DOSE_OPTIONS,
  INJECTION_SITES,
  formatDateLong,
  formatMonthYear,
  todayISO,
  nowTimeHM,
  daysUntil,
} from '../lib/helpers';
import type { MedicationApplication, Appointment, Reminder } from '../lib/types';

interface FormState {
  id?: string;
  application_date: string;
  application_time: string;
  dose: string;
  dose_unit: string;
  injection_site: string | null;
  body_side: string | null;
  lot_number: string;
  lot_expiry: string;
  notes: string;
  prescribed_confirmed: boolean;
}

const emptyForm = (): FormState => ({
  application_date: todayISO(),
  application_time: nowTimeHM(),
  dose: '',
  dose_unit: 'mg',
  injection_site: null,
  body_side: null,
  lot_number: '',
  lot_expiry: '',
  notes: '',
  prescribed_confirmed: false,
});

interface ReminderFormState {
  title: string;
  kind: 'aplicacao' | 'pesagem' | 'consulta' | 'exame' | 'outro';
  remind_date: string;
  remind_time: string;
  lead_minutes: string;
  planned_dose: string;
  professional: string;
  location: string;
  notes: string;
  repeat: RepeatOption;
}

type RepeatOption = 'none' | 'weekly' | 'biweekly' | 'monthly';

const REPEAT_LABELS: Record<RepeatOption, string> = {
  none: 'Não repetir',
  weekly: 'Repetir semanalmente',
  biweekly: 'Repetir a cada 2 semanas',
  monthly: 'Repetir mensalmente',
};

const WEEKDAY_NAMES = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado',
];

const emptyReminderState = (): ReminderFormState => ({
  title: '',
  kind: 'aplicacao',
  remind_date: '',
  remind_time: '',
  lead_minutes: '60',
  planned_dose: '',
  professional: '',
  location: '',
  notes: '',
  repeat: 'none',
});

function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function addMonthsISO(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() !== day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

type EditingTarget = { type: 'reminder' | 'appt'; id: string; isDone?: boolean } | null;

const LEAD_LABELS: Record<string, string> = {
  '0': 'Avisa no horário',
  '30': 'Avisa 30 min antes',
  '60': 'Avisa 1h antes',
  '120': 'Avisa 2h antes',
  '1440': 'Avisa 1 dia antes',
};

const KIND_LABELS: Record<Reminder['kind'], string> = {
  aplicacao: 'Aplicação programada',
  pesagem: 'Pesagem',
  consulta: 'Consulta',
  exame: 'Exame',
  outro: 'Lembrete pessoal',
};

export function Applications() {
  const { data, saveRow, saveRows, deleteRow, action, setAction, showToast } = useApp();

  const [view, setView] = useState<'timeline' | 'calendar' | 'lembretes'>('timeline');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminder, setReminder] = useState<ReminderFormState>(emptyReminderState);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingTarget>(null);

  const [pendingDelete, setPendingDelete] = useState<MedicationApplication | null>(null);
  const [pendingDeleteRem, setPendingDeleteRem] = useState<{
    table: 'reminders' | 'appointments';
    id: string;
    label: string;
  } | null>(null);

  const today = todayISO();

  useEffect(() => {
    if (action === 'new-application') {
      setForm(emptyForm());
      setFormOpen(true);
      setAction(null);
    }
  }, [action, setAction]);

  const sorted = useMemo(
    () =>
      [...data.applications].sort((a, b) =>
        a.application_date < b.application_date ? 1 : -1,
      ),
    [data.applications],
  );

  const events: CalendarEvent[] = useMemo(() => {
    const evts: CalendarEvent[] = [];
    for (const a of data.applications) {
      evts.push({ date: a.application_date, kind: 'aplicacao', label: `Aplicação ${a.dose} ${a.dose_unit}` });
    }
    for (const r of data.reminders) {
      if (r.is_done) continue;
      const kind =
        r.kind === 'aplicacao'
          ? 'aplicacao_prevista'
          : r.kind === 'pesagem'
            ? 'pesagem'
            : r.kind === 'consulta'
              ? 'consulta'
              : r.kind === 'exame'
                ? 'exame'
                : 'lembrete';
      evts.push({ date: r.remind_date, kind, label: r.title });
    }
    for (const a of data.appointments) {
      evts.push({
        date: a.appt_date,
        kind: a.kind === 'consulta' ? 'consulta' : 'exame',
        label: a.kind === 'consulta' ? 'Consulta' : 'Exame',
      });
    }
    for (const m of data.measurements) {
      if (m.weight_kg != null) evts.push({ date: m.entry_date, kind: 'pesagem', label: 'Pesagem' });
    }
    return evts;
  }, [data.applications, data.reminders, data.measurements, data.appointments]);

  const timeline = useMemo(() => {
    const groups = new Map<string, MedicationApplication[]>();
    for (const a of sorted) {
      const key = a.application_date.slice(0, 7);
      const arr = groups.get(key) || [];
      arr.push(a);
      groups.set(key, arr);
    }
    return [...groups.entries()];
  }, [sorted]);

  const openEdit = (a: MedicationApplication) => {
    setForm({
      id: a.id,
      application_date: a.application_date,
      application_time: a.application_time || '',
      dose: String(a.dose),
      dose_unit: a.dose_unit,
      injection_site: a.injection_site,
      body_side: a.body_side,
      lot_number: a.lot_number || '',
      lot_expiry: a.lot_expiry || '',
      notes: a.notes || '',
      prescribed_confirmed: a.prescribed_confirmed,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.application_date) {
      setFormError('Informe a data da aplicação.');
      return;
    }
    const dose = Number(form.dose.replace(',', '.'));
    if (!form.dose || Number.isNaN(dose) || dose <= 0) {
      setFormError('Informe a dose utilizada (apenas a dose que você usou).');
      return;
    }
    if (!form.prescribed_confirmed) {
      setFormError('Confirme que esta dose foi prescrita pelo profissional responsável.');
      return;
    }
    setSaving(true);
    const res = await saveRow<MedicationApplication>('medication_applications', {
      id: form.id,
      application_date: form.application_date,
      application_time: form.application_time || null,
      dose,
      dose_unit: form.dose_unit,
      injection_site: form.injection_site,
      body_side: form.body_side,
      lot_number: form.lot_number || null,
      lot_expiry: form.lot_expiry || null,
      notes: form.notes || null,
      prescribed_confirmed: true,
    });
    setSaving(false);
    if (res.ok) {
      setFormOpen(false);
    }
  };

  const submitReminder = async () => {
    if (!reminder.remind_date) {
      setReminderError('Escolha a data.');
      return;
    }
    const isAppt = reminder.kind === 'consulta' || reminder.kind === 'exame';
    if (isAppt) {
      const res = await saveRow<Appointment>('appointments', {
        id: editing?.type === 'appt' ? editing.id : undefined,
        kind: reminder.kind as 'consulta' | 'exame',
        appt_date: reminder.remind_date,
        appt_time: reminder.remind_time || null,
        professional: reminder.professional || null,
        location: reminder.location || null,
        notes: reminder.notes || null,
      });
      if (res.ok) setReminderOpen(false);
      return;
    }
    if (!reminder.title.trim()) {
      setReminderError('Dê um título ao lembrete.');
      return;
    }
    const baseValues = {
      title: reminder.title.trim(),
      kind: reminder.kind,
      remind_time: reminder.remind_time || null,
      lead_minutes: reminder.lead_minutes ? Number(reminder.lead_minutes) : null,
      planned_dose: reminder.kind === 'aplicacao' && reminder.planned_dose ? Number(reminder.planned_dose.replace(',', '.')) : null,
      planned_dose_unit: reminder.kind === 'aplicacao' ? 'mg' : null,
      notes: reminder.notes || null,
    };
    if (editing?.type === 'reminder') {
      const res = await saveRow<Reminder>('reminders', {
        id: editing.id,
        ...baseValues,
        remind_date: reminder.remind_date,
        is_done: editing.isDone ?? false,
      });
      if (res.ok) setReminderOpen(false);
      return;
    }
    const repeat = reminder.kind === 'aplicacao' ? 'none' : reminder.repeat;
    if (repeat === 'none') {
      const res = await saveRow<Reminder>('reminders', {
        ...baseValues,
        remind_date: reminder.remind_date,
        is_done: false,
      });
      if (res.ok) setReminderOpen(false);
      return;
    }
    const stepDays = repeat === 'weekly' ? 7 : repeat === 'biweekly' ? 14 : 0;
    const total = repeat === 'monthly' ? 6 : 8;
    const dates: string[] = [reminder.remind_date];
    for (let i = 1; i < total; i++) {
      dates.push(stepDays > 0 ? addDaysISO(reminder.remind_date, stepDays * i) : addMonthsISO(reminder.remind_date, i));
    }
    const res = await saveRows<Reminder>(
      'reminders',
      dates.map((d) => ({ ...baseValues, remind_date: d, is_done: false })),
    );
    if (res.ok) {
      showToast(`${total} lembretes criados — um ${repeat === 'monthly' ? 'por mês' : repeat === 'biweekly' ? 'a cada 2 semanas' : 'por semana'} até ${formatDateLong(dates[dates.length - 1])}.`);
      setReminderOpen(false);
    }
  };

  const openNewReminder = () => {
    setReminder(emptyReminderState());
    setEditing(null);
    setReminderError(null);
    setReminderOpen(true);
  };

  const openEditReminder = (r: Reminder) => {
    setReminder({
      title: r.title,
      kind: r.kind,
      remind_date: r.remind_date,
      remind_time: r.remind_time || '',
      lead_minutes: r.lead_minutes != null ? String(r.lead_minutes) : '60',
      planned_dose: r.planned_dose != null ? String(r.planned_dose) : '',
      professional: '',
      location: '',
      notes: r.notes || '',
      repeat: 'none',
    });
    setEditing({ type: 'reminder', id: r.id, isDone: r.is_done });
    setReminderError(null);
    setReminderOpen(true);
  };

  const openEditAppt = (a: Appointment) => {
    setReminder({
      title: '',
      kind: a.kind,
      remind_date: a.appt_date,
      remind_time: a.appt_time || '',
      lead_minutes: '60',
      planned_dose: '',
      professional: a.professional || '',
      location: a.location || '',
      notes: a.notes || '',
      repeat: 'none',
    });
    setEditing({ type: 'appt', id: a.id });
    setReminderError(null);
    setReminderOpen(true);
  };

  const toggleDone = async (r: Reminder) => {
    await saveRow<Reminder>('reminders', { id: r.id, is_done: !r.is_done });
  };

  const upcomingReminders = useMemo(
    () =>
      data.reminders
        .filter((r) => !r.is_done)
        .sort((a, b) => (a.remind_date > b.remind_date ? 1 : -1)),
    [data.reminders],
  );
  const doneReminders = useMemo(
    () =>
      data.reminders
        .filter((r) => r.is_done)
        .sort((a, b) => (a.remind_date < b.remind_date ? 1 : -1)),
    [data.reminders],
  );
  const upcomingAppts = useMemo(
    () =>
      data.appointments
        .filter((a) => a.appt_date >= today)
        .sort((a, b) => (a.appt_date > b.appt_date ? 1 : -1)),
    [data.appointments, today],
  );
  const pastAppts = useMemo(
    () =>
      data.appointments
        .filter((a) => a.appt_date < today)
        .sort((a, b) => (a.appt_date < b.appt_date ? 1 : -1)),
    [data.appointments, today],
  );
  const pendingCount = upcomingReminders.length + upcomingAppts.length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Aplicações</h1>
          <p className="page-sub">Histórico e programação registrados por você.</p>
        </div>
        <div className="head-actions">
          <Button onClick={() => { setForm(emptyForm()); setFormOpen(true); }}>
            <IconPlus size={18} /> Registrar aplicação
          </Button>
          <Button variant="secondary" onClick={openNewReminder}>
            <IconCalendar size={18} /> Novo lembrete
          </Button>
        </div>
      </div>

      <div className="view-toggle">
        <button className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}>
          Linha do tempo
        </button>
        <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
          Calendário
        </button>
        <button className={view === 'lembretes' ? 'active' : ''} onClick={() => setView('lembretes')}>
          Lembretes{pendingCount > 0 ? ` (${pendingCount})` : ''}
        </button>
      </div>

      {view === 'timeline' ? (
        sorted.length === 0 ? (
          <Card>
            <EmptyState
              icon={<IconSyringe />}
              title="Nenhuma aplicação registrada"
              message="Quando você aplicar, registre aqui a data, a dose prescrita e o local. Isso monta seu histórico para acompanhar e conversar com seu médico."
              action={
                <Button onClick={() => { setForm(emptyForm()); setFormOpen(true); }}>
                  <IconPlus size={18} /> Registrar primeira aplicação
                </Button>
              }
            />
          </Card>
        ) : (
          timeline.map(([month, items]) => (
            <div key={month}>
              <SectionTitle>{formatMonthYear(items[0].application_date)}</SectionTitle>
              <div className="timeline">
                {items.map((a) => (
                  <Card key={a.id} className="timeline-item">
                    <div className="tl-date">
                      <span className="tl-day">{a.application_date.slice(8, 10)}</span>
                      <span className="tl-mon">{a.application_date.slice(5, 7)}</span>
                    </div>
                    <div className="tl-body">
                      <div className="tl-title">
                        <strong>
                          {a.dose.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {a.dose_unit}
                        </strong>
                        {a.application_time && <Tag>{a.application_time}</Tag>}
                      </div>
                      <p className="muted">
                        {[a.injection_site, a.body_side].filter(Boolean).join(' · ') || 'Local não informado'}
                      </p>
                      {(a.lot_number || a.notes) && (
                        <p className="muted small">
                          {a.lot_number ? `Lote ${a.lot_number}` : ''}
                          {a.lot_number && a.notes ? ' · ' : ''}
                          {a.notes || ''}
                        </p>
                      )}
                    </div>
                    <div className="tl-actions">
                      <button className="icon-btn" onClick={() => openEdit(a)} aria-label="Editar">
                        <IconEdit size={18} />
                      </button>
                      <button className="icon-btn danger" onClick={() => setPendingDelete(a)} aria-label="Excluir">
                        <IconTrash size={18} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )
      ) : view === 'calendar' ? (
        <Card>
          <MonthCalendar events={events} />
        </Card>
      ) : (
        <>
          <SectionTitle>Próximos lembretes</SectionTitle>
          {upcomingReminders.length === 0 ? (
            <Card>
              <p className="muted">
                Nenhum lembrete pendente. Use “Novo lembrete” para programar uma aplicação, pesagem
                ou outro aviso pessoal — com data, horário e antecedência escolhidos por você.
              </p>
            </Card>
          ) : (
            upcomingReminders.map((r) => {
              const d = daysUntil(r.remind_date);
              return (
                <Card key={r.id} className={`rem-row ${d < 0 ? 'rem-overdue' : ''}`}>
                  <div className="rem-date">
                    <span className="tl-day">{r.remind_date.slice(8, 10)}</span>
                    <span className="tl-mon">{r.remind_date.slice(5, 7)}</span>
                  </div>
                  <div className="rem-body">
                    <div className="tl-title">
                      <strong>{r.title || KIND_LABELS[r.kind]}</strong>
                      <Tag tone="info">{KIND_LABELS[r.kind]}</Tag>
                      {d < 0 && <Tag tone="warn">Atrasado</Tag>}
                      {d === 0 && <Tag tone="good">Hoje</Tag>}
                    </div>
                    <span className="muted small">
                      {formatDateLong(r.remind_date)}
                      {r.remind_time ? ` às ${r.remind_time.slice(0, 5)}` : ''}
                      {r.lead_minutes != null ? ` · ${LEAD_LABELS[String(r.lead_minutes)] ?? `Avisa ${r.lead_minutes} min antes`}` : ''}
                      {r.planned_dose ? ` · Dose planejada: ${r.planned_dose} ${r.planned_dose_unit ?? 'mg'}` : ''}
                    </span>
                    {r.notes && <span className="muted small">{r.notes}</span>}
                  </div>
                  <div className="tl-actions">
                    <button className="icon-btn" onClick={() => toggleDone(r)} aria-label="Marcar como concluído" title="Marcar como concluído">
                      <IconCheck size={18} />
                    </button>
                    <button className="icon-btn" onClick={() => openEditReminder(r)} aria-label="Editar" title="Editar">
                      <IconEdit size={18} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() =>
                        setPendingDeleteRem({
                          table: 'reminders',
                          id: r.id,
                          label: `o lembrete "${r.title || KIND_LABELS[r.kind]}" de ${formatDateLong(r.remind_date)}`,
                        })
                      }
                      aria-label="Excluir"
                      title="Excluir"
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>
                </Card>
              );
            })
          )}

          <SectionTitle>Consultas e exames</SectionTitle>
          {upcomingAppts.length === 0 && pastAppts.length === 0 ? (
            <Card>
              <p className="muted">
                Nenhuma consulta ou exame registrado. Programe pelo botão “Novo lembrete”, escolhendo
                o tipo Consulta ou Exame.
              </p>
            </Card>
          ) : (
            [...upcomingAppts, ...pastAppts].map((a) => (
              <Card key={a.id} className={`rem-row ${a.appt_date < today ? 'rem-done' : ''}`}>
                <div className="rem-date">
                  <span className="tl-day">{a.appt_date.slice(8, 10)}</span>
                  <span className="tl-mon">{a.appt_date.slice(5, 7)}</span>
                </div>
                <div className="rem-body">
                  <div className="tl-title">
                    <strong>{a.kind === 'consulta' ? 'Consulta' : 'Exame'}</strong>
                    {a.appt_date < today && <Tag>Realizada</Tag>}
                  </div>
                  <span className="muted small">
                    {formatDateLong(a.appt_date)}
                    {a.appt_time ? ` às ${a.appt_time.slice(0, 5)}` : ''}
                    {a.professional ? ` · ${a.professional}` : ''}
                    {a.location ? ` · ${a.location}` : ''}
                  </span>
                  {a.notes && <span className="muted small">{a.notes}</span>}
                </div>
                <div className="tl-actions">
                  <button className="icon-btn" onClick={() => openEditAppt(a)} aria-label="Editar" title="Editar">
                    <IconEdit size={18} />
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() =>
                      setPendingDeleteRem({
                        table: 'appointments',
                        id: a.id,
                        label: `a ${a.kind === 'consulta' ? 'consulta' : 'exame'} de ${formatDateLong(a.appt_date)}`,
                      })
                    }
                    aria-label="Excluir"
                    title="Excluir"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </Card>
            ))
          )}

          {doneReminders.length > 0 && (
            <>
              <SectionTitle>Concluídos</SectionTitle>
              {doneReminders.map((r) => (
                <Card key={r.id} className="rem-row rem-done">
                  <div className="rem-date">
                    <span className="tl-day">{r.remind_date.slice(8, 10)}</span>
                    <span className="tl-mon">{r.remind_date.slice(5, 7)}</span>
                  </div>
                  <div className="rem-body">
                    <div className="tl-title">
                      <strong>{r.title || KIND_LABELS[r.kind]}</strong>
                      <Tag tone="good">Concluído</Tag>
                    </div>
                    <span className="muted small">
                      {formatDateLong(r.remind_date)}
                      {r.remind_time ? ` às ${r.remind_time.slice(0, 5)}` : ''}
                    </span>
                  </div>
                  <div className="tl-actions">
                    <button className="icon-btn" onClick={() => toggleDone(r)} aria-label="Reativar" title="Reativar lembrete">
                      <IconUndo size={18} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() =>
                        setPendingDeleteRem({
                          table: 'reminders',
                          id: r.id,
                          label: `o lembrete "${r.title || KIND_LABELS[r.kind]}" de ${formatDateLong(r.remind_date)}`,
                        })
                      }
                      aria-label="Excluir"
                      title="Excluir"
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>
                </Card>
              ))}
            </>
          )}
        </>
      )}

      {/* Formulário de aplicação */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={form.id ? 'Editar aplicação' : 'Registrar aplicação'} wide>
        <div className="form-grid">
          <Field label="Data" required>
            <input type="date" value={form.application_date} onChange={(e) => setForm({ ...form, application_date: e.target.value })} />
          </Field>
          <Field label="Horário">
            <input type="time" value={form.application_time} onChange={(e) => setForm({ ...form, application_time: e.target.value })} />
          </Field>
          <Field label="Dose utilizada" required>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="Ex.: 5"
              value={form.dose}
              onChange={(e) => setForm({ ...form, dose: e.target.value })}
            />
            <div className="dose-chips">
              {DOSE_OPTIONS.map((d) => (
                <button key={d} type="button" className={`chip ${form.dose === d ? 'chip-active' : ''}`} onClick={() => setForm({ ...form, dose: d })}>
                  {d}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Unidade da dose">
            <select value={form.dose_unit} onChange={(e) => setForm({ ...form, dose_unit: e.target.value })}>
              <option value="mg">mg</option>
              <option value="unidades">unidades</option>
            </select>
          </Field>
        </div>

        <Field label="Local da aplicação">
          <BodyMap value={form.injection_site} onChange={(s) => setForm({ ...form, injection_site: s })} />
        </Field>

        <div className="form-grid">
          <Field label="Lado do corpo">
            <select value={form.body_side ?? ''} onChange={(e) => setForm({ ...form, body_side: e.target.value || null })}>
              <option value="">Não se aplica</option>
              <option value="Esquerdo">Esquerdo</option>
              <option value="Direito">Direito</option>
            </select>
          </Field>
          <Field label="Número do lote (opcional)">
            <input type="text" value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} />
          </Field>
          <Field label="Validade (opcional)">
            <input type="date" value={form.lot_expiry} onChange={(e) => setForm({ ...form, lot_expiry: e.target.value })} />
          </Field>
        </div>

        <Field label="Observações">
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anotações pessoais sobre esta aplicação" />
        </Field>

        <label className="check-field">
          <input
            type="checkbox"
            checked={form.prescribed_confirmed}
            onChange={(e) => setForm({ ...form, prescribed_confirmed: e.target.checked })}
          />
          <span>Confirmo que esta dose foi prescrita pelo profissional responsável pelo meu tratamento.</span>
        </label>

        {formError && <p className="form-error">{formError}</p>}

        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Salvando…' : 'Salvar aplicação'}</Button>
        </div>
      </Modal>

      {/* Lembrete / consulta */}
      <Modal
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        title={editing?.type === 'appt' ? 'Editar consulta/exame' : editing ? 'Editar lembrete' : 'Novo lembrete'}
      >
        <div className="form-grid">
          <Field
            label="Tipo"
            hint={editing ? 'Para mudar o tipo, exclua este item e crie um novo.' : undefined}
          >
            <select
              value={reminder.kind}
              disabled={editing != null}
              onChange={(e) => setReminder({ ...reminder, kind: e.target.value as typeof reminder.kind })}
            >
              <option value="aplicacao">Aplicação programada</option>
              <option value="pesagem">Pesagem</option>
              <option value="consulta">Consulta</option>
              <option value="exame">Exame</option>
              <option value="outro">Outro lembrete pessoal</option>
            </select>
          </Field>
          <Field label="Data" required>
            <input type="date" value={reminder.remind_date} onChange={(e) => setReminder({ ...reminder, remind_date: e.target.value })} />
          </Field>
          <Field label="Horário">
            <input type="time" value={reminder.remind_time} onChange={(e) => setReminder({ ...reminder, remind_time: e.target.value })} />
          </Field>
          <Field label="Avisar com antecedência">
            <select value={reminder.lead_minutes} onChange={(e) => setReminder({ ...reminder, lead_minutes: e.target.value })}>
              <option value="0">No horário</option>
              <option value="30">30 minutos antes</option>
              <option value="60">1 hora antes</option>
              <option value="120">2 horas antes</option>
              <option value="1440">1 dia antes</option>
            </select>
          </Field>
          {editing == null && reminder.kind !== 'consulta' && reminder.kind !== 'exame' && (
            <Field label="Repetir (opcional)">
              <select
                value={reminder.repeat}
                onChange={(e) => setReminder({ ...reminder, repeat: e.target.value as ReminderFormState['repeat'] })}
              >
                {(Object.keys(REPEAT_LABELS) as ReminderFormState['repeat'][]).map((k) => (
                  <option key={k} value={k}>{REPEAT_LABELS[k]}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
        {editing == null && reminder.repeat !== 'none' && reminder.kind !== 'consulta' && reminder.kind !== 'exame' && (
          <p className="field-hint">
            {(() => {
              const total = reminder.repeat === 'monthly' ? 6 : 8;
              const weekday = reminder.remind_date
                ? WEEKDAY_NAMES[new Date(reminder.remind_date + 'T12:00:00').getDay()]
                : null;
              const cadence =
                reminder.repeat === 'weekly'
                  ? weekday
                    ? `semanalmente, sempre às ${weekday}s`
                    : 'semanalmente'
                  : reminder.repeat === 'biweekly'
                    ? weekday
                      ? `a cada 2 semanas, às ${weekday}s`
                      : 'a cada 2 semanas'
                    : 'mensalmente, no mesmo dia';
              return `Serão criados ${total} lembretes idênticos (${cadence}), que você pode editar ou excluir individualmente.`;
            })()}
          </p>
        )}

        {reminder.kind === 'aplicacao' && (
          <Field label="Dose planejada (opcional — registrada por você)">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="Ex.: 5"
              value={reminder.planned_dose}
              onChange={(e) => setReminder({ ...reminder, planned_dose: e.target.value })}
            />
          </Field>
        )}

        {(reminder.kind === 'consulta' || reminder.kind === 'exame') && (
          <div className="form-grid">
            <Field label="Profissional / local">
              <input type="text" value={reminder.professional} onChange={(e) => setReminder({ ...reminder, professional: e.target.value })} />
            </Field>
          </div>
        )}

        {reminder.kind !== 'aplicacao' && reminder.kind !== 'consulta' && reminder.kind !== 'exame' && (
          <Field label="Título" required>
            <input type="text" value={reminder.title} onChange={(e) => setReminder({ ...reminder, title: e.target.value })} placeholder="Ex.: pesar-me" />
          </Field>
        )}
        {reminder.kind === 'aplicacao' && (
          <Field label="Título">
            <input type="text" value={reminder.title} onChange={(e) => setReminder({ ...reminder, title: e.target.value })} placeholder="Aplicação" />
          </Field>
        )}

        <Field label="Observações">
          <textarea rows={2} value={reminder.notes} onChange={(e) => setReminder({ ...reminder, notes: e.target.value })} />
        </Field>

        <p className="field-hint">
          O aplicativo nunca altera automaticamente datas, frequência ou dose — tudo aqui é
          registrado e confirmado por você.
        </p>
        {reminderError && <p className="form-error">{reminderError}</p>}

        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setReminderOpen(false)}>Cancelar</Button>
          <Button onClick={submitReminder}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete != null}
        title="Excluir aplicação"
        message={`Excluir a aplicação de ${pendingDelete ? formatDateLong(pendingDelete.application_date) : ''}? Esta ação não pode ser desfeita.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) {
            await deleteRow('medication_applications', pendingDelete.id);
            setPendingDelete(null);
          }
        }}
      />

      <ConfirmDialog
        open={pendingDeleteRem != null}
        title="Excluir lembrete"
        message={`Excluir ${pendingDeleteRem?.label ?? ''}? Esta ação não pode ser desfeita.`}
        onCancel={() => setPendingDeleteRem(null)}
        onConfirm={async () => {
          if (pendingDeleteRem) {
            await deleteRow(pendingDeleteRem.table, pendingDeleteRem.id);
            setPendingDeleteRem(null);
          }
        }}
      />
    </div>
  );
}
