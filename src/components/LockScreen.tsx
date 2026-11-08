import React, { useEffect, useState } from 'react';
import { verifyPin, getLockPinLength } from '../lib/appLock';

const MAX_PIN = 6;
const MIN_PIN = 4;

export function LockScreen({ onSuccess, onForgot }: { onSuccess: () => void; onForgot: () => void }) {
  // Comprimento do PIN salvo (4–6), lido uma vez na montagem. null = PIN
  // criado antes deste campo existir: a tela usa confirmação manual (✓).
  const [pinLength] = useState<number | null>(() => getLockPinLength());
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const dots = pinLength ?? MAX_PIN;
  const canSubmit = pin.length >= MIN_PIN;

  const submit = async (value: string) => {
    setChecking(true);
    const ok = await verifyPin(value);
    setChecking(false);
    if (ok) {
      onSuccess();
    } else {
      setError(true);
      setPin('');
      window.setTimeout(() => setError(false), 600);
    }
  };

  const press = (key: string) => {
    if (checking) return;
    setPin((prev) => {
      if (key === 'back') return prev.slice(0, -1);
      if (prev.length >= MAX_PIN) return prev;
      return prev + key;
    });
  };

  // Com comprimento conhecido, valida ao completar o número exato de dígitos
  // (nunca no 4º se o PIN tem 5 ou 6). Sem comprimento, valida no máximo (6).
  useEffect(() => {
    if (checking) return;
    if (pin.length > 0 && pin.length === dots) void submit(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (checking) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      // Teclado físico: Enter confirma (com 4+ dígitos) mesmo sem completar.
      else if (e.key === 'Enter' && canSubmit) void submit(pin);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, checking]);

  return (
    <div className="lock-screen">
      <div className="lock-logo">M</div>
      <h1>Meu Mounjaro</h1>
      <p className="lock-sub">Digite seu PIN para continuar</p>

      <div
        className={`lock-dots ${error ? 'lock-error' : ''}`}
        role="group"
        aria-label={`PIN: ${pin.length} de ${dots} dígitos`}
      >
        {Array.from({ length: dots }).map((_, i) => (
          <span key={i} className={`lock-dot ${i < pin.length ? 'filled' : ''}`} />
        ))}
      </div>

      <p className="sr-only" aria-live="assertive">
        {error ? 'PIN incorreto. Tente novamente.' : ''}
      </p>

      <div className="lock-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <button key={n} className="lock-key" onClick={() => press(n)} disabled={checking}>
            {n}
          </button>
        ))}
        {pinLength ? (
          <span className="lock-key lock-key-empty" />
        ) : (
          <button
            className="lock-key lock-confirm"
            onClick={() => void submit(pin)}
            aria-label="Confirmar PIN"
            disabled={!canSubmit || checking}
          >
            ✓
          </button>
        )}
        <button className="lock-key" onClick={() => press('0')} disabled={checking}>
          0
        </button>
        <button className="lock-key lock-back" onClick={() => press('back')} aria-label="Apagar" disabled={checking}>
          ⌫
        </button>
      </div>

      <button className="lock-forgot" onClick={onForgot}>
        Esqueci meu PIN — sair da conta
      </button>
    </div>
  );
}
