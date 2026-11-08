import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, auth } from '../lib/supabase';
import { emptyData, buildDemoData } from '../lib/demo';
import { saveSnapshot, loadSnapshot, clearSnapshot } from '../lib/offlineCache';
import { IMPORT_FIELDS, type BackupPayload } from '../lib/backup';
import { TABLE_SPECS, windowCutoff } from '../lib/tables';
import { classifyDbError, isNetworkFailure, loadErrorMessage, type DbErrorKind } from '../lib/dbErrors';
import type {
  AppData,
  Profile,
  TableName,
} from '../lib/types';

export type Mode = 'mounjaro' | 'fitness' | 'dieta';

export type Tab =
  | 'inicio'
  | 'aplicacoes'
  | 'evolucao'
  | 'diario'
  | 'perfil'
  | 'relatorio'
  | 'estoque'
  | 'fitness-inicio'
  | 'treinos'
  | 'rotina'
  | 'menu'
  | 'refeicoes'
  | 'evolucao-dieta'
  | 'compras';

interface ToastMsg {
  id: number;
  text: string;
  kind: 'success' | 'error' | 'info';
}

interface AppContextValue {
  ready: boolean;
  session: Session | null;
  demo: boolean;
  offline: boolean;
  data: AppData;
  toasts: ToastMsg[];
  showToast: (text: string, kind?: ToastMsg['kind']) => void;
  startDemo: () => void;
  exitDemo: () => void;
  openAuth: () => void;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  saveRow: <T extends { id?: string }>(
    table: TableName,
    values: Partial<T>,
  ) => Promise<{ ok: boolean; error?: string; id?: string }>;
  saveRows: <T extends object>(
    table: TableName,
    rows: Partial<T>[],
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteRow: (table: TableName, id: string) => Promise<{ ok: boolean; error?: string }>;
  restoreBackup: (
    payload: BackupPayload,
  ) => Promise<{
    ok: boolean;
    imported: number;
    failed: { field: string; error: string }[];
    error?: string;
  }>;
  updateProfile: (values: Partial<Profile>) => Promise<{ ok: boolean; error?: string }>;
  tab: Tab;
  setTab: (t: Tab) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  action: string | null;
  setAction: (a: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [demo, setDemo] = useState(false);
  const [offline, setOffline] = useState(false);
  const [data, setData] = useState<AppData>(emptyData);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [tab, setTab] = useState<Tab>('inicio');
  const [mode, setModeState] = useState<Mode>('mounjaro');
  const [action, setAction] = useState<string | null>(null);
  const toastId = useRef(0);
  const authModalRef = useRef<{ close: () => void } | null>(null);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    if (m === 'fitness') setTab('fitness-inicio');
    else if (m === 'dieta') setTab('refeicoes');
    else setTab('inicio');
  }, []);

  const showToast = useCallback((text: string, kind: ToastMsg['kind'] = 'success') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, kind }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  const ensureProfile = useCallback(async (): Promise<Profile | null> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return null;
    const uid = userData.user.id;
    const { data: prof, error: selError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();
    if (selError) {
      // Log técnico sem dados pessoais (apenas código e mensagem do banco).
      console.error('[profile] falha ao carregar:', selError.code ?? '', selError.message);
      return null;
    }
    if (prof) return prof as Profile;
    const insert = {
      user_id: uid,
      full_name:
        (userData.user.user_metadata?.name as string | undefined) ||
        userData.user.email?.split('@')[0] ||
        null,
    };
    const { data: created, error: insError } = await supabase
      .from('profiles')
      .insert(insert)
      .select()
      .single();
    if (insError) {
      console.error('[profile] falha ao criar:', insError.code ?? '', insError.message);
      showToast('Não foi possível carregar seu perfil. Tente atualizar em alguns instantes.', 'error');
      return null;
    }
    return (created as Profile) || null;
  }, [showToast]);

