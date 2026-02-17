import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { authContext } from './auth-context';
import {
    isSupabaseConfigured,
    type SupabaseSession,
    type SupabaseUser,
} from '@/lib/supabase';

const SESSION_STORAGE_KEY = 'chartdb.supabase.session';

const parseUserFromJwt = (accessToken: string): SupabaseUser | null => {
    try {
        const payloadRaw = accessToken.split('.')[1];
        if (!payloadRaw) {
            return null;
        }

        const payload = JSON.parse(atob(payloadRaw));

        if (!payload.sub) {
            return null;
        }

        return {
            id: payload.sub,
            email: payload.email,
        };
    } catch {
        return null;
    }
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
    children,
}) => {
    const [session, setSession] = useState<SupabaseSession | null>(null);
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') ?? undefined;

        if (accessToken) {
            const parsedUser = parseUserFromJwt(accessToken);

            if (parsedUser) {
                const nextSession: SupabaseSession = {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    user: parsedUser,
                };

                localStorage.setItem(
                    SESSION_STORAGE_KEY,
                    JSON.stringify(nextSession)
                );
                setSession(nextSession);
                setUser(parsedUser);
            }

            window.history.replaceState(
                {},
                document.title,
                window.location.pathname + window.location.search
            );
            setLoading(false);
            return;
        }

        const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (rawSession) {
            try {
                const stored = JSON.parse(rawSession) as SupabaseSession;
                setSession(stored);
                setUser(stored.user);
            } catch {
                localStorage.removeItem(SESSION_STORAGE_KEY);
            }
        }

        setLoading(false);
    }, []);

    const signInWithOtp = useCallback(async (email: string) => {
        if (!isSupabaseConfigured) {
            return {
                error: 'Supabase no está configurado. Revisa VITE_SUPABASE_*.',
            };
        }

        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/otp`,
            {
                method: 'POST',
                headers: {
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    create_user: true,
                    data: {},
                    gotrue_meta_security: {},
                }),
            }
        );

        if (!response.ok) {
            const body = await response.text();
            return { error: body || 'No se pudo enviar el magic link.' };
        }

        return { error: null };
    }, []);

    const signOut = useCallback(async () => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setSession(null);
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({
            user,
            session,
            loading,
            isAuthenticated: Boolean(user),
            signInWithOtp,
            signOut,
        }),
        [user, session, loading, signInWithOtp, signOut]
    );

    return (
        <authContext.Provider value={value}>{children}</authContext.Provider>
    );
};
