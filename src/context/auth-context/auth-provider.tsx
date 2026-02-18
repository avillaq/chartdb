import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { authContext } from './auth-context';
import Dexie from 'dexie';
import {
    isSupabaseConfigured,
    type SupabaseSession,
    type SupabaseUser,
} from '@/lib/supabase';

const SESSION_STORAGE_KEY = 'chartdb.supabase.session';
const TOKEN_REFRESH_BUFFER_SECONDS = 60;

const parseJwtPayload = (token: string): Record<string, unknown> | null => {
    try {
        const payloadRaw = token.split('.')[1];

        if (!payloadRaw) {
            return null;
        }

        const normalizedPayload = payloadRaw
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const paddedPayload = normalizedPayload.padEnd(
            Math.ceil(normalizedPayload.length / 4) * 4,
            '='
        );

        return JSON.parse(atob(paddedPayload));
    } catch {
        return null;
    }
};

const parseUserFromJwt = (accessToken: string): SupabaseUser | null => {
    const payload = parseJwtPayload(accessToken);

    if (!payload || typeof payload.sub !== 'string') {
        return null;
    }

    return {
        id: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
    };
};

const isTokenExpired = (accessToken: string, bufferSeconds = 0) => {
    const payload = parseJwtPayload(accessToken);

    if (!payload || typeof payload.exp !== 'number') {
        return true;
    }

    const expirationMs = payload.exp * 1000;
    return Date.now() + bufferSeconds * 1000 >= expirationMs;
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
    children,
}) => {
    const [session, setSession] = useState<SupabaseSession | null>(null);
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const refreshPromiseRef = useRef<Promise<SupabaseSession | null> | null>(
        null
    );

    const clearSession = useCallback(() => {
        setSession(null);
        setUser(null);
        localStorage.removeItem(SESSION_STORAGE_KEY);
        Dexie.delete('ChartDB')
            .then(() => console.log('ChartDB deleted'))
            .catch(() => {});
    }, []);

    const refreshSession = useCallback(
        async (refreshToken?: string): Promise<SupabaseSession | null> => {
            if (!isSupabaseConfigured || !refreshToken) {
                clearSession();
                return null;
            }

            if (refreshPromiseRef.current) {
                return refreshPromiseRef.current;
            }

            refreshPromiseRef.current = (async () => {
                const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
                    {
                        method: 'POST',
                        headers: {
                            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            refresh_token: refreshToken,
                        }),
                    }
                );

                if (!response.ok) {
                    clearSession();
                    return null;
                }

                const data = await response.json();
                const parsedUser = parseUserFromJwt(data.access_token);

                if (!parsedUser) {
                    clearSession();
                    return null;
                }

                const nextSession: SupabaseSession = {
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    user: parsedUser,
                };

                localStorage.setItem(
                    SESSION_STORAGE_KEY,
                    JSON.stringify(nextSession)
                );
                setSession(nextSession);
                setUser(parsedUser);
                return nextSession;
            })();

            const result = await refreshPromiseRef.current;
            refreshPromiseRef.current = null;
            return result;
        },
        [clearSession]
    );

    useEffect(() => {
        const init = async () => {
            const hashParams = new URLSearchParams(
                window.location.hash.slice(1)
            );
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

            if (!rawSession) {
                setLoading(false);
                return;
            }

            try {
                const stored = JSON.parse(rawSession) as SupabaseSession;

                if (
                    isTokenExpired(
                        stored.access_token,
                        TOKEN_REFRESH_BUFFER_SECONDS
                    )
                ) {
                    await refreshSession(stored.refresh_token);
                } else {
                    setSession(stored);
                    setUser(stored.user);
                }
            } catch {
                clearSession();
            }

            setLoading(false);
        };

        void init();
    }, [clearSession, refreshSession]);

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
        clearSession();
    }, [clearSession]);

    const getAccessToken = useCallback(async (): Promise<string | null> => {
        const activeSession = session;

        if (!activeSession?.access_token) {
            return null;
        }

        if (
            isTokenExpired(
                activeSession.access_token,
                TOKEN_REFRESH_BUFFER_SECONDS
            )
        ) {
            const refreshedSession = await refreshSession(
                activeSession.refresh_token
            );

            return refreshedSession?.access_token ?? null;
        }

        return activeSession.access_token;
    }, [session, refreshSession]);

    const value = useMemo(
        () => ({
            user,
            session,
            loading,
            isAuthenticated: Boolean(user),
            signInWithOtp,
            signOut,
            getAccessToken,
        }),
        [user, session, loading, signInWithOtp, signOut, getAccessToken]
    );

    return (
        <authContext.Provider value={value}>{children}</authContext.Provider>
    );
};
