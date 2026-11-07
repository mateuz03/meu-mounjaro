import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from './supabase';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Fluxo Google no APK: abre o OAuth num Custom Tab e volta ao app via
 * deep link com o código/tokens da sessão.
 */
export async function signInWithGoogleNative(): Promise<{ error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth-callback.html`,
        skipBrowserRedirect: true,
      },
    });
    if (error) return { error: error.message };
    if (!data?.url) return { error: 'Não foi possível iniciar o login do Google.' };
    await Browser.open({ url: data.url });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Registra listeners deep link + interceptação do botão Google (apenas no APK). */
export function registerNativeAuthBridge(onSignedIn?: () => void): void {
  if (!isNativeApp()) return;

  void CapApp.addListener('appUrlOpen', async ({ url }) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return;
    }
    if (!(parsed.host === 'auth' || parsed.pathname.replace(/\/+$/, '') === '/auth/callback')) return;
    const p = parsed.searchParams;
    void Browser.close().catch(() => undefined);
    try {
      const code = p.get('code');
      const err = p.get('oauth_error');
      const access = p.get('access_token');
      const refresh = p.get('refresh_token');
      if (err) {
        console.error('[nativeAuth]', err);
        return;
      }
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } else if (access && refresh) {
        const { error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
        if (error) throw error;
      }
      onSignedIn?.();
    } catch (e) {
      console.error('[nativeAuth] falha ao concluir login:', e);
    }
  });

  // O modal do @verdent/auth-js usa window.open (popup), que não existe na
  // WebView. Intercepta o clique do botão Google e roda o fluxo Custom Tab.
  document.addEventListener(
    'click',
    (ev) => {
      const target = ev.target as HTMLElement | null;
      const btn = target?.closest?.('button') as HTMLElement | null;
      if (!btn) return;
      if (!/google/i.test(btn.textContent || '')) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      void signInWithGoogleNative();
    },
    true,
  );
}
