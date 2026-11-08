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
  IconScale,
  IconEdit,
  IconTrash,
} from '../components/ui';
import { LineChart, type ChartPoint } from '../components/LineChart';
import { Photo } from '../components/Photo';
import {
  addDays,
  cmToDisplay,
  displayToCm,
  displayToKg,
  fmtNum,
  formatDateShort,
  kgToDisplay,
  todayISO,
} from '../lib/helpers';
import { uploadPhoto, deletePhoto } from '../lib/storage';
import type { BodyMeasurement } from '../lib/types';

const METRICS = [
  { key: 'weight_kg', label: 'Peso', kind: 'weight' },
  { key: 'abdominal_circ_cm', label: 'Abdômen', kind: 'length' },
  { key: 'waist_circ_cm', label: 'Cintura', kind: 'length' },
  { key: 'hip_circ_cm', label: 'Quadril', kind: 'length' },
  { key: 'chest_circ_cm', label: 'Peitoral', kind: 'length' },
  { key: 'arm_circ_cm', label: 'Braço', kind: 'length' },
  { key: 'thigh_circ_cm', label: 'Coxa', kind: 'length' },
  { key: 'body_fat_pct', label: 'Gordura (%)', kind: 'pct' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];

const PERIODS = [
  { key: '7d', label: '7 dias', days: 7 },
  { key: '30d', label: '30 dias', days: 30 },
  { key: '3m', label: '3 meses', days: 90 },
  { key: '6m', label: '6 meses', days: 180 },
  { key: 'all', label: 'Completo', days: 0 },
] as const;

interface FormState {
  id?: string;
  entry_date: string;
  weight: string;
  abdominal: string;
  waist: string;
  hip: string;
  chest: string;
  arm: string;
  thigh: string;
  body_fat: string;
  photo_url: string | null;
  notes: string;
}

const emptyForm = (): FormState => ({
  entry_date: todayISO(),
  weight: '',
  abdominal: '',
  waist: '',
  hip: '',
  chest: '',
  arm: '',
  thigh: '',
  body_fat: '',
  photo_url: null,
  notes: '',
});

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 640;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('imagem inválida'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('leitura'));
    reader.readAsDataURL(file);
  });
}

