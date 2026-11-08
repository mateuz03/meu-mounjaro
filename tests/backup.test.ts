import { describe, expect, it } from 'vitest';
import { parseBackup, BACKUP_VERSION } from '../src/lib/backup';

describe('parseBackup', () => {
  it('rejeita JSON inválido', () => {
    expect(() => parseBackup('não sou json')).toThrow('JSON válido');
  });

  it('rejeita JSON que não é objeto', () => {
    expect(() => parseBackup('[1,2,3]')).toThrow('backup reconhecível');
    expect(() => parseBackup('"texto"')).toThrow('backup reconhecível');
  });

  it('rejeita versão mais nova que a suportada', () => {
    const payload = JSON.stringify({ version: BACKUP_VERSION + 1, logs: [] });
    expect(() => parseBackup(payload)).toThrow(/versão mais nova/);
  });

  it('aceita versão antiga (sem campo version)', () => {
    const payload = JSON.stringify({
      exported_at: '2026-01-01T10:00:00Z',
      logs: [{ id: 'a', user_id: 'u', log_date: '2026-01-01' }],
    });
    const parsed = parseBackup(payload);
    expect(parsed.version).toBe(BACKUP_VERSION);
    expect(parsed.total).toBe(1);
    expect(parsed.rows.logs).toHaveLength(1);
  });

  it('descarta linhas sem campos obrigatórios e contabiliza em skipped', () => {
    const payload = JSON.stringify({
      logs: [
        { id: 'a', log_date: '2026-01-01' },
        { id: 'b', log_date: '' }, // data vazia → inválida
        { id: 'c' }, // sem data → inválida
        'não-objeto',
      ],
      effects: [
        { id: 'd', occurred_on: '2026-01-02', name: 'Náusea' },
        { id: 'e', occurred_on: '2026-01-02' }, // sem nome → inválida
      ],
    });
    const parsed = parseBackup(payload);
    expect(parsed.rows.logs).toHaveLength(1);
    expect(parsed.rows.effects).toHaveLength(1);
    expect(parsed.skipped).toBe(4);
    expect(parsed.total).toBe(2);
  });

  it('remove colunas desconhecidas do esquema atual', () => {
    const payload = JSON.stringify({
      logs: [
        {
          id: 'a',
          log_date: '2026-01-01',
          coluna_do_futuro: 'x',
          weight_kg: 80,
        },
      ],
    });
    const parsed = parseBackup(payload);
    expect(parsed.rows.logs?.[0]).toEqual({ id: 'a', log_date: '2026-01-01' });
  });

  it('mantém o perfil e ignora campos internos', () => {
    const payload = JSON.stringify({
      profile: { full_name: 'Maria', id: 'x', user_id: 'y' },
      reminders: [{ id: 'r', remind_date: '2026-02-01', title: 'Pesagem' }],
    });
    const parsed = parseBackup(payload);
    expect(parsed.profile).toEqual({ full_name: 'Maria', id: 'x', user_id: 'y' });
    expect(parsed.rows.reminders).toHaveLength(1);
  });

  it('rejeita backup sem registros nem perfil', () => {
    expect(() => parseBackup(JSON.stringify({ version: 1 }))).toThrow(/Nenhum registro/);
  });
});
