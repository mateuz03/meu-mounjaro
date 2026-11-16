// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSubmit } from '../src/lib/useSubmit';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useSubmit — guarda de duplo clique', () => {
  it('ignora chamadas concorrentes: handler roda uma vez por envio', async () => {
    const gate = deferred<void>();
    const fn = vi.fn(() => gate.promise);
    const { result } = renderHook(() => useSubmit(fn));
    const [run] = result.current;

    // Dois cliques antes do primeiro terminar (mesmo tick): só o primeiro passa.
    const p1 = run();
    const p2 = run();
    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => {
      gate.resolve();
      await Promise.all([p1, p2]);
    });
    await waitFor(() => expect(result.current[1]).toBe(false));
  });

  it('permite novo envio depois que o anterior termina', async () => {
    let calls = 0;
    const fn = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          calls += 1;
          resolve();
        }),
    );
    const { result } = renderHook(() => useSubmit(fn));
    const [run] = result.current;

    await act(async () => {
      await run();
    });
    await act(async () => {
      await run();
    });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(result.current[1]).toBe(false);
  });

  it('expõe saving=true durante o envio e false ao terminar', async () => {
    const gate = deferred<void>();
    const { result } = renderHook(() => useSubmit(() => gate.promise));
    const [run] = result.current;

    let pending: Promise<void> | null = null;
    act(() => {
      pending = run();
    });
    expect(result.current[1]).toBe(true);

    await act(async () => {
      gate.resolve();
      await pending;
    });
    expect(result.current[1]).toBe(false);
  });

  it('reseta saving mesmo quando o handler lança erro', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('falha de rede')));
    const { result } = renderHook(() => useSubmit(fn));
    const [run] = result.current;

    await act(async () => {
      await expect(run()).rejects.toThrow('falha de rede');
    });
    expect(result.current[1]).toBe(false);

    // E o próximo envio não fica travado pela falha anterior.
    await act(async () => {
      await expect(run()).rejects.toThrow();
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('repassa argumentos ao handler', async () => {
    const fn = vi.fn(async (_a: number, _b: string) => {});
    const { result } = renderHook(() => useSubmit(fn));
    const [run] = result.current;

    await act(async () => {
      await run(7, 'sete');
    });
    expect(fn).toHaveBeenCalledWith(7, 'sete');
  });
});
