import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Browser client with the publishable key. Without the env vars the app runs
// in demo mode: no sign-in, and the workspace lets you pick who to view as.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
