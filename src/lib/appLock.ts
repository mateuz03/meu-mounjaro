// Bloqueio de privacidade local (por dispositivo). O PIN nunca sai do aparelho.
const PIN_HASH_KEY = 'mounjaro_lock_pin_hash';
const PIN_SALT_KEY = 'mounjaro_lock_pin_salt';
const PIN_LENGTH_KEY = 'mounjaro_lock_pin_length';
const TIMEOUT_KEY = 'mounjaro_lock_timeout';
const UNLOCKED_KEY = 'mounjaro_lock_unlocked';
const HIDDEN_AT_KEY = 'mounjaro_lock_hidden_at';

export type LockTimeout = 'always' | '5min';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hasLockPin(): boolean {
  return Boolean(localStorage.getItem(PIN_HASH_KEY));
}

export async function setLockPin(pin: string): Promise<void> {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hash = await hashPin(pin, salt);
  localStorage.setItem(PIN_SALT_KEY, salt);
  localStorage.setItem(PIN_HASH_KEY, hash);
  // Comprimento do PIN (4–6): permite à tela de bloqueio validar apenas quando
  // o usuário terminar de digitar, sem disparar a checagem no 4º dígito.
  localStorage.setItem(PIN_LENGTH_KEY, String(pin.length));
  markUnlocked();
}

// Comprimento do PIN salvo, ou null para PINs criados antes deste campo existir
// (nesses casos a tela de bloqueio usa confirmação manual).
export function getLockPinLength(): number | null {
  const raw = Number(localStorage.getItem(PIN_LENGTH_KEY));
  return Number.isInteger(raw) && raw >= 4 && raw <= 6 ? raw : null;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = localStorage.getItem(PIN_SALT_KEY) ?? '';
  const hash = await hashPin(pin, salt);
  return hash === localStorage.getItem(PIN_HASH_KEY);
}

export function removeLock(): void {
  localStorage.removeItem(PIN_HASH_KEY);
  localStorage.removeItem(PIN_SALT_KEY);
  localStorage.removeItem(PIN_LENGTH_KEY);
  sessionStorage.removeItem(UNLOCKED_KEY);
}

export function getLockTimeout(): LockTimeout {
  return (localStorage.getItem(TIMEOUT_KEY) as LockTimeout) ?? 'always';
}

export function setLockTimeout(t: LockTimeout): void {
  localStorage.setItem(TIMEOUT_KEY, t);
}

function isUnlocked(): boolean {
  return sessionStorage.getItem(UNLOCKED_KEY) === '1';
}

export function markUnlocked(): void {
  sessionStorage.setItem(UNLOCKED_KEY, '1');
}

export function lockNow(): void {
  sessionStorage.removeItem(UNLOCKED_KEY);
}

// Chamado quando o app volta para o primeiro plano. Retorna true se deve bloquear.
export function evaluateLockOnResume(): boolean {
  if (!hasLockPin() || !isUnlocked()) return false;
  const timeout = getLockTimeout();
  if (timeout === 'always') return true;
  const hiddenAt = Number(sessionStorage.getItem(HIDDEN_AT_KEY) ?? 0);
  return hiddenAt > 0 && Date.now() - hiddenAt > FIVE_MINUTES_MS;
}

export function watchVisibility(onShouldLock: () => void): () => void {
  const onVisible = () => {
    if (document.visibilityState === 'visible' && evaluateLockOnResume()) {
      lockNow();
      onShouldLock();
    }
  };
  const onHidden = () => {
    if (document.visibilityState === 'hidden') {
      sessionStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
    }
  };
  document.addEventListener('visibilitychange', onVisible);
  document.addEventListener('visibilitychange', onHidden);
  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    document.removeEventListener('visibilitychange', onHidden);
  };
}
