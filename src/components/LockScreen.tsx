import React, { useEffect, useState } from 'react';
import { verifyPin } from '../lib/appLock';

const MAX_PIN = 6;

export function LockScreen({ onSuccess, onForgot }: { onSuccess: () => void; onForgot: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

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
      const next = prev + key;
      return next;
    });
  };

  useEffect(() => {
    if (pin.length >= 4) void submit(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
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

      <div className={`lock-dots ${error ? 'lock-error' : ''}`} aria-label={pin}>
        {Array.from({ length: MAX_PIN }).map((_, i) => (
          <span key={i} className={`lock-dot ${i < pin.length ? 'filled' : ''}`} />
        ))}
      </div>

      <div className="lock-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <button key={n} className="lock-key" onClick={() => press(n)} disabled={checking}>
            {n}
          </button>
        ))}
        <span className="lock-key lock-key-empty" />
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
