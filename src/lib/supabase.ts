import { createClient } from '@supabase/supabase-js';
import { createVerdentAuth } from '@verdent/auth-js';
import { Capacitor } from '@capacitor/core';

/**
 * URL pública do app publicado (config pública, não segredo).
 * No APK (Capacitor) a origem da WebView é localhost, então as chamadas
 * de autenticação/dados devem apontar para a URL ativa do app.
 */
export const SITE_URL = 'https://mounjaro-diary-u0x3xmv.verdent.app';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (Capacitor.isNativePlatform() ? SITE_URL : window.location.origin);
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'verdent-baas-proxy';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const auth = createVerdentAuth({
  supabase,
  ...(import.meta.env.VITE_VERDENT_OAUTH_INITIATE_URL
    ? { oauth: { authorizeUrl: import.meta.env.VITE_VERDENT_OAUTH_INITIATE_URL } }
    : {}),
});
