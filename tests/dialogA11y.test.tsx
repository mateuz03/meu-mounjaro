// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useState } from 'react';
import { Modal, ConfirmDialog, RatingScale } from '../src/components/ui';

beforeEach(() => {
  document.body.style.overflow = '';
});

afterEach(cleanup);

// Harness: um botão abre o modal, como nas páginas do app.
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Título do diálogo">
        <button>Primeiro</button>
        <button>Último</button>
      </Modal>
    </div>
  );
}

function ConfirmHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Excluir registro</button>
      <ConfirmDialog
        open={open}
        title="Confirmar exclusão"
        message="Esta ação não pode ser desfeita."
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

describe('Modal — acessibilidade', () => {
  it('associa o título via aria-labelledby', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Abrir'));
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)?.textContent).toBe('Título do diálogo');
  });

  it('move o foco para dentro do modal ao abrir', () => {
    render(<Harness />);
    const trigger = screen.getByText('Abrir');
    trigger.focus();
    fireEvent.click(trigger);
    // Primeiro focável dentro do modal é o botão Fechar (X).
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Fechar');
  });

  it('mantém o foco preso dentro do modal (Tab cicla)', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Abrir'));
    const dialog = screen.getByRole('dialog');
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>('button:not([disabled])'),
    );
    // jsdom não computa layout (offsetParent sempre null): stub para o filtro
    // de visibilidade do hook encontrar todos os focáveis, como no navegador.
    focusables.forEach((el) =>
      Object.defineProperty(el, 'offsetParent', {
        get: () => document.body,
        configurable: true,
      }),
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('Escape fecha e devolve o foco ao elemento que abriu', () => {
    render(<Harness />);
    const trigger = screen.getByText('Abrir');
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('trava a rolagem do corpo enquanto aberto', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Abrir'));
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
  });
});

describe('ConfirmDialog — acessibilidade', () => {
  it('é alertdialog com título associado e foco inicial no Cancelar', () => {
    render(<ConfirmHarness />);
    fireEvent.click(screen.getByText('Excluir registro'));
    const dialog = screen.getByRole('alertdialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)?.textContent).toBe('Confirmar exclusão');
    // Foco inicial cai no botão de cancelar (ação segura), não no de excluir.
    expect(document.activeElement?.textContent).toBe('Cancelar');
  });

  it('Escape cancela e devolve o foco ao gatilho', () => {
    render(<ConfirmHarness />);
    const trigger = screen.getByText('Excluir registro');
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe('RatingScale — navegação por teclado', () => {
  it('apenas a opção selecionada entra na ordem de Tab', () => {
    render(<RatingScale label="Nível de fome" value={3} onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    const tabbable = radios.filter((r) => r.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].getAttribute('aria-checked')).toBe('true');
  });

  it('sem valor, a primeira opção é o ponto de Tab', () => {
    render(<RatingScale label="Energia" value={null} onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    expect(radios[0].tabIndex).toBe(0);
    expect(radios.slice(1).every((r) => r.tabIndex === -1)).toBe(true);
  });

  it('setas movem e selecionam; Home/End vão aos extremos', () => {
    const onChange = vi.fn();
    render(<RatingScale label="Humor" value={2} onChange={onChange} />);
    const radios = screen.getAllByRole('radio');

    fireEvent.keyDown(radios[1], { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(document.activeElement).toBe(radios[2]);

    fireEvent.keyDown(radios[2], { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith(2);

    fireEvent.keyDown(radios[1], { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(document.activeElement).toBe(radios[0]);

    fireEvent.keyDown(radios[0], { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(document.activeElement).toBe(radios[4]);
  });

  it('radiogroup tem nome acessível e cada opção descreve o valor', () => {
    render(
      <RatingScale label="Saciedade" value={null} onChange={() => {}} labels={['Pouca', 'Muita']} />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Saciedade' })).toBeDefined();
    expect(screen.getByRole('radio', { name: /1/ }).getAttribute('aria-label')).toMatch(
      /Pouca/,
    );
    expect(screen.getByRole('radio', { name: /5/ }).getAttribute('aria-label')).toMatch(
      /Muita/,
    );
  });
});

// Evita aviso de act() por foco assíncrono em efeitos.
