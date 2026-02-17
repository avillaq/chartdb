export interface SupabaseUser {
    id: string;
    email?: string;
}

export interface SupabaseSession {
    access_token: string;
    refresh_token?: string;
    user: SupabaseUser;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
    Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

export const supabase = null;
