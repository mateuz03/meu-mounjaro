// Geração do "Resumo para consulta" em PDF formatado.
// jsPDF carregado sob demanda (import dinâmico) para não pesar o app.

import type { AppData } from './types';
import {
  MANDATORY_DISCLAIMER,
  cmToDisplay,
  fmtNum,
  formatDateShort,
  kgToDisplay,
  todayISO,
} from './helpers';

type Rgb = [number, number, number];
const NAVY: Rgb = [15, 43, 70];
const TEAL: Rgb = [13, 148, 136];
const SOFT: Rgb = [100, 116, 139];

export async function exportReportPdf(data: AppData, start: string, end: string): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const profile = data.profile;
  const wUnit = profile?.weight_unit ?? 'kg';
  const lUnit = profile?.length_unit ?? 'cm';

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentTop = 26;

  const inRange = (d: string) => d >= start && d <= end;

  let y = contentTop + 4;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 30) {
      doc.addPage();
      y = contentTop + 4;
    }
  };

  const sectionTitle = (t: string) => {
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...NAVY);
    doc.text(t, margin, y);
    y += 2;
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 22, y);
    y += 4;
  };

  const mutedLine = (t: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...SOFT);
    const lines = doc.splitTextToSize(t, pageW - margin * 2);
    ensureSpace(lines.length * 4 + 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 3;
  };

  const runTable = (head: string[], body: (string | number)[][]) => {
    if (body.length === 0) {
      mutedLine('Nenhum registro neste período.');
      return;
    }
    ensureSpace(14);
    autoTable(doc, {
      head: [head],
      body,
      startY: y,
      margin: { top: contentTop, bottom: 28, left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 1.6, overflow: 'linebreak' },
      headStyles: { fillColor: TEAL, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 250, 249] },
      theme: 'grid',
    });
    const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    y = (last?.finalY ?? y) + 8;
  };

  // ---- Informações do usuário ----
  const name = profile?.full_name || '';
  if (name) mutedLine(`Usuário: ${name}`);
  mutedLine('Todos os dados abaixo foram informados pelo próprio usuário no diário pessoal.');

  // ---- Aplicações ----
  sectionTitle('Histórico de aplicações');
  const apps = data.applications
    .filter((a) => inRange(a.application_date))
    .sort((a, b) => (a.application_date > b.application_date ? 1 : -1));
  runTable(
    ['Data', 'Horário', 'Dose (informada)', 'Local', 'Lote'],
    apps.map((a) => [
      formatDateShort(a.application_date),
      a.application_time || '—',
      `${fmtNum(a.dose)} ${a.dose_unit}`,
      [a.injection_site, a.body_side].filter(Boolean).join(' · ') || '—',
      a.lot_number || '—',
    ]),
  );

  // ---- Peso e medidas ----
  sectionTitle('Evolução do peso e das medidas');
  const measures = data.measurements
    .filter((m) => inRange(m.entry_date) && m.weight_kg != null)
    .sort((a, b) => (a.entry_date > b.entry_date ? 1 : -1));
  if (measures.length >= 2) {
    const first = measures[0];
    const last = measures[measures.length - 1];
    mutedLine(
      `Peso inicial: ${fmtNum(kgToDisplay(first.weight_kg, wUnit), wUnit)} (${formatDateShort(
        first.entry_date,
      )}) · Peso atual: ${fmtNum(kgToDisplay(last.weight_kg, wUnit), wUnit)} (${formatDateShort(
        last.entry_date,
      )})`,
    );
  } else if (measures.length === 1) {
    mutedLine(`Único registro de peso no período: ${fmtNum(kgToDisplay(measures[0].weight_kg, wUnit), wUnit)}`);
  }

  const mFirst = data.measurements
    .filter((m) => inRange(m.entry_date))
    .sort((a, b) => (a.entry_date > b.entry_date ? 1 : -1))[0];
  const mLast = data.measurements
    .filter((m) => inRange(m.entry_date))
    .sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1))[0];

  const measureRow = (label: string, key: string, kind: 'w' | 'l' | 'p'): (string | number)[] => {
    const f = (mFirst as unknown as Record<string, number | null>)?.[key];
    const l = (mLast as unknown as Record<string, number | null>)?.[key];
    const unit = kind === 'w' ? wUnit : kind === 'l' ? lUnit : '%';
    const disp = (v: number | null) =>
      v == null
        ? '—'
        : fmtNum(
            kind === 'w'
              ? kgToDisplay(v, wUnit)
              : kind === 'l'
                ? cmToDisplay(v, lUnit)
                : v,
            unit,
          );
    const diff = f != null && l != null ? l - f : null;
    const diffStr =
      diff == null
        ? '—'
        : `${diff > 0 ? '+' : ''}${fmtNum(
            kind === 'w'
              ? (kgToDisplay(Math.abs(diff), wUnit) ?? 0)
              : kind === 'l'
                ? (cmToDisplay(Math.abs(diff), lUnit) ?? 0)
                : Math.abs(diff),
            '',
          )}`;
    return [label, disp(f), disp(l), diffStr];
  };

  if (mFirst && mLast) {
    runTable(
      ['Medida', 'Primeiro registro', 'Último registro', 'Diferença'],
      [
        measureRow('Peso', 'weight_kg', 'w'),
        measureRow('Abdômen', 'abdominal_circ_cm', 'l'),
        measureRow('Cintura', 'waist_circ_cm', 'l'),
        measureRow('Quadril', 'hip_circ_cm', 'l'),
        measureRow('Peitoral', 'chest_circ_cm', 'l'),
        measureRow('Braço', 'arm_circ_cm', 'l'),
        measureRow('Coxa', 'thigh_circ_cm', 'l'),
        measureRow('Gordura corporal', 'body_fat_pct', 'p'),
      ],
    );
  } else {
    mutedLine('Registros de medidas insuficientes neste período.');
  }

  // ---- Efeitos ----
  sectionTitle('Efeitos registrados');
  const effects = data.effects
    .filter((e) => inRange(e.occurred_on))
    .sort((a, b) => (a.occurred_on > b.occurred_on ? 1 : -1));
  runTable(
    ['Data', 'Descrição (informada)', 'Intensidade', 'Horário aprox.', 'Duração', 'Situação'],
    effects.map((e) => [
      formatDateShort(e.occurred_on),
      e.name,
      e.intensity,
      e.approx_time || '—',
      e.duration_text || '—',
      e.status === 'presente' ? 'Presente' : 'Encerrado',
    ]),
  );
  if (effects.length > 0) {
    mutedLine(
      'Descrições e intensidades refletem o que o usuário registrou. O aplicativo não diagnostica efeitos nem afirma que tenham sido causados pelo medicamento.',
    );
  }

  // ---- Diário ----
  sectionTitle('Registros diários (sono, fome, energia e hidratação)');
  const logs = data.logs
    .filter((l) => inRange(l.log_date))
    .sort((a, b) => (a.log_date > b.log_date ? 1 : -1));
  const avg = (vals: (number | null)[]): string => {
    const v = vals.filter((x): x is number => x != null);
    return v.length ? fmtNum(v.reduce((s, x) => s + x, 0) / v.length) : '—';
  };
  if (logs.length > 0) {
    mutedLine(
      `Médias do período — fome: ${avg(logs.map((l) => l.hunger_level))} · energia: ${avg(
        logs.map((l) => l.energy_level),
      )} · água/dia: ${avg(logs.map((l) => l.water_ml))} ml · sono: ${avg(
        logs.map((l) => l.sleep_hours),
      )} h · ${logs.length} registro(s) diário(s).`,
    );
  }
  runTable(
    ['Dia', 'Fome', 'Saciedade', 'Energia', 'Humor', 'Água', 'Sono'],
    logs.map((l) => [
      formatDateShort(l.log_date),
      l.hunger_level ?? '—',
      l.satiety_level ?? '—',
      l.energy_level ?? '—',
      l.mood_level ?? '—',
      l.water_ml != null ? `${fmtNum(l.water_ml)} ml` : '—',
      l.sleep_hours != null ? `${fmtNum(l.sleep_hours)} h` : '—',
    ]),
  );

  // ---- Perguntas e observações ----
  sectionTitle('Perguntas e observações para o médico');
  const notes = data.notes
    .filter((n) => inRange(n.note_date))
    .sort((a, b) => (a.note_date > b.note_date ? 1 : -1));
  runTable(
    ['Data', 'Tipo', 'Conteúdo'],
    notes.map((n) => [
      formatDateShort(n.note_date),
      n.category === 'pergunta' ? 'Pergunta' : 'Observação',
      n.content,
    ]),
  );

  // ---- Cabeçalho e rodapé em todas as páginas ----
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(...TEAL);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Resumo para consulta', margin, 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Período: ${formatDateShort(start)} a ${formatDateShort(end)}`, margin, 15.5);
    doc.text(`Página ${i} de ${total}`, pageW - margin, 15.5, { align: 'right' });

    doc.setFontSize(6.6);
    doc.setTextColor(...SOFT);
    const foot = doc.splitTextToSize(MANDATORY_DISCLAIMER, pageW - margin * 2);
    doc.text(foot, margin, pageH - 14 - (foot.length - 1) * 3);
    doc.setFontSize(6.6);
    doc.text(
      `Gerado em ${formatDateShort(todayISO())} pelo diário pessoal Meu Mounjaro — dados informados pelo próprio usuário.`,
      margin,
      pageH - 6,
    );
  }

  doc.save(`meu-mounjaro-resumo-${start}_a_${end}.pdf`);
}
