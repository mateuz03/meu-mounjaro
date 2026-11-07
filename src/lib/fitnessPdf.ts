// Geração do PDF do acompanhamento fitness (apenas dados fitness).
// jsPDF carregado sob demanda (import dinâmico) para não pesar o app.

import type { AppData } from './types';
import { fmtNum, formatDateShort, kgToDisplay, todayISO } from './helpers';

type Rgb = [number, number, number];
const NAVY: Rgb = [15, 43, 70];
const GREEN: Rgb = [101, 163, 13];
const SOFT: Rgb = [100, 116, 139];

const SPORT_LABELS: Record<string, string> = {
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

const EFFORT_LABELS = ['Muito leve', 'Leve', 'Moderado', 'Intenso', 'Muito intenso'];
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export async function exportFitnessPdf(data: AppData, start: string, end: string): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const wUnit = data.profile?.weight_unit ?? 'kg';
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
    doc.setDrawColor(...GREEN);
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
      headStyles: { fillColor: GREEN, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [246, 250, 242] },
      theme: 'grid',
    });
    const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    y = (last?.finalY ?? y) + 8;
  };

  const name = data.profile?.full_name || '';
  if (name) mutedLine(`Usuário: ${name}`);
  mutedLine('Todos os dados abaixo foram informados pelo próprio usuário no acompanhamento fitness.');

  // ---- Treinos de academia ----
  sectionTitle('Treinos de academia');
  const workouts = data.gym_workouts
    .filter((w) => inRange(w.workout_date))
    .sort((a, b) => (a.workout_date > b.workout_date ? 1 : -1));
  const entriesBy = new Map<string, typeof data.gym_exercise_entries>();
  for (const e of data.gym_exercise_entries) {
    const list = entriesBy.get(e.workout_id) || [];
    list.push(e);
    entriesBy.set(e.workout_id, list);
  }
  if (workouts.length === 0) {
    mutedLine('Nenhum treino registrado neste período.');
  } else {
    const body: (string | number)[][] = [];
    for (const w of workouts) {
      const entries = (entriesBy.get(w.id) || []).sort((a, b) => a.sort_order - b.sort_order);
      if (entries.length === 0) {
        body.push([formatDateShort(w.workout_date), w.title, '—', '—', '—', '—']);
      } else {
        entries.forEach((e, i) => {
          body.push([
            i === 0 ? formatDateShort(w.workout_date) : '',
            i === 0 ? w.title : '',
            e.exercise_name,
            e.sets ?? '—',
            e.reps ?? '—',
            e.weight_kg != null ? `${fmtNum(e.weight_kg)} kg` : '—',
          ]);
        });
      }
    }
    runTable(['Data', 'Treino', 'Exercício', 'Séries', 'Reps', 'Carga'], body);
  }

  // ---- Atividades esportivas ----
  sectionTitle('Atividades esportivas');
  const sports = data.sport_activities
    .filter((a) => inRange(a.activity_date))
    .sort((a, b) => (a.activity_date > b.activity_date ? 1 : -1));
  runTable(
    ['Data', 'Atividade', 'Duração', 'Distância', 'Esforço percebido'],
    sports.map((a) => [
      formatDateShort(a.activity_date),
      SPORT_LABELS[a.sport_type] || a.sport_type,
      a.duration_minutes != null ? `${a.duration_minutes} min` : '—',
      a.distance_km != null ? `${fmtNum(a.distance_km)} km` : '—',
      a.perceived_effort != null ? EFFORT_LABELS[a.perceived_effort - 1] : '—',
    ]),
  );
  if (sports.length > 0) {
    mutedLine(
      'O esforço percebido reflete a avaliação do próprio usuário para cada atividade — o aplicativo não mede nem classifica condicionamento físico.',
    );
  }

  // ---- Rotina semanal atual ----
  sectionTitle('Rotina semanal planejada (atual)');
  const routine = [...data.fitness_routine_items].sort(
    (a, b) => a.weekday - b.weekday || a.sort_order - b.sort_order,
  );
  runTable(
    ['Dia', 'Tipo', 'Item', 'Exercício', 'Séries x Reps', 'Carga-alvo'],
    routine.map((it) => [
      WEEKDAYS[it.weekday],
      it.kind === 'academia' ? 'Academia' : 'Esporte',
      it.title,
      it.exercise_name || '—',
      it.sets != null || it.reps != null ? `${it.sets ?? '—'} x ${it.reps ?? '—'}` : '—',
      it.target_weight_kg != null ? `${fmtNum(it.target_weight_kg)} kg` : '—',
    ]),
  );

  // ---- Peso (unificado: Mounjaro + Fitness) ----
  sectionTitle('Evolução do peso');
  const weights = data.measurements
    .filter((m) => m.weight_kg != null && inRange(m.entry_date))
    .sort((a, b) => (a.entry_date > b.entry_date ? 1 : -1));
  if (weights.length >= 2) {
    const first = weights[0];
    const last = weights[weights.length - 1];
    const delta =
      (kgToDisplay(last.weight_kg, wUnit) ?? 0) - (kgToDisplay(first.weight_kg, wUnit) ?? 0);
    mutedLine(
      `Primeiro registro: ${fmtNum(kgToDisplay(first.weight_kg, wUnit), wUnit)} (${formatDateShort(
        first.entry_date,
      )}) · Último: ${fmtNum(kgToDisplay(last.weight_kg, wUnit), wUnit)} (${formatDateShort(
        last.entry_date,
      )}) · Variação do período: ${delta > 0 ? '+' : delta < 0 ? '−' : ''}${fmtNum(Math.abs(delta))} ${wUnit}`,
    );
  }
  runTable(
    ['Data', `Peso (${wUnit})`, 'Observações'],
    weights.map((l) => [
      formatDateShort(l.entry_date),
      fmtNum(kgToDisplay(l.weight_kg, wUnit)),
      l.notes || '—',
    ]),
  );

  // ---- Cabeçalho e rodapé ----
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Resumo fitness', margin, 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Período: ${formatDateShort(start)} a ${formatDateShort(end)}`, margin, 15.5);
    doc.text(`Página ${i} de ${total}`, pageW - margin, 15.5, { align: 'right' });

    doc.setFontSize(6.8);
    doc.setTextColor(...SOFT);
    const foot = doc.splitTextToSize(
      'Este documento registra informações informadas pelo próprio usuário e não oferece orientação de treino, diagnóstico ou prescrição. Consulte um profissional de educação física.',
      pageW - margin * 2,
    );
    doc.text(foot, margin, pageH - 14 - (foot.length - 1) * 3);
    doc.text(
      `Gerado em ${formatDateShort(todayISO())} pelo acompanhamento fitness — dados informados pelo próprio usuário.`,
      margin,
      pageH - 6,
    );
  }

  doc.save(`meu-fitness-resumo-${start}_a_${end}.pdf`);
}