export function Evolution() {
  const { data, saveRow, deleteRow, updateProfile, action, setAction, showToast, session } = useApp();
  const profile = data.profile;
  const wUnit = profile?.weight_unit ?? 'kg';
  const lUnit = profile?.length_unit ?? 'cm';

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<BodyMeasurement | null>(null);

  const [metric, setMetric] = useState<MetricKey>('weight_kg');
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('30d');

  const [goalOpen, setGoalOpen] = useState(false);
  const [goalValue, setGoalValue] = useState('');

  useEffect(() => {
    if (action === 'new-weight') {
      setForm(emptyForm());
      setFormOpen(true);
      setAction(null);
    }
  }, [action, setAction]);

  const sorted = useMemo(
    () =>
      [...data.measurements].sort((a, b) => (a.entry_date > b.entry_date ? 1 : -1)),
    [data.measurements],
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const weightPoints: ChartPoint[] = useMemo(
    () => sorted.filter((m) => m.weight_kg != null).map((m) => ({ date: m.entry_date, value: m.weight_kg ?? 0 })),
    [sorted],
  );

  const photoEntries = useMemo(
    () => sorted.filter((m) => m.photo_url),
    [sorted],
  );
  const [beforeDate, setBeforeDate] = useState<string | null>(null);
  const [afterDate, setAfterDate] = useState<string | null>(null);

  useEffect(() => {
    if (photoEntries.length >= 2) {
      const firstP = photoEntries[0].entry_date;
      const lastP = photoEntries[photoEntries.length - 1].entry_date;
      setBeforeDate((cur) => (cur && photoEntries.some((p) => p.entry_date === cur) ? cur : firstP));
      setAfterDate((cur) => (cur && photoEntries.some((p) => p.entry_date === cur) ? cur : lastP));
    }
  }, [photoEntries]);

  const beforePhoto = photoEntries.find((p) => p.entry_date === beforeDate);
  const afterPhoto = photoEntries.find((p) => p.entry_date === afterDate);
  const photoDelta =
    beforePhoto?.weight_kg != null && afterPhoto?.weight_kg != null
      ? (afterPhoto.weight_kg ?? 0) - (beforePhoto.weight_kg ?? 0)
      : null;

  const metricDef = METRICS.find((m) => m.key === metric)!;
  const metricPoints: ChartPoint[] = useMemo(() => {
    return sorted
      .filter((m) => (m as unknown as Record<string, number | null>)[metric] != null)
      .map((m) => ({
        date: m.entry_date,
        value: (m as unknown as Record<string, number | null>)[metric] as number,
      }));
  }, [sorted, metric]);

  const inPeriod = (pts: ChartPoint[]) => {
    const p = PERIODS.find((x) => x.key === period)!;
    if (p.days === 0) return pts;
    const cutoff = addDays(todayISO(), -p.days);
    return pts.filter((pt) => pt.date >= cutoff);
  };

  const chartPoints = metric === 'weight_kg' ? inPeriod(weightPoints) : inPeriod(metricPoints);

  const chartUnit =
    metricDef.kind === 'weight' ? wUnit : metricDef.kind === 'length' ? lUnit : '%';

  const toDisp = (v: number): number => {
    if (metricDef.kind === 'weight') return kgToDisplay(v, wUnit) ?? v;
    if (metricDef.kind === 'length') return cmToDisplay(v, lUnit) ?? v;
    return v;
  };

  const dispPoints = chartPoints.map((p) => ({ ...p, value: toDisp(p.value) }));

  const goalKg = profile?.goal_weight_kg ?? null;
  const goalDisp = goalKg != null ? kgToDisplay(goalKg, wUnit) : null;

  const diffWeight =
    first?.weight_kg != null && last?.weight_kg != null ? (last.weight_kg ?? 0) - (first.weight_kg ?? 0) : null;

  const measurementDiff = (key: MetricKey): number | null => {
    const firstV = (first as unknown as Record<string, number | null>)?.[key];
    const lastV = (last as unknown as Record<string, number | null>)?.[key];
    if (firstV == null || lastV == null) return null;
    return lastV - firstV;
  };

  const openEdit = (m: BodyMeasurement) => {
    setForm({
      id: m.id,
      entry_date: m.entry_date,
      weight: m.weight_kg != null ? String(kgToDisplay(m.weight_kg, wUnit)) : '',
      abdominal: m.abdominal_circ_cm != null ? String(cmToDisplay(m.abdominal_circ_cm, lUnit)) : '',
      waist: m.waist_circ_cm != null ? String(cmToDisplay(m.waist_circ_cm, lUnit)) : '',
      hip: m.hip_circ_cm != null ? String(cmToDisplay(m.hip_circ_cm, lUnit)) : '',
      chest: m.chest_circ_cm != null ? String(cmToDisplay(m.chest_circ_cm, lUnit)) : '',
      arm: m.arm_circ_cm != null ? String(cmToDisplay(m.arm_circ_cm, lUnit)) : '',
      thigh: m.thigh_circ_cm != null ? String(cmToDisplay(m.thigh_circ_cm, lUnit)) : '',
      body_fat: m.body_fat_pct != null ? String(m.body_fat_pct) : '',
      photo_url: m.photo_url,
      notes: m.notes || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.entry_date) {
      setFormError('Informe a data do registro.');
      return;
    }
    const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
    const weight = num(form.weight);
    if (weight != null && (Number.isNaN(weight) || weight <= 0)) {
      setFormError('Peso inválido.');
      return;
    }
    if (
      weight == null &&
      !form.abdominal && !form.waist && !form.hip && !form.chest && !form.arm && !form.thigh && !form.body_fat
    ) {
      setFormError('Preencha ao menos um valor (peso ou uma medida).');
      return;
    }
    setSaving(true);
    const res = await saveRow<BodyMeasurement>('body_measurements', {
      id: form.id,
      entry_date: form.entry_date,
      weight_kg: displayToKg(weight, wUnit),
      abdominal_circ_cm: displayToCm(num(form.abdominal), lUnit),
      waist_circ_cm: displayToCm(num(form.waist), lUnit),
      hip_circ_cm: displayToCm(num(form.hip), lUnit),
      chest_circ_cm: displayToCm(num(form.chest), lUnit),
      arm_circ_cm: displayToCm(num(form.arm), lUnit),
      thigh_circ_cm: displayToCm(num(form.thigh), lUnit),
      body_fat_pct: num(form.body_fat),
      photo_url: form.photo_url,
      notes: form.notes || null,
    });
    setSaving(false);
    if (res.ok) setFormOpen(false);
  };

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast('Foto muito grande. Escolha uma imagem de até 8 MB.', 'error');
      return;
    }
    const uid = session?.user?.id;
    if (uid) {
      // Novo fluxo: foto vai para o bucket privado do Storage; o banco guarda
      // apenas o caminho. Se o upload falhar, cai no fluxo legado (base64).
      const up = await uploadPhoto(uid, `evolution/${form.id ?? Date.now()}`, file);
      if (up.ok && up.path) {
        setForm((f) => ({ ...f, photo_url: up.path! }));
        return;
      }
    }
    try {
      const dataUrl = await compressImage(file);
      setForm((f) => ({ ...f, photo_url: dataUrl }));
    } catch {
      showToast('Não foi possível processar a imagem.', 'error');
    }
  };

  const saveGoal = async () => {
    const v = goalValue.trim() === '' ? null : Number(goalValue.replace(',', '.'));
    const res = await updateProfile({ goal_weight_kg: v == null || Number.isNaN(v) ? null : displayToKg(v, wUnit) });
    if (res.ok) setGoalOpen(false);
  };

  const metricList: { key: MetricKey; label: string; value: number | null; diff: number | null; unit: string }[] =
    METRICS.map((m) => {
      const lastV = (last as unknown as Record<string, number | null>)?.[m.key] ?? null;
      return {
        key: m.key,
        label: m.label,
        value: lastV != null ? toDisp(lastV) : null,
        diff: measurementDiff(m.key),
        unit: m.kind === 'weight' ? wUnit : m.kind === 'length' ? lUnit : '%',
      };
    });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Evolução corporal</h1>
          <p className="page-sub">Registros informados por você. O app apenas exibe a evolução dos dados.</p>
        </div>
        <div className="head-actions">
          <Button variant="secondary" onClick={() => { setGoalValue(goalDisp != null ? String(goalDisp) : ''); setGoalOpen(true); }}>
            Meta pessoal
          </Button>
          <Button onClick={() => { setForm(emptyForm()); setFormOpen(true); }}>
            <IconPlus size={18} /> Registrar medidas
          </Button>
        </div>
      </div>

      <div className="grid grid-3">
        <Card className="center-card">
          <span className="stat-label">Peso inicial</span>
          <div className="stat-big sm">{first?.weight_kg != null ? fmtNum(kgToDisplay(first.weight_kg, wUnit), wUnit) : '—'}</div>
        </Card>
        <Card className="center-card">
          <span className="stat-label">Peso atual</span>
          <div className="stat-big sm">{last?.weight_kg != null ? fmtNum(kgToDisplay(last.weight_kg, wUnit), wUnit) : '—'}</div>
        </Card>
        <Card className="center-card">
          <span className="stat-label">Diferença total</span>
          <div className="stat-big sm">
            {diffWeight != null ? (
              <Tag tone={diffWeight <= 0 ? 'good' : 'warn'}>
                {diffWeight > 0 ? '+' : ''}
                {fmtNum(kgToDisplay(Math.abs(diffWeight), wUnit), wUnit)}
                {diffWeight > 0 ? '' : ' ↓'}
              </Tag>
            ) : (
              '—'
            )}
          </div>
        </Card>
      </div>

      <SectionTitle>Gráfico por período</SectionTitle>
      <Card>
        <div className="chip-row">
          {METRICS.map((m) => (
            <button key={m.key} className={`chip ${metric === m.key ? 'chip-active' : ''}`} onClick={() => setMetric(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="chip-row">
          {PERIODS.map((p) => (
            <button key={p.key} className={`chip ${period === p.key ? 'chip-active' : ''}`} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        {dispPoints.length >= 2 ? (
          <LineChart
            points={dispPoints}
            unit={chartUnit}
            color={metric === 'weight_kg' ? '#0d9488' : '#3b82f6'}
            goal={metric === 'weight_kg' ? goalDisp : null}
          />
        ) : (
          <EmptyState
            icon={<IconScale />}
            title="Dados insuficientes"
            message="Registre mais medidas para visualizar a evolução neste período e métrica."
          />
        )}
      </Card>

      <SectionTitle>Comparação entre medidas</SectionTitle>
      <Card>
        {last ? (
          <div className="measure-grid">
            {metricList.map((m) => (
              <div key={m.key} className="measure-cell">
                <span className="measure-label">{m.label}</span>
                <strong>{m.value != null ? fmtNum(m.value, m.unit) : '—'}</strong>
                {m.diff != null && (
                  <span className={`measure-diff ${m.diff <= 0 ? 'down' : 'up'}`}>
                    {m.diff > 0 ? '+' : ''}
                    {fmtNum(
                      metricList.find((x) => x.key === m.key)!.unit === 'kg'
                        ? (kgToDisplay(Math.abs(m.diff), wUnit) ?? 0)
                        : metricList.find((x) => x.key === m.key)!.unit === 'in'
                          ? (cmToDisplay(Math.abs(m.diff), 'in') ?? 0)
                          : Math.abs(m.diff),
                      '',
                    )}
                    {m.diff > 0 ? ' ↑' : ' ↓'}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Sem registros ainda.</p>
        )}
      </Card>

      <SectionTitle>Comparação de fotos</SectionTitle>
      <Card>
        {photoEntries.length === 0 ? (
          <p className="muted">
            Nenhuma foto de evolução ainda. Ao registrar medidas, você pode anexar uma foto
            opcional — com dois ou mais registros, a comparação lado a lado aparece aqui, somente
            para você.
          </p>
        ) : photoEntries.length === 1 ? (
          <p className="muted">
            Você tem 1 foto de evolução ({formatDateShort(photoEntries[0].entry_date)}). Registre
            outra foto em uma data diferente para ativar a comparação antes/depois.
          </p>
        ) : (
          <>
            <div className="form-grid">
              <Field label="Antes">
                <select value={beforeDate ?? ''} onChange={(e) => setBeforeDate(e.target.value)}>
                  {photoEntries.map((p) => (
                    <option key={p.id} value={p.entry_date}>
                      {formatDateShort(p.entry_date)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Depois">
                <select value={afterDate ?? ''} onChange={(e) => setAfterDate(e.target.value)}>
                  {photoEntries.map((p) => (
                    <option key={p.id} value={p.entry_date}>
                      {formatDateShort(p.entry_date)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {beforePhoto && afterPhoto && (
              <div className="photo-compare">
                <figure className="compare-cell">
                  <Photo value={beforePhoto.photo_url} alt={`Foto de ${formatDateShort(beforePhoto.entry_date)}`} />
                  <figcaption>
                    <span className="compare-tag">Antes</span>
                    <strong>{formatDateShort(beforePhoto.entry_date)}</strong>
                    {beforePhoto.weight_kg != null && (
                      <span className="muted small">{fmtNum(kgToDisplay(beforePhoto.weight_kg, wUnit), wUnit)}</span>
                    )}
                  </figcaption>
                </figure>
                <figure className="compare-cell">
                  <Photo value={afterPhoto.photo_url} alt={`Foto de ${formatDateShort(afterPhoto.entry_date)}`} />
                  <figcaption>
                    <span className="compare-tag after">Depois</span>
                    <strong>{formatDateShort(afterPhoto.entry_date)}</strong>
                    {afterPhoto.weight_kg != null && (
                      <span className="muted small">{fmtNum(kgToDisplay(afterPhoto.weight_kg, wUnit), wUnit)}</span>
                    )}
                  </figcaption>
                </figure>
              </div>
            )}
            {photoDelta != null && (
              <p className="center small">
                Diferença de peso entre as duas fotos:{' '}
                <strong className={photoDelta <= 0 ? 'diff-down' : 'diff-up'}>
                  {photoDelta > 0 ? '+' : ''}
                  {fmtNum(kgToDisplay(Math.abs(photoDelta), wUnit), wUnit)}
                  {photoDelta > 0 ? ' ↑' : ' ↓'}
                </strong>
                <span className="muted"> · exibida apenas como dado registrado por você.</span>
              </p>
            )}
          </>
        )}
      </Card>

      <SectionTitle
        action={
          <Button variant="ghost" onClick={() => { setForm(emptyForm()); setFormOpen(true); }}>
            <IconPlus size={16} /> Novo
          </Button>
        }
      >
        Histórico de registros
      </SectionTitle>
      {sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconScale />}
            title="Nenhuma medida registrada"
            message="Registre seu peso periodicamente — sempre no mesmo horário, se possível. O gráfico aparece conforme você acumula registros."
            action={
              <Button onClick={() => { setForm(emptyForm()); setFormOpen(true); }}>
                <IconPlus size={18} /> Registrar primeiro peso
              </Button>
            }
          />
        </Card>
      ) : (
        [...sorted].reverse().map((m) => (
          <Card key={m.id} className="measure-row">
            <div className="measure-date">{formatDateShort(m.entry_date)}</div>
            <div className="measure-body">
              {m.weight_kg != null && <strong>{fmtNum(kgToDisplay(m.weight_kg, wUnit), wUnit)}</strong>}
              <span className="muted small">
                {[
                  m.waist_circ_cm != null && `Cintura ${fmtNum(cmToDisplay(m.waist_circ_cm, lUnit), lUnit)}`,
                  m.abdominal_circ_cm != null && `Abdômen ${fmtNum(cmToDisplay(m.abdominal_circ_cm, lUnit), lUnit)}`,
                  m.hip_circ_cm != null && `Quadril ${fmtNum(cmToDisplay(m.hip_circ_cm, lUnit), lUnit)}`,
                  m.body_fat_pct != null && `Gordura ${fmtNum(m.body_fat_pct, '%')}`,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Sem medidas detalhadas'}
              </span>
              {m.notes && <span className="muted small">{m.notes}</span>}
              {m.photo_url && <Photo value={m.photo_url} alt="Foto de evolução" className="evo-photo" />}
            </div>
            <div className="tl-actions">
              <button className="icon-btn" onClick={() => openEdit(m)} aria-label="Editar">
                <IconEdit size={18} />
              </button>
              <button className="icon-btn danger" onClick={() => setPendingDelete(m)} aria-label="Excluir">
                <IconTrash size={18} />
              </button>
            </div>
          </Card>
        ))
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={form.id ? 'Editar registro' : 'Registrar medidas'} wide>
        <Field label="Data do registro" required>
          <input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
        </Field>
        <div className="form-grid">
          <Field label={`Peso (${wUnit})`}>
            <input type="number" inputMode="decimal" step="0.1" min="0" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          </Field>
          <Field label="Gordura corporal (%) — opcional">
            <input type="number" inputMode="decimal" step="0.1" min="0" value={form.body_fat} onChange={(e) => setForm({ ...form, body_fat: e.target.value })} />
          </Field>
        </div>
        <p className="field-hint">Circunferências em {lUnit}:</p>
        <div className="form-grid">
          <Field label="Abdômen">
            <input type="number" inputMode="decimal" step="0.1" min="0" value={form.abdominal} onChange={(e) => setForm({ ...form, abdominal: e.target.value })} />
          </Field>
          <Field label="Cintura">
            <input type="number" inputMode="decimal" step="0.1" min="0" value={form.waist} onChange={(e) => setForm({ ...form, waist: e.target.value })} />
          </Field>
          <Field label="Quadril">
            <input type="number" inputMode="decimal" step="0.1" min="0" value={form.hip} onChange={(e) => setForm({ ...form, hip: e.target.value })} />
          </Field>
          <Field label="Peitoral">
            <input type="number" inputMode="decimal" step="0.1" min="0" value={form.chest} onChange={(e) => setForm({ ...form, chest: e.target.value })} />
          </Field>
          <Field label="Braço">
            <input type="number" inputMode="decimal" step="0.1" min="0" value={form.arm} onChange={(e) => setForm({ ...form, arm: e.target.value })} />
          </Field>
          <Field label="Coxa">
            <input type="number" inputMode="decimal" step="0.1" min="0" value={form.thigh} onChange={(e) => setForm({ ...form, thigh: e.target.value })} />
          </Field>
        </div>
        <Field label="Foto de evolução (opcional)">
          <input type="file" accept="image/*" onChange={pickPhoto} />
          {form.photo_url && (
            <div className="photo-preview">
              <Photo value={form.photo_url} alt="Prévia" />
              <button className="icon-btn danger" onClick={() => setForm({ ...form, photo_url: null })} aria-label="Remover foto">
                <IconTrash size={16} />
              </button>
            </div>
          )}
        </Field>
        <Field label="Observações">
          <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        {formError && <p className="form-error">{formError}</p>}
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Salvando…' : 'Salvar registro'}</Button>
        </div>
      </Modal>

      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title="Meta pessoal de peso (opcional)">
        <Field label={`Peso desejado (${wUnit})`} hint="Sua meta é pessoal e não representa uma recomendação do aplicativo.">
          <input type="number" inputMode="decimal" step="0.1" min="0" value={goalValue} onChange={(e) => setGoalValue(e.target.value)} />
        </Field>
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setGoalOpen(false)}>Cancelar</Button>
          <Button onClick={saveGoal}>Salvar meta</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete != null}
        title="Excluir registro"
        message={`Excluir o registro de ${pendingDelete ? formatDateShort(pendingDelete.entry_date) : ''}? Esta ação não pode ser desfeita.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) {
            await deleteRow('body_measurements', pendingDelete.id);
            if (pendingDelete.photo_url) await deletePhoto(pendingDelete.photo_url);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
