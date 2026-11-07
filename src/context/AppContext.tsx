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
  ) => Promise<{ ok: boolean; imported: number; error?: string }>;
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

const TABLES: Exclude<TableName, 'profiles'>[] = [
  'medication_applications',
  'body_measurements',
  'daily_logs',
  'perceived_effects',
  'reminders',
  'appointments',
  'medication_inventory',
  'consultation_notes',
  'gym_workouts',
  'gym_exercise_entries',
  'sport_activities',
  'fitness_routine_items',
  'fitness_weight_logs',
  'diet_menu_items',
  'diet_meal_logs',
  'diet_shopping_items',
];

const DATA_FIELD_BY_TABLE: Record<(typeof TABLES)[number], keyof AppData> = {
  medication_applications: 'applications',
  body_measurements: 'measurements',
  daily_logs: 'logs',
  perceived_effects: 'effects',
  reminders: 'reminders',
  appointments: 'appointments',
  medication_inventory: 'inventory',
  consultation_notes: 'notes',
  gym_workouts: 'gym_workouts',
  gym_exercise_entries: 'gym_exercise_entries',
  sport_activities: 'sport_activities',
  fitness_routine_items: 'fitness_routine_items',
  fitness_weight_logs: 'fitness_weight_logs',
  diet_menu_items: 'diet_menu_items',
  diet_meal_logs: 'diet_meal_logs',
  diet_shopping_items: 'diet_shopping_items',
};

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

  const ensureProfile = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    const uid = userData.user.id;
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();
    if (prof) return prof as Profile;
    const insert = {
      user_id: uid,
      full_name:
        (userData.user.user_metadata?.name as string | undefined) ||
        userData.user.email?.split('@')[0] ||
        null,
    };
    const { data: created } = await supabase
      .from('profiles')
      .insert(insert)
      .select()
      .single();
    return (created as Profile) || null;
  }, []);

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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const profile = await ensureProfile();
    const result: AppData = { ...emptyData, profile };
    let failed = false;
    await Promise.all(
      TABLES.map(async (t) => {
        const { data: rows, error } = await supabase.from(t).select('*').eq('user_id', userData.user!.id);
        if (!error && rows) {
          (result as unknown as Record<string, unknown>)[DATA_FIELD_BY_TABLE[t]] = rows;
        } else if (error) {
          failed = true;
        }
      }),
    );
    if (failed) {
      setOffline(true);
      return;
    }
    setOffline(false);
    setData(result);
    saveSnapshot(uid, result);
  }, [ensureProfile]);

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
    ): Promise<{ ok: boolean; imported: number; error?: string }> => {
      if (demo) {
        showToast('Modo demonstração: backup não é restaurado em dados fictícios.', 'info');
        return { ok: false, imported: 0, error: 'demo' };
      }
      if (!navigator.onLine) {
        showToast('Você está offline. Reconecte-se para restaurar o backup.', 'error');
        return { ok: false, imported: 0, error: 'offline' };
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        showToast('Sessão expirada. Entre novamente.', 'error');
        return { ok: false, imported: 0, error: 'Sessão expirada.' };
      }
      const uid = userData.user.id;
      let imported = 0;
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
            showToast(`Erro ao restaurar "${field}": ${error.message}`, 'error');
            await reload();
            return { ok: false, imported, error: error.message };
          }
          imported += chunk.length;
        }
      }
      if (payload.profile) {
        const p = { ...payload.profile } as Record<string, unknown>;
        delete p.id;
        delete p.user_id;
        delete p.created_at;
        delete p.updated_at;
        await supabase.from('profiles').update(p).eq('user_id', uid);
      }
      await reload();
      return { ok: true, imported };
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
