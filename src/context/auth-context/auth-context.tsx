import { createContext } from 'react';
import { emptyFn } from '@/lib/utils';
import type { SupabaseSession, SupabaseUser } from '@/lib/supabase';

export interface AuthContext {
    user: SupabaseUser | null;
    session: SupabaseSession | null;
    loading: boolean;
    isAuthenticated: boolean;
    signInWithOtp: (email: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    getAccessToken: () => Promise<string | null>;
}

export const authContext = createContext<AuthContext>({
    user: null,
    session: null,
    loading: true,
    isAuthenticated: false,
    signInWithOtp: emptyFn,
    signOut: emptyFn,
    getAccessToken: emptyFn,
});