  const reload = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    const sessionUser = s.session?.user;
    if (!sessionUser) {
      setData(emptyData);
      return;
    }
    const uid = sessionUser.id;
    if (!navigator.onLine) {
      setOffline(true);
      const snap = loadSnapshot(uid);
      if (snap) setData(snap);
      return;
    }
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      showToast('Sua sessão expirou. Entre novamente para carregar seus dados.', 'error');
      return;
    }
    const profile = await ensureProfile();
    const result: AppData = { ...emptyData, profile };
    const failures: { table: string; kind: DbErrorKind }[] = [];
    await Promise.all(
      TABLE_SPECS.map(async (spec) => {
        let query = supabase
          .from(spec.table)
          .select(spec.columns.join(','))
          .eq('user_id', uid);
        if (spec.windowMonths) {
          query = query.gte(spec.dateColumn, windowCutoff(spec.windowMonths));
        }
        query = query.order(spec.dateColumn, { ascending: false });
        const { data: rows, error } = await query;
        if (!error && rows) {
          (result as unknown as Record<string, unknown>)[spec.field] = rows;
        } else if (error) {
          const kind = classifyDbError(error);
          failures.push({ table: spec.table, kind });
          console.error(`[reload] falha em ${spec.table}:`, error.code ?? '', error.message);
        }
      }),
    );

    if (failures.length === 0) {
      setOffline(false);
      setData(result);
      saveSnapshot(uid, result);
      return;
    }

    // Distingue falha total de parcial e tipo de erro — sem confundir com offline.
    const kinds = [...new Set(failures.map((f) => f.kind))];
    const allNetwork = kinds.every(isNetworkFailure);

    if (failures.length === TABLE_SPECS.length && allNetwork) {
      setOffline(true);
      const snap = loadSnapshot(uid);
      if (snap) setData(snap);
      showToast(loadErrorMessage('network'), 'error');
      return;
    }

    if (failures.length === TABLE_SPECS.length) {
      // Falha total por outro motivo (ex.: esquema/permission): mantém o cache
      // local legível e informa o motivo real.
      setOffline(false);
      const snap = loadSnapshot(uid);
      if (snap) setData(snap);
      showToast(loadErrorMessage(kinds[0] ?? 'unknown'), 'error');
      return;
    }

    // Falha parcial: mantém o que carregou e avisa quais recursos faltam.
    setOffline(false);
    setData(result);
    saveSnapshot(uid, result);
    const kind = kinds.find((k) => !isNetworkFailure(k)) ?? 'network';
    showToast(
      `${loadErrorMessage(kind)} (${failures.length} de ${TABLE_SPECS.length} seções)`,
      'error',
    );
  }, [ensureProfile, showToast]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: s }) => {
      if (!mounted) return;
      setSession(s.session);
      if (s.session) {
        const snap = loadSnapshot(s.session.user.id);
        if (snap) setData(snap);
        reload().finally(() => setReady(true));
      } else {
        setReady(true);
      }
    });
    const handleOnline = () => {
      if (!mounted) return;
      setOffline(false);
      reload();
    };
    const handleOffline = () => {
      if (mounted) setOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setDemo(false);
        reload();
      }
      if (event === 'SIGNED_IN') {
        authModalRef.current?.close();
        authModalRef.current = null;
      }
      if (event === 'SIGNED_OUT') {
        setData(emptyData);
        setDemo(false);
        setOffline(false);
      }
    });
    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      sub.subscription.unsubscribe();
    };
  }, [reload]);

  const openAuth = useCallback(() => {
    authModalRef.current = auth.openSignInModal();
  }, []);

  const signOut = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;
    await supabase.auth.signOut();
    if (uid) clearSnapshot(uid);
    setData(emptyData);
    setTab('inicio');
  }, []);

  const startDemo = useCallback(() => {
    setDemo(true);
    setData(buildDemoData());
  }, []);

  const exitDemo = useCallback(() => {
    setDemo(false);
    setData(emptyData);
  }, []);

  const saveRow = useCallback(
    async <T extends { id?: string }>(
      table: TableName,
      values: Partial<T>,
    ): Promise<{ ok: boolean; error?: string; id?: string }> => {
      if (demo) {
        showToast('Modo demonstração: dados fictícios não são salvos.', 'info');
        return { ok: true };
      }
      if (!navigator.onLine) {
        showToast('Você está offline. Reconecte-se para salvar alterações.', 'error');
        return { ok: false, error: 'offline' };
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };
      const payload = { ...values, user_id: userData.user.id } as Record<string, unknown>;
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      const id = (values as { id?: string }).id;
      let error: string | null = null;
      if (id) {
        const res = await supabase.from(table).update(payload).eq('id', id).eq('user_id', userData.user.id);
        error = res.error?.message ?? null;
      } else {
        const res = await supabase.from(table).insert(payload).select().single();
        error = res.error?.message ?? null;
        if (!error && res.data) {
          (values as { id?: string }).id = (res.data as { id: string }).id;
        }
      }
      if (error) {
        showToast('Não foi possível salvar: ' + error, 'error');
        return { ok: false, error };
      }
      await reload();
      showToast('Registro salvo com sucesso.');
      return { ok: true, id };
    },
    [demo, reload, showToast],
  );

  const saveRows = useCallback(
    async <T extends object>(
      table: TableName,
      rows: Partial<T>[],
    ): Promise<{ ok: boolean; error?: string }> => {
      if (rows.length === 0) return { ok: true };
      if (demo) {
        showToast('Modo demonstração: dados fictícios não são salvos.', 'info');
        return { ok: true };
      }
      if (!navigator.onLine) {
        showToast('Você está offline. Reconecte-se para salvar alterações.', 'error');
        return { ok: false, error: 'offline' };
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };
      const payload = rows.map((r) => ({ ...r, user_id: userData.user.id }));
      const { error } = await supabase.from(table).insert(payload);
      if (error) {
        showToast('Não foi possível salvar: ' + error.message, 'error');
        return { ok: false, error: error.message };
      }
      await reload();
      return { ok: true };
    },
    [demo, reload, showToast],
  );

  const deleteRow = useCallback(
    async (table: TableName, id: string): Promise<{ ok: boolean; error?: string }> => {
      if (demo) {
        showToast('Modo demonstração: dados fictícios não são alterados.', 'info');
        return { ok: true };
      }
      if (!navigator.onLine) {
        showToast('Você está offline. Reconecte-se para excluir registros.', 'error');
        return { ok: false, error: 'offline' };
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { ok: false, error: 'Sessão expirada.' };
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', userData.user.id);
      if (error) {
        showToast('Não foi possível excluir: ' + error.message, 'error');
        return { ok: false, error: error.message };
      }
      await reload();
      showToast('Registro excluído.');
      return { ok: true };
    },
    [demo, reload, showToast],
  );

  const restoreBackup = useCallback(
    async (
      payload: BackupPayload,
    ): Promise<{
      ok: boolean;
      imported: number;
      failed: { field: string; error: string }[];
      error?: string;
    }> => {
      if (demo) {
        showToast('Modo demonstração: backup não é restaurado em dados fictícios.', 'info');
        return { ok: false, imported: 0, failed: [] };
      }
      if (!navigator.onLine) {
        showToast('Você está offline. Reconecte-se para restaurar o backup.', 'error');
        return { ok: false, imported: 0, failed: [], error: 'offline' };
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        showToast('Sessão expirada. Entre novamente.', 'error');
        return { ok: false, imported: 0, failed: [], error: 'Sessão expirada.' };
      }
      const uid = userData.user.id;
      let imported = 0;
      const failed: { field: string; error: string }[] = [];
      // Um erro em uma seção não aborta as demais; o resumo final informa tudo.
      for (const { field, table } of IMPORT_FIELDS) {
        const rows = payload.rows[field];
        if (!rows?.length) continue;
        const existing = data[field as keyof AppData] as { id?: string }[] | undefined;
        const existingIds = new Set((existing ?? []).map((r) => r.id).filter(Boolean));
        const fresh = rows.filter((r) => !existingIds.has(r.id as string));
        for (let i = 0; i < fresh.length; i += 200) {
          const chunk = fresh.slice(i, i + 200).map((r) => ({ ...r, user_id: uid }));
          const { error } = await supabase.from(table).insert(chunk);
          if (error) {
            console.error(`[restore] falha em ${table}:`, error.code ?? '', error.message);
            failed.push({ field, error: error.message });
            break;
          }
          imported += chunk.length;
        }
      }
      let profileError: string | null = null;
      if (payload.profile) {
        const p = { ...payload.profile } as Record<string, unknown>;
        delete p.id;
        delete p.user_id;
        delete p.created_at;
        delete p.updated_at;
        const { error } = await supabase.from('profiles').update(p).eq('user_id', uid);
        if (error) {
          console.error('[restore] falha no perfil:', error.code ?? '', error.message);
          profileError = error.message;
          failed.push({ field: 'profile', error: error.message });
        }
      }
      await reload();
      return {
        ok: failed.length === 0,
        imported,
        failed,
        error: profileError ?? failed[0]?.error,
      };
    },
    [demo, data, reload, showToast],
  );

  const updateProfile = useCallback(
    async (values: Partial<Profile>): Promise<{ ok: boolean; error?: string }> => {
      if (demo) {
        showToast('Modo demonstração: dados fictícios não são salvos.', 'info');
        return { ok: true };
      }
      if (!navigator.onLine) {
        showToast('Você está offline. Reconecte-se para salvar alterações.', 'error');
        return { ok: false, error: 'offline' };
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { ok: false, error: 'Sessão expirada.' };
      const payload = { ...values } as Record<string, unknown>;
      delete payload.id;
      delete payload.user_id;
      delete payload.created_at;
      delete payload.updated_at;
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('user_id', userData.user.id);
      if (error) {
        showToast('Não foi possível salvar: ' + error.message, 'error');
        return { ok: false, error: error.message };
      }
      await reload();
      showToast('Configurações salvas.');
      return { ok: true };
    },
    [demo, reload, showToast],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      session,
      demo,
      offline,
      data,
      toasts,
      showToast,
      startDemo,
      exitDemo,
      openAuth,
      signOut,
      reload,
      saveRow,
      saveRows,
      deleteRow,
      restoreBackup,
      updateProfile,
      tab,
      setTab,
      mode,
      setMode,
      action,
      setAction,
    }),
    [
      ready, session, demo, offline, data, toasts, showToast, startDemo, exitDemo,
      openAuth, signOut, reload, saveRow, saveRows, deleteRow, restoreBackup, updateProfile,
      tab, mode, setMode, action,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
