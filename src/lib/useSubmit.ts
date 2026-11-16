// Guarda de envio para formulários: protege contra duplo clique de forma
// síncrona (ref, independente do re-render do React) e expõe o estado
// `saving` para desabilitar o botão e mostrar "Salvando…".
import { useCallback, useRef, useState } from 'react';

export function useSubmit<A extends unknown[]>(
  fn: (...args: A) => Promise<void>,
): [(...args: A) => Promise<void>, boolean] {
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (...args: A) => {
    // Segundo clique no mesmo tick (antes do disabled aplicar): ignorado.
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await fnRef.current(...args);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }, []);

  return [run, saving];
}
