import { createClient } from '@supabase/supabase-js';
import { createVerdentAuth } from '@verdent/auth-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || window.location.origin;
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
