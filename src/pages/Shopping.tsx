import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Field, ConfirmDialog, EmptyState, Tag } from '../components/ui';
import { IconCart, IconPlus, IconTrash, IconCheck } from '../components/ui';
import type { DietShoppingItem } from '../lib/types';

const CATEGORIES = [
  { id: 'frutas', label: 'Frutas' },
  { id: 'verduras', label: 'Verduras e legumes' },
  { id: 'proteinas', label: 'Proteínas' },
  { id: 'graos', label: 'Grãos e cereais' },
  { id: 'laticinios', label: 'Laticínios' },
  { id: 'padaria', label: 'Padaria' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'limpeza', label: 'Limpeza' },
  { id: 'outros', label: 'Outros' },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

export function Shopping() {
  const { data, saveRow, deleteRow } = useApp();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('outros');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const items = useMemo(() => {
    const checked = (x: DietShoppingItem) => (x.is_checked ? 1 : 0);
    return [...data.diet_shopping_items].sort((a, b) => checked(a) - checked(b) || a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  }, [data.diet_shopping_items]);

  const pending = items.filter((x) => !x.is_checked);
  const done = items.filter((x) => x.is_checked);

  async function addItem() {
    const n = name.trim();
    if (!n) {
      setError('Informe o alimento que precisa comprar.');
      return;
    }
    setBusy(true);
    const res = await saveRow<DietShoppingItem>('diet_shopping_items', {
      name: n,
      quantity: quantity.trim() || null,
      category,
      is_checked: false,
      sort_order: data.diet_shopping_items.length,
    });
    setBusy(false);
    if (res.ok) {
      setName('');
      setQuantity('');
      setError('');
    }
  }

  async function toggle(x: DietShoppingItem) {
    await saveRow<DietShoppingItem>('diet_shopping_items', { id: x.id, is_checked: !x.is_checked });
  }

  async function clearDone() {
    setClearOpen(false);
    for (const x of done) await deleteRow('diet_shopping_items', x.id);
  }

  return (
    <div>
      <h1>Lista de compras</h1>
      <p className="muted mt-small">Organize os alimentos que precisa comprar — risque os itens no mercado.</p>

      <Card>
        <Field label="Novo item">
          <input
            placeholder='Ex.: "Banana"'
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
          />
        </Field>
        <div className="form-grid">
          <Field label="Quantidade (opcional)">
            <input
              placeholder='Ex.: "1 dúzia" ou "500 g"'
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
            />
          </Field>
          <Field label="Categoria">
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </Field>
        </div>
        {error && <p className="field-error">{error}</p>}
        <Button onClick={addItem} disabled={busy}>
          <IconPlus size={18} /> Adicionar à lista
        </Button>
      </Card>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconCart size={34} />}
            title="Lista vazia"
            message="Adicione os alimentos e itens que precisa comprar. Você pode separar por categoria e marcar conforme coloca no carrinho."
          />
        </Card>
      ) : (
        <>
          <Card>
            <div className="section-title">
              <h2>A comprar ({pending.length})</h2>
            </div>
            {pending.length === 0 ? (
              <p className="muted small">Nada pendente — lista completa.</p>
            ) : (
              pending.map((x) => (
                <div className="shopping-row" key={x.id}>
                  <button
                    type="button"
                    className="shopping-check"
                    aria-label={`Marcar ${x.name} como comprado`}
                    onClick={() => toggle(x)}
                  />
                  <div className="shopping-body">
                    <strong>{x.name}</strong>
                    <span className="muted small">
                      {[x.quantity, CATEGORY_LABEL[x.category] || x.category].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <Tag tone="info">{CATEGORY_LABEL[x.category] || x.category}</Tag>
                  <button className="icon-btn danger" aria-label={`Remover ${x.name}`} onClick={() => deleteRow('diet_shopping_items', x.id)}>
                    <IconTrash size={16} />
                  </button>
                </div>
              ))
            )}
          </Card>

          {done.length > 0 && (
            <Card>
              <div className="section-title">
                <h2>Comprados ({done.length})</h2>
                <Button variant="ghost" onClick={() => setClearOpen(true)}>
                  <IconCheck size={15} /> Limpar comprados
                </Button>
              </div>
              {done.map((x) => (
                <div className="shopping-row done" key={x.id}>
                  <button
                    type="button"
                    className="shopping-check checked"
                    aria-label={`Desmarcar ${x.name}`}
                    onClick={() => toggle(x)}
                  />
                  <div className="shopping-body">
                    <strong>{x.name}</strong>
                    <span className="muted small">{[x.quantity, CATEGORY_LABEL[x.category] || x.category].filter(Boolean).join(' · ')}</span>
                  </div>
                  <Tag tone="good">Comprado</Tag>
                  <button className="icon-btn danger" aria-label={`Remover ${x.name}`} onClick={() => deleteRow('diet_shopping_items', x.id)}>
                    <IconTrash size={16} />
                  </button>
                </div>
              ))}
            </Card>
          )}

          <p className="muted small center">
            A lista é pessoal e não se conecta a lojas nem a preços.
          </p>
        </>
      )}

      <ConfirmDialog
        open={clearOpen}
        title="Limpar comprados?"
        message={`${done.length} item(ns) marcado(s) como comprado(s) será(ão) removido(s) da lista. Essa ação não pode ser desfeita.`}
        onConfirm={clearDone}
        onCancel={() => setClearOpen(false)}
      />
    </div>
  );
}
