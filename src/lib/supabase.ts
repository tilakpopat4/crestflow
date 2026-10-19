import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || (typeof process !== 'undefined' ? process.env : {}) || {};
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://uukriftpinzoyjjzmvth.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'anon-key-placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
