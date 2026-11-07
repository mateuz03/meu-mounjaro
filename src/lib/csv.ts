// Exportação dos dados em CSV (pt-BR): UTF-8 com BOM e separador ";",
// para abrir diretamente no Excel sem ajustes. Dados informados pelo usuário.

import type { AppData } from './types';
import { todayISO } from './helpers';

const q = (v: unknown): string => `"${String(v ?? '').replace(/"/g, '""')}"`;

const dec = (v: number | null | undefined): string =>
  v == null ? '' : String(v).replace('.', ',');

const date = (v: string | null | undefined): string => v || '';

function section(lines: string[], title: string, header: string[], rows: unknown[][]): void {
  lines.push('');
  lines.push(q(title));
  lines.push(header.map(q).join(';'));
  for (const r of rows) lines.push(r.map(q).join(';'));
}

export function buildCsv(data: AppData): string {
  const lines: string[] = [];
  const name = data.profile?.full_name || '';
  lines.push(q('Meu Mounjaro — exportação de dados'));
  lines.push(q(`Gerado em: ${todayISO()}`));
  if (name) lines.push(q(`Usuário: ${name}`));
  lines.push(q('Todos os dados abaixo foram informados pelo próprio usuário no diário pessoal.'));
  lines.push(
    q(
      'Este arquivo é um diário pessoal e não oferece diagnóstico, prescrição ou orientação médica.',
    ),
  );

  const apps = [...data.applications].sort((a, b) =>
    a.application_date > b.application_date ? 1 : -1,
  );
  section(
    lines,
    'APLICAÇÕES',
    ['Data', 'Horário', 'Dose', 'Unidade', 'Local', 'Lado', 'Lote', 'Validade', 'Observações'],
    apps.map((a) => [
      date(a.application_date),
      a.application_time || '',
      dec(a.dose),
      a.dose_unit,
      a.injection_site || '',
      a.body_side || '',
      a.lot_number || '',
      date(a.lot_expiry),
      a.notes || '',
    ]),
  );

  const measures = [...data.measurements].sort((a, b) =>
    a.entry_date > b.entry_date ? 1 : -1,
  );
  section(
    lines,
    'MEDIDAS',
    [
      'Data', 'Peso (kg)', 'Abdômen (cm)', 'Cintura (cm)', 'Quadril (cm)',
      'Peitoral (cm)', 'Braço (cm)', 'Coxa (cm)', 'Gordura (%)', 'Observações',
    ],
    measures.map((m) => [
      date(m.entry_date),
      dec(m.weight_kg),
      dec(m.abdominal_circ_cm),
      dec(m.waist_circ_cm),
      dec(m.hip_circ_cm),
      dec(m.chest_circ_cm),
      dec(m.arm_circ_cm),
      dec(m.thigh_circ_cm),
      dec(m.body_fat_pct),
      m.notes || '',
    ]),
  );

  const logs = [...data.logs].sort((a, b) => (a.log_date > b.log_date ? 1 : -1));
  section(
    lines,
    'DIÁRIO',
    [
      'Data', 'Fome (1-5)', 'Saciedade (1-5)', 'Energia (1-5)', 'Humor (1-5)',
      'Água (ml)', 'Qualidade do sono (1-5)', 'Horas de sono', 'Atividade física',
      'Alimentação', 'Observações',
    ],
    logs.map((l) => [
      date(l.log_date),
      dec(l.hunger_level),
      dec(l.satiety_level),
      dec(l.energy_level),
      dec(l.mood_level),
      dec(l.water_ml),
      dec(l.sleep_quality),
      dec(l.sleep_hours),
      l.physical_activity || '',
      l.food_notes || '',
      l.notes || '',
    ]),
  );

  const effects = [...data.effects].sort((a, b) => (a.occurred_on > b.occurred_on ? 1 : -1));
  section(
    lines,
    'EFEITOS PERCEBIDOS',
    ['Data', 'Descrição', 'Intensidade', 'Horário aprox.', 'Duração', 'Situação', 'Observações'],
    effects.map((e) => [
      date(e.occurred_on),
      e.name,
      e.intensity,
      e.approx_time || '',
      e.duration_text || '',
      e.status === 'presente' ? 'Presente' : 'Encerrado',
      e.notes || '',
    ]),
  );

  const appts = [...data.appointments].sort((a, b) => (a.appt_date > b.appt_date ? 1 : -1));
  section(
    lines,
    'CONSULTAS E EXAMES',
    ['Data', 'Horário', 'Tipo', 'Profissional / local', 'Observações'],
    appts.map((a) => [
      date(a.appt_date),
      a.appt_time || '',
      a.kind === 'consulta' ? 'Consulta' : 'Exame',
      [a.professional, a.location].filter(Boolean).join(' — '),
      a.notes || '',
    ]),
  );

  const rems = [...data.reminders].sort((a, b) => (a.remind_date > b.remind_date ? 1 : -1));
  section(
    lines,
    'LEMBRETES',
    ['Data', 'Horário', 'Tipo', 'Título', 'Antecedência (min)', 'Dose planejada', 'Observações'],
    rems.map((r) => [
      date(r.remind_date),
      r.remind_time || '',
      r.kind,
      r.title,
      r.lead_minutes == null ? '' : String(r.lead_minutes),
      r.planned_dose != null ? `${dec(r.planned_dose)} ${r.planned_dose_unit ?? ''}`.trim() : '',
      r.notes || '',
    ]),
  );

  const inv = [...data.inventory];
  section(
    lines,
    'MEDICAMENTO (CONTROLE)',
    ['Nome', 'Adquirido', 'Disponível', 'Compra', 'Validade', 'Lote', 'Armazenamento', 'Observações'],
    inv.map((i) => [
      i.product_name || '',
      dec(i.quantity_purchased),
      dec(i.quantity_available),
      date(i.purchase_date),
      date(i.expiry_date),
      i.lot_number || '',
      i.storage_location || '',
      i.notes || '',
    ]),
  );

  const notes = [...data.notes].sort((a, b) => (a.note_date > b.note_date ? 1 : -1));
  section(
    lines,
    'PERGUNTAS E OBSERVAÇÕES PARA O MÉDICO',
    ['Data', 'Tipo', 'Conteúdo'],
    notes.map((n) => [
      date(n.note_date),
      n.category === 'pergunta' ? 'Pergunta' : 'Observação',
      n.content,
    ]),
  );

  return lines.join('\r\n') + '\r\n';
}

export function exportCsv(data: AppData): void {
  const blob = new Blob(['\uFEFF' + buildCsv(data)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meu-mounjaro-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
