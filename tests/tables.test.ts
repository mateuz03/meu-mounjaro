import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TABLE_SPECS, windowCutoff } from '../src/lib/tables';

const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

// Extrai "nome_tabela -> Set(colunas)" de todos os create table das migrações.
function parseSchemaFromMigrations(): Map<string, Set<string>> {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  const schema = new Map<string, Set<string>>();
  const constraintStarters = new Set([
    'constraint', 'primary', 'foreign', 'unique', 'check', 'exclude',
  ]);
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([\w.]+)\s*\(([\s\S]*?)\n\);/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(sql)) !== null) {
      const table = match[1];
      const columns = new Set<string>();
      for (const rawLine of match[2].split('\n')) {
        const line = rawLine.trim().replace(/,$/, '');
        if (!line) continue;
        const firstToken = line.split(/\s+/)[0].toLowerCase();
        if (constraintStarters.has(firstToken)) continue;
        columns.add(firstToken);
      }
      // Colunas adicionadas por migrações posteriores (alter table add column).
      const alterRe = new RegExp(
        `alter\\s+table\\s+(?:only\\s+)?(?:public\\.)?${table}\\s+add\\s+column\\s+(?:if\\s+not\\s+exists\\s+)?(\\w+)`,
        'gi',
      );
      let alt: RegExpExecArray | null;
      while ((alt = alterRe.exec(sql)) !== null) columns.add(alt[1]);
      schema.set(table, columns);
    }
    // alter table add column em tabela criada em outro arquivo
    const alterAny = /alter\s+table\s+(?:only\s+)?(?:public\.)?([\w.]+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)/gi;
    let anyAlt: RegExpExecArray | null;
    while ((anyAlt = alterAny.exec(sql)) !== null) {
      const [, table, column] = anyAlt;
      const existing = schema.get(table);
      if (existing) existing.add(column);
      else schema.set(table, new Set([column]));
    }
  }
  return schema;
}

describe('paridade cliente ↔ esquema das migrações', () => {
  const schema = parseSchemaFromMigrations();

  it('todas as tabelas consultadas pelo app existem nas migrações', () => {
    for (const spec of TABLE_SPECS) {
      expect(schema.has(spec.table), `tabela ${spec.table} não encontrada nas migrações`).toBe(
        true,
      );
    }
  });

  it('toda coluna consultada pelo app existe na tabela correspondente', () => {
    const problems: string[] = [];
    for (const spec of TABLE_SPECS) {
      const columns = schema.get(spec.table);
      if (!columns) continue;
      for (const col of spec.columns) {
        if (!columns.has(col)) problems.push(`${spec.table}.${col}`);
      }
    }
    expect(problems, `colunas ausentes no esquema: ${problems.join(', ')}`).toEqual([]);
  });

  it('catálogo não tem tabelas duplicadas', () => {
    const names = TABLE_SPECS.map((s) => s.table);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('windowCutoff', () => {
  it('calcula data de corte N meses atrás', () => {
    expect(windowCutoff(24, new Date(2026, 10, 8))).toBe('2024-11-08');
    expect(windowCutoff(12, new Date(2026, 0, 31))).toBe('2025-01-31');
  });

  it('lida com fim de mês sem estourar dia', () => {
    // 31 de mar de 2026, 12 meses antes = mar de 2025 (sem dia 31 não há problema:
    // Date normaliza para 31/mar/2025 pois março tem 31 dias)
    expect(windowCutoff(12, new Date(2026, 2, 31))).toBe('2025-03-31');
    // 31 de mai de 2026, 12 meses antes = Date(2025,4,31) → 31/mai/2025
    expect(windowCutoff(12, new Date(2026, 4, 31))).toBe('2025-05-31');
  });
});
