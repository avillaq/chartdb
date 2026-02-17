import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useChartDB } from '@/hooks/use-chartdb';
import { useAuth } from '@/context/auth-context/use-auth';
import { cloudSyncContext, type SyncStatus } from './use-cloud-sync';
import { syncDiagramToCloud } from '@/lib/cloud-sync';

const AUTO_SYNC_DEBOUNCE_MS = 1500;

export const CloudSyncProvider: React.FC<React.PropsWithChildren> = ({
    children,
}) => {
    const { currentDiagram } = useChartDB();
    const { user, isAuthenticated, getAccessToken } = useAuth();
    const [status, setStatus] = useState<SyncStatus>('idle');
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const timeoutRef = useRef<number | undefined>(undefined);

    const triggerSync = useCallback(async () => {
        if (!isAuthenticated || !user || !currentDiagram?.id) {
            setStatus('idle');
            setError(null);
            return;
        }

        setStatus('syncing');
        setError(null);

        try {
            await syncDiagramToCloud({
                diagram: currentDiagram,
                userId: user.id,
                accessToken: (await getAccessToken()) ?? undefined,
            });
            setStatus('synced');
            setLastSyncedAt(new Date());
        } catch (syncError) {
            setStatus('error');
            setError(
                syncError instanceof Error
                    ? syncError.message
                    : 'No se pudo sincronizar con la nube.'
            );
        }
    }, [currentDiagram, isAuthenticated, user, getAccessToken]);

    useEffect(() => {
        if (!isAuthenticated || !currentDiagram?.id) {
            return;
        }

        setStatus('pending');

        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
            void triggerSync();
        }, AUTO_SYNC_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeoutRef.current);
        };
    }, [
        currentDiagram?.updatedAt,
        currentDiagram?.tables,
        currentDiagram?.relationships,
        currentDiagram?.dependencies,
        currentDiagram?.areas,
        currentDiagram?.customTypes,
        currentDiagram?.notes,
        currentDiagram?.id,
        isAuthenticated,
        triggerSync,
    ]);

    const value = useMemo(
        () => ({
            status,
            lastSyncedAt,
            error,
            triggerSync,
        }),
        [status, lastSyncedAt, error, triggerSync]
    );

    return (
        <cloudSyncContext.Provider value={value}>
            {children}
        </cloudSyncContext.Provider>
    );
};
