import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Button,
  Card,
  Field,
  SectionTitle,
  Tag,
  Disclaimer,
  IconPrint,
  IconDownload,
  IconPlus,
  IconTrash,
} from '../components/ui';
import { LineChart, type ChartPoint } from '../components/LineChart';
import { exportReportPdf } from '../lib/pdf';
import {
  MANDATORY_DISCLAIMER,
  addDays,
  cmToDisplay,
  fmtNum,
  formatDateShort,
  kgToDisplay,
  todayISO,
} from '../lib/helpers';
import type { ConsultationNote } from '../lib/types';

export function Report() {
  const { data, saveRow, deleteRow, session, showToast } = useApp();
  const profile = data.profile;
  const wUnit = profile?.weight_unit ?? 'kg';
  const lUnit = profile?.length_unit ?? 'cm';

  const [start, setStart] = useState(addDays(todayISO(), -30));
  const [end, setEnd] = useState(todayISO());

  const [noteText, setNoteText] = useState('');
  const [noteCat, setNoteCat] = useState<'pergunta' | 'observacao'>('pergunta');
  const [pdfBusy, setPdfBusy] = useState(false);

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      await exportReportPdf(data, start, end);
      showToast('PDF gerado — verifique seus downloads.');
    } catch {
      showToast('Não foi possível gerar o PDF. Tente novamente.', 'error');
    } finally {
      setPdfBusy(false);
    }
  };

  const inRange = (d: string) => d >= start && d <= end;

  const apps = useMemo(
    () =>
      data.applications
        .filter((a) => inRange(a.application_date))
        .sort((a, b) => (a.application_date > b.application_date ? 1 : -1)),
    [data.applications, start, end],
  );

  const measures = useMemo(
    () =>
      data.measurements
        .filter((m) => inRange(m.entry_date))
        .sort((a, b) => (a.entry_date > b.entry_date ? 1 : -1)),
    [data.measurements, start, end],
  );

  const weightPoints: ChartPoint[] = measures
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ date: m.entry_date, value: m.weight_kg ?? 0 }));

  const effects = useMemo(
    () =>
      data.effects
        .filter((e) => inRange(e.occurred_on))
        .sort((a, b) => (a.occurred_on > b.occurred_on ? 1 : -1)),
    [data.effects, start, end],
  );

  const logs = useMemo(
    () => data.logs.filter((l) => inRange(l.log_date)).sort((a, b) => (a.log_date > b.log_date ? 1 : -1)),
    [data.logs, start, end],
  );

  const avg = (vals: (number | null)[]): number | null => {
    const v = vals.filter((x): x is number => x != null);
    return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null;
  };

  const avgHunger = avg(logs.map((l) => l.hunger_level));
  const avgEnergy = avg(logs.map((l) => l.energy_level));
  const avgWater = avg(logs.map((l) => l.water_ml));
  const avgSleep = avg(logs.map((l) => l.sleep_hours));

  const firstM = measures[0];
  const lastM = measures[measures.length - 1];

  const notes = useMemo(
    () =>
      data.notes
        .filter((n) => inRange(n.note_date))
        .sort((a, b) => (a.note_date > b.note_date ? -1 : 1)),
    [data.notes, start, end],
  );

  const addNote = async () => {
    if (!noteText.trim()) {
      showToast('Escreva a pergunta ou observação antes de salvar.', 'error');
      return;
    }
    const res = await saveRow<ConsultationNote>('consultation_notes', {
      note_date: todayISO(),
      category: noteCat,
      content: noteText.trim(),
    });
    if (res.ok) setNoteText('');
  };

  const measureRow = (label: string, key: keyof typeof firstM & string, unit: 'kg' | 'lb' | 'cm' | 'in' | '%') => {
    const f = (firstM as unknown as Record<string, number | null>)?.[key];
    const l = (lastM as unknown as Record<string, number | null>)?.[key];
    const disp = (v: number | null) =>
      v == null
        ? '—'
        : fmtNum(
            unit === 'kg' || unit === 'lb'
              ? kgToDisplay(v, wUnit)
              : unit === 'cm' || unit === 'in'
                ? cmToDisplay(v, lUnit)
                : v,
            unit === '%' ? '%' : unit,
          );
    const diff = f != null && l != null ? l - f : null;
    return (
      <tr key={key}>
        <td>{label}</td>
        <td>{disp(f)}</td>
        <td>{disp(l)}</td>
        <td>
          {diff != null ? (
            <span className={diff <= 0 ? 'diff-down' : 'diff-up'}>
              {diff > 0 ? '+' : ''}
              {fmtNum(
                unit === 'kg' || unit === 'lb'
                  ? (kgToDisplay(Math.abs(diff), wUnit) ?? 0)
                  : unit === 'cm' || unit === 'in'
                    ? (cmToDisplay(Math.abs(diff), lUnit) ?? 0)
                    : Math.abs(diff),
                unit === '%' ? '%' : '',
              )}
              {diff > 0 ? ' ↑' : ' ↓'}
            </span>
          ) : (
            '—'
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="page" id="report-print">
      <div className="page-head no-print">
        <div>
          <h1>Resumo para consulta</h1>
          <p className="page-sub">Todas as informações abaixo foram informadas por você nos registros do aplicativo.</p>
        </div>
        <div className="head-actions">
          <Button variant="secondary" onClick={downloadPdf} disabled={pdfBusy}>
            <IconDownload size={18} /> {pdfBusy ? 'Gerando PDF…' : 'Baixar PDF'}
          </Button>
          <Button onClick={() => window.print()}>
            <IconPrint size={18} /> Imprimir / Exportar PDF
          </Button>
        </div>
      </div>

      <Card className="report-period no-print">
        <div className="form-grid">
          <Field label="Início do período">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Fim do período">
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="report-head print-only">
        <h1>Resumo para consulta</h1>
        <p>
          Período: {formatDateShort(start)} a {formatDateShort(end)} · Gerado em {formatDateShort(todayISO())}
        </p>
        <p className="small">Todos os dados foram informados pelo próprio usuário no diário pessoal.</p>
      </div>

      <SectionTitle>Histórico de aplicações</SectionTitle>
      <Card>
        {apps.length === 0 ? (
          <p className="muted">Nenhuma aplicação registrada neste período.</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Horário</th>
                <th>Dose (informada)</th>
                <th>Local</th>
                <th>Lote</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  <td>{formatDateShort(a.application_date)}</td>
                  <td>{a.application_time || '—'}</td>
                  <td>
                    {fmtNum(a.dose)} {a.dose_unit}
                  </td>
                  <td>
                    {[a.injection_site, a.body_side].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td>{a.lot_number || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <SectionTitle>Evolução do peso</SectionTitle>
      <Card>
        {weightPoints.length >= 2 ? (
          <LineChart points={weightPoints} unit={wUnit} height={160} />
        ) : (
          <p className="muted">Registros de peso insuficientes neste período.</p>
        )}
        {firstM?.weight_kg != null && lastM?.weight_kg != null && (
          <p>
            Peso inicial: <strong>{fmtNum(kgToDisplay(firstM.weight_kg, wUnit), wUnit)}</strong> · Peso atual:{' '}
            <strong>{fmtNum(kgToDisplay(lastM.weight_kg, wUnit), wUnit)}</strong>
          </p>
        )}
      </Card>

      <SectionTitle>Evolução das medidas</SectionTitle>
      <Card>
        {firstM && lastM ? (
          <table className="report-table">
            <thead>
              <tr>
                <th>Medida</th>
                <th>Primeiro registro</th>
                <th>Último registro</th>
                <th>Diferença</th>
              </tr>
            </thead>
            <tbody>
              {measureRow('Peso', 'weight_kg', wUnit)}
              {measureRow('Abdômen', 'abdominal_circ_cm', lUnit)}
              {measureRow('Cintura', 'waist_circ_cm', lUnit)}
              {measureRow('Quadril', 'hip_circ_cm', lUnit)}
              {measureRow('Peitoral', 'chest_circ_cm', lUnit)}
              {measureRow('Braço', 'arm_circ_cm', lUnit)}
              {measureRow('Coxa', 'thigh_circ_cm', lUnit)}
              {measureRow('Gordura corporal', 'body_fat_pct', '%')}
            </tbody>
          </table>
        ) : (
          <p className="muted">Sem registros de medidas neste período.</p>
        )}
      </Card>

      <SectionTitle>Efeitos registrados</SectionTitle>
      <Card>
        {effects.length === 0 ? (
          <p className="muted">Nenhum efeito registrado neste período.</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição (informada)</th>
                <th>Intensidade</th>
                <th>Horário aprox.</th>
                <th>Duração</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {effects.map((e) => (
                <tr key={e.id}>
                  <td>{formatDateShort(e.occurred_on)}</td>
                  <td>{e.name}</td>
                  <td>{e.intensity}</td>
                  <td>{e.approx_time || '—'}</td>
                  <td>{e.duration_text || '—'}</td>
                  <td>{e.status === 'presente' ? 'Presente' : 'Encerrado'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted small">
          Os nomes e intensidades refletem o que você registrou. O aplicativo não diagnostica
          efeitos nem afirma que tenham sido causados pelo medicamento.
        </p>
      </Card>

      <SectionTitle>Sono, fome, energia e hidratação</SectionTitle>
      <Card>
        {logs.length === 0 ? (
          <p className="muted">Nenhum registro diário neste período.</p>
        ) : (
          <>
            <div className="report-averages">
              <div><span>Média de fome (1–5)</span><strong>{avgHunger ?? '—'}</strong></div>
              <div><span>Média de energia (1–5)</span><strong>{avgEnergy ?? '—'}</strong></div>
              <div><span>Média de água/dia</span><strong>{avgWater != null ? `${fmtNum(avgWater, 'ml')}` : '—'}</strong></div>
              <div><span>Média de sono</span><strong>{avgSleep != null ? `${fmtNum(avgSleep, 'h')}` : '—'}</strong></div>
              <div><span>Registros diários</span><strong>{logs.length}</strong></div>
            </div>
            <table className="report-table mt">
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Fome</th>
                  <th>Saciedade</th>
                  <th>Energia</th>
                  <th>Humor</th>
                  <th>Água</th>
                  <th>Sono</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td>{formatDateShort(l.log_date)}</td>
                    <td>{l.hunger_level ?? '—'}</td>
                    <td>{l.satiety_level ?? '—'}</td>
                    <td>{l.energy_level ?? '—'}</td>
                    <td>{l.mood_level ?? '—'}</td>
                    <td>{l.water_ml != null ? `${fmtNum(l.water_ml, 'ml')}` : '—'}</td>
                    <td>{l.sleep_hours != null ? `${fmtNum(l.sleep_hours, 'h')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>

      <SectionTitle>Perguntas e observações para o médico</SectionTitle>
      <Card>
        {notes.length === 0 ? (
          <p className="muted">Nenhuma anotação neste período.</p>
        ) : (
          <ul className="note-list">
            {notes.map((n) => (
              <li key={n.id} className="no-print">
                <Tag tone={n.category === 'pergunta' ? 'info' : 'neutral'}>
                  {n.category === 'pergunta' ? 'Pergunta' : 'Observação'}
                </Tag>
                <div className="note-body">
                  <strong>{n.content}</strong>
                  <span className="muted small">{formatDateShort(n.note_date)}</span>
                </div>
                <button
                  className="icon-btn danger"
                  onClick={() => deleteRow('consultation_notes', n.id)}
                  aria-label="Excluir"
                >
                  <IconTrash size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="note-form no-print">
          <div className="form-grid">
            <Field label="Tipo">
              <select value={noteCat} onChange={(e) => setNoteCat(e.target.value as 'pergunta' | 'observacao')}>
                <option value="pergunta">Pergunta</option>
                <option value="observacao">Observação</option>
              </select>
            </Field>
          </div>
          <Field label="Nova anotação">
            <textarea rows={2} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Ex.: perguntar sobre…" />
          </Field>
          <Button variant="secondary" onClick={addNote}>
            <IconPlus size={16} /> Adicionar anotação
          </Button>
        </div>
        {notes.length > 0 && (
          <div className="print-only">
            <ul>
              {notes.map((n) => (
                <li key={`p-${n.id}`}>
                  [{n.category === 'pergunta' ? 'Pergunta' : 'Observação'} · {formatDateShort(n.note_date)}] {n.content}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Disclaimer variant="warn">{MANDATORY_DISCLAIMER}</Disclaimer>
      <p className="muted small center no-print">
        Relatório gerado por {session?.user.email || 'usuário'} — dados informados pelo próprio
        usuário.
      </p>
    </div>
  );
}
