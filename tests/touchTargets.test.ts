// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(__dirname, '..', 'src', 'style.css'), 'utf8');

/** Extrai o bloco de regras de um seletor. */
function rule(selector: string): string {
  const idx = css.indexOf(selector + ' {');
  if (idx === -1) return '';
  const start = css.indexOf('{', idx);
  let depth = 0;
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(start + 1, i);
    }
  }
  return '';
}

describe('Alvos de toque confortáveis (WCAG 2.5.8 / padrão mobile 44px)', () => {
  it('.icon-btn (editar/excluir, fechar, setas do calendário) tem no mínimo 44×44', () => {
    const r = rule('.icon-btn');
    expect(r).toContain('min-width: 44px');
    expect(r).toContain('min-height: 44px');
  });

  it('.avatar-btn (menu de áreas no topo) tem 44×44', () => {
    const r = rule('.avatar-btn');
    expect(r).toContain('width: 44px');
    expect(r).toContain('height: 44px');
  });

  it('.meal-ok (confirmar refeição) tem altura mínima de 44px', () => {
    expect(rule('.meal-ok')).toContain('min-height: 44px');
  });

  it('itens do menu do usuário (áreas, perfil, sair) têm 44px de altura mínima', () => {
    expect(rule('.user-menu-area')).toContain('min-height: 44px');
    expect(rule('.user-menu-foot')).toContain('min-height: 44px');
  });

  it('.rating-dot (escalas 1–5) tem 44×44', () => {
    const r = rule('.rating-dot');
    expect(r).toContain('width: 44px');
    expect(r).toContain('height: 44px');
  });

  it('.chip (filtros de período etc.) tem altura mínima de 44px', () => {
    expect(rule('.chip')).toContain('min-height: 44px');
  });

  it('.calendar-cell tem altura mínima de 48px', () => {
    expect(rule('.calendar-cell')).toContain('min-height: 48px');
  });

  it('segmented controls (view-toggle e mode-switch) têm 44px de altura mínima', () => {
    expect(rule('.view-toggle button')).toContain('min-height: 44px');
    expect(rule('.mode-switch button')).toContain('min-height: 44px');
  });

  it('botões de ação em listas ficam afastados (gap 6px, não 2px)', () => {
    expect(rule('.tl-actions')).toContain('gap: 6px');
    expect(rule('.row-actions')).toContain('gap: 6px');
  });

  it('controles usam touch-action: manipulation (sem atraso de duplo toque)', () => {
    expect(rule('.btn')).toContain('touch-action: manipulation');
    expect(rule('.icon-btn')).toContain('touch-action: manipulation');
    expect(rule('.calendar-cell')).toContain('touch-action: manipulation');
  });
});
