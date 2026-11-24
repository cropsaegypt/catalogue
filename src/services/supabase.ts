import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://krxghdnhqqjjospwspaf.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_uaVnPKGEq4vKVPlL761I_g_ox2L9Q0O';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
