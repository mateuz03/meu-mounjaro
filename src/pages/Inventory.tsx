import React, { useState } from 'react';
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
  IconBox,
  IconEdit,
  IconTrash,
} from '../components/ui';
import { fmtNum, formatDateShort, todayISO } from '../lib/helpers';
import type { MedicationInventory } from '../lib/types';

interface FormState {
  id?: string;
  product_name: string;
  quantity_purchased: string;
  quantity_available: string;
  purchase_date: string;
  expiry_date: string;
  lot_number: string;
  storage_location: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  product_name: '',
  quantity_purchased: '',
  quantity_available: '',
  purchase_date: todayISO(),
  expiry_date: '',
  lot_number: '',
  storage_location: '',
  notes: '',
});

export function Inventory() {
  const { data, saveRow, deleteRow, showToast } = useApp();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MedicationInventory | null>(null);

  const totalAvailable = data.inventory.reduce((s, i) => s + (Number(i.quantity_available) || 0), 0);

  const openEdit = (i: MedicationInventory) => {
    setForm({
      id: i.id,
      product_name: i.product_name || '',
      quantity_purchased: i.quantity_purchased != null ? String(i.quantity_purchased) : '',
      quantity_available: i.quantity_available != null ? String(i.quantity_available) : '',
      purchase_date: i.purchase_date || '',
      expiry_date: i.expiry_date || '',
      lot_number: i.lot_number || '',
      storage_location: i.storage_location || '',
      notes: i.notes || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
    const purchased = num(form.quantity_purchased);
    const available = num(form.quantity_available);
    if (purchased != null && (Number.isNaN(purchased) || purchased < 0)) {
      setFormError('Quantidade adquirida inválida.');
      return;
    }
    if (available != null && (Number.isNaN(available) || available < 0)) {
      setFormError('Quantidade disponível inválida.');
      return;
    }
    const res = await saveRow<MedicationInventory>('medication_inventory', {
      id: form.id,
      product_name: form.product_name || null,
      quantity_purchased: purchased,
      quantity_available: available,
      purchase_date: form.purchase_date || null,
      expiry_date: form.expiry_date || null,
      lot_number: form.lot_number || null,
      storage_location: form.storage_location || null,
      notes: form.notes || null,
    });
    if (res.ok) setFormOpen(false);
  };

  const usageCount = (invId: string) =>
    data.applications.filter((a) => a.inventory_id === invId).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Controle do medicamento</h1>
          <p className="page-sub">Área opcional, com base apenas nas quantidades que você informar.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setFormOpen(true); }}>
          <IconPlus size={18} /> Adicionar medicamento
        </Button>
      </div>

      <Card className="card-accent">
        <div className="stat-head">
          <span className="stat-label">Quantidade estimada disponível</span>
          <IconBox />
        </div>
        <div className="stat-big">{data.inventory.length ? `${fmtNum(totalAvailable)} un.` : '—'}</div>
        <p className="stat-sub">
          Estimativa calculada somente a partir dos registros que você cadastrou. O aplicativo não
          fornece instruções de conservação ou descarte — consulte a bula e a fonte oficial
          indicada pelo profissional responsável.
        </p>
      </Card>

      {data.inventory.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconBox />}
            title="Nenhum medicamento cadastrado"
            message="Se quiser, registre o nome da embalagem, a quantidade adquirida e a disponível — o restante estimado é calculado a partir desses dados."
            action={
              <Button onClick={() => { setForm(emptyForm()); setFormOpen(true); }}>
                <IconPlus size={18} /> Adicionar medicamento
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <SectionTitle>Itens cadastrados</SectionTitle>
          {data.inventory.map((i) => (
            <Card key={i.id} className="measure-row">
              <div className="measure-body">
                <div className="tl-title">
                  <strong>{i.product_name || 'Medicamento sem nome'}</strong>
                  <Tag tone="info">{fmtNum(i.quantity_available)} disponíveis</Tag>
                  {i.expiry_date && Number(i.expiry_date.replace(/-/g, '')) < Number(todayISO().replace(/-/g, '')) && (
                    <Tag tone="warn">Vencido</Tag>
                  )}
                </div>
                <span className="muted small">
                  {[
                    i.quantity_purchased != null && `Adquirido: ${fmtNum(i.quantity_purchased)}`,
                    i.purchase_date && `Compra: ${formatDateShort(i.purchase_date)}`,
                    i.expiry_date && `Validade: ${formatDateShort(i.expiry_date)}`,
                    i.lot_number && `Lote: ${i.lot_number}`,
                    i.storage_location && `Armazenamento: ${i.storage_location}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {i.notes && <span className="muted small">{i.notes}</span>}
                <span className="muted small">{usageCount(i.id)} aplicação(ões) associada(s)</span>
              </div>
              <div className="tl-actions">
                <button className="icon-btn" onClick={() => openEdit(i)} aria-label="Editar">
                  <IconEdit size={18} />
                </button>
                <button className="icon-btn danger" onClick={() => setPendingDelete(i)} aria-label="Excluir">
                  <IconTrash size={18} />
                </button>
              </div>
            </Card>
          ))}
        </>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={form.id ? 'Editar medicamento' : 'Adicionar medicamento'}>
        <Field label="Nome apresentado na embalagem">
          <input type="text" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
        </Field>
        <div className="form-grid">
          <Field label="Quantidade adquirida">
            <input type="number" inputMode="decimal" min="0" step="0.5" value={form.quantity_purchased} onChange={(e) => setForm({ ...form, quantity_purchased: e.target.value })} />
          </Field>
          <Field label="Quantidade disponível">
            <input type="number" inputMode="decimal" min="0" step="0.5" value={form.quantity_available} onChange={(e) => setForm({ ...form, quantity_available: e.target.value })} />
          </Field>
          <Field label="Data da compra">
            <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
          </Field>
          <Field label="Validade">
            <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
          </Field>
          <Field label="Lote">
            <input type="text" value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} />
          </Field>
          <Field label="Local de armazenamento (informado por você)">
            <input type="text" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} />
          </Field>
        </div>
        <Field label="Observações">
          <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        {formError && <p className="form-error">{formError}</p>}
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete != null}
        title="Excluir medicamento"
        message={`Excluir "${pendingDelete?.product_name || 'item'}" do controle? As aplicações associadas permanecem no histórico. Esta ação não pode ser desfeita.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) {
            await deleteRow('medication_inventory', pendingDelete.id);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
