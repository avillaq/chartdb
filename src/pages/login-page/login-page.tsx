import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/input/input';
import { Button } from '@/components/button/button';
import { useAuth } from '@/context/auth-context/use-auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { signInWithOtp, isAuthenticated, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (isAuthenticated && !loading) {
            navigate('/');
        }
    }, [isAuthenticated, loading, navigate]);

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSending(true);
        setError(null);
        setMessage(null);

        const response = await signInWithOtp(email);

        if (response.error) {
            setError(response.error);
            setSending(false);
            return;
        }

        setMessage('Revisa tu email para completar el login.');
        setSending(false);
    };

    return (
        <section className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4">
            <h1 className="text-2xl font-bold">Iniciar sesión</h1>
            <p className="mb-6 mt-2 text-muted-foreground">
                Activa sincronización automática en la nube.
            </p>
            {!isSupabaseConfigured && (
                <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                    Falta configuración: define VITE_SUPABASE_URL y
                    VITE_SUPABASE_ANON_KEY.
                </p>
            )}
            <form className="space-y-3" onSubmit={onSubmit}>
                <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tu@email.com"
                    required
                />
                <Button
                    type="submit"
                    disabled={sending || !isSupabaseConfigured}
                >
                    {sending ? 'Enviando...' : 'Enviar magic link'}
                </Button>
                {message && <p className="text-sm text-green-600">{message}</p>}
                {error && <p className="text-sm text-destructive">{error}</p>}
            </form>
        </section>
    );
};
