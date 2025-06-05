import { createBrowserClient } from '@supabase/ssr';

// Read environment variables from .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

console.log('[Supabase] URL:', supabaseUrl);
console.log('[Supabase] Anon Key:', supabaseAnonKey ? 'SET' : 'NOT SET');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.');
}

// Create a Supabase client for browser/SSR usage
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
console.log('[Supabase] Client initialized:', !!supabase);

// Test query block removed as it is not needed in production. 