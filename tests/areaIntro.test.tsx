// @vitest-environment jsdom
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AreaIntro } from '../src/components/ui';

beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

describe('AreaIntro — introdução dispensável por área', () => {
  it('exibe título, conteúdo e ações', () => {
    render(
      <AreaIntro storageKey="mm-intro-test" title="Como usar esta área" actions={<button>Ver Refeições</button>}>
        <p>Dica de uso da área.</p>
      </AreaIntro>,
    );
    expect(screen.getByText('Como usar esta área')).toBeTruthy();
    expect(screen.getByText('Dica de uso da área.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver Refeições' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fechar introdução' })).toBeTruthy();
  });

  it('fecha ao clicar em fechar e persiste no localStorage', () => {
    render(
      <AreaIntro storageKey="mm-intro-test" title="Como usar esta área">
        <p>Conteúdo</p>
      </AreaIntro>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fechar introdução' }));
    expect(screen.queryByText('Como usar esta área')).toBeNull();
    expect(localStorage.getItem('mm-intro-test')).toBe('1');
  });

  it('não aparece novamente quando já foi dispensada (por dispositivo)', () => {
    localStorage.setItem('mm-intro-test', '1');
    render(
      <AreaIntro storageKey="mm-intro-test" title="Como usar esta área">
        <p>Conteúdo</p>
      </AreaIntro>,
    );
    expect(screen.queryByText('Como usar esta área')).toBeNull();
  });

  it('cada área tem sua introdução independente', () => {
    localStorage.setItem('mm-intro-mounjaro', '1');
    render(
      <AreaIntro storageKey="mm-intro-fitness" title="Como usar esta área">
        <p>Conteúdo</p>
      </AreaIntro>,
    );
    expect(screen.getByText('Como usar esta área')).toBeTruthy();
  });
});
