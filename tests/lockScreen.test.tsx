// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { createHash } from 'node:crypto';
import { LockScreen } from '../src/components/LockScreen';
import {
  setLockPin,
  verifyPin,
  getLockPinLength,
  removeLock,
  hasLockPin,
} from '../src/lib/appLock';

// Mesmo digest do app (SHA-256 de "salt:pin"), calculado de forma síncrona
// para não depender de crypto.subtle no ambiente de teste.
function hashPin(pin: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

function seedPin(pin: string, withLength: boolean) {
  const salt = 'salt-de-teste';
  localStorage.setItem('mounjaro_lock_pin_salt', salt);
  localStorage.setItem('mounjaro_lock_pin_hash', hashPin(pin, salt));
  if (withLength) {
    localStorage.setItem('mounjaro_lock_pin_length', String(pin.length));
  } else {
    localStorage.removeItem('mounjaro_lock_pin_length');
  }
}

function typeDigits(digits: string) {
  for (const d of digits) {
    fireEvent.click(screen.getByRole('button', { name: d }));
  }
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(cleanup);

describe('LockScreen — comprimento do PIN', () => {
  it('não valida no 4º dígito quando o PIN tem 5 dígitos (regressão do bug)', async () => {
    seedPin('12345', true);
    const onSuccess = vi.fn();
    render(<LockScreen onSuccess={onSuccess} onForgot={() => {}} />);

    typeDigits('1234');
    expect(onSuccess).not.toHaveBeenCalled();

    typeDigits('5');
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('valida automaticamente um PIN de 4 dígitos ao completar', async () => {
    seedPin('9876', true);
    const onSuccess = vi.fn();
    render(<LockScreen onSuccess={onSuccess} onForgot={() => {}} />);

    typeDigits('9876');
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('valida automaticamente um PIN de 6 dígitos apenas no 6º dígito', async () => {
    seedPin('135790', true);
    const onSuccess = vi.fn();
    render(<LockScreen onSuccess={onSuccess} onForgot={() => {}} />);

    typeDigits('1357');
    expect(onSuccess).not.toHaveBeenCalled();
    typeDigits('9');
    expect(onSuccess).not.toHaveBeenCalled();
    typeDigits('0');
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('PIN errado não desbloqueia e limpa os dígitos', async () => {
    seedPin('12345', true);
    const onSuccess = vi.fn();
    render(<LockScreen onSuccess={onSuccess} onForgot={() => {}} />);

    typeDigits('99999');
    await waitFor(() => expect(screen.getByRole('group').className).toContain('lock-error'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('mostra exatamente o número de pontos do comprimento do PIN', () => {
    seedPin('135790', true);
    const first = render(<LockScreen onSuccess={() => {}} onForgot={() => {}} />);
    expect(document.querySelectorAll('.lock-dot')).toHaveLength(6);
    first.unmount();

    seedPin('1234', true);
    render(<LockScreen onSuccess={() => {}} onForgot={() => {}} />);
    expect(document.querySelectorAll('.lock-dot')).toHaveLength(4);
  });
});

describe('LockScreen — PIN legado (sem comprimento salvo)', () => {
  it('oferece botão de confirmar e não valida antes da confirmação', async () => {
    seedPin('4321', false);
    const onSuccess = vi.fn();
    render(<LockScreen onSuccess={onSuccess} onForgot={() => {}} />);

    const confirm = screen.getByRole('button', { name: 'Confirmar PIN' });
    expect(confirm).toBeDefined();

    typeDigits('43');
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    typeDigits('21');
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();

    fireEvent.click(confirm);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('valida automaticamente ao atingir 6 dígitos (máximo)', async () => {
    seedPin('987654', false);
    const onSuccess = vi.fn();
    render(<LockScreen onSuccess={onSuccess} onForgot={() => {}} />);

    typeDigits('98765');
    expect(onSuccess).not.toHaveBeenCalled();
    typeDigits('4');
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});

describe('appLock — armazenamento do comprimento', () => {
  it('setLockPin salva o comprimento e verifyPin confirma', async () => {
    await setLockPin('54321');
    expect(getLockPinLength()).toBe(5);
    expect(hasLockPin()).toBe(true);
    expect(await verifyPin('54321')).toBe(true);
    expect(await verifyPin('5432')).toBe(false);
    expect(await verifyPin('543210')).toBe(false);
  });

  it('removeLock apaga também o comprimento', async () => {
    await setLockPin('4444');
    removeLock();
    expect(hasLockPin()).toBe(false);
    expect(getLockPinLength()).toBeNull();
  });

  it('getLockPinLength ignora valores inválidos', () => {
    localStorage.setItem('mounjaro_lock_pin_length', '3');
    expect(getLockPinLength()).toBeNull();
    localStorage.setItem('mounjaro_lock_pin_length', '7');
    expect(getLockPinLength()).toBeNull();
    localStorage.setItem('mounjaro_lock_pin_length', 'banana');
    expect(getLockPinLength()).toBeNull();
  });
});
