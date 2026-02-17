import { createContext, useContext } from 'react';
import { emptyFn } from '@/lib/utils';

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error';

export interface CloudSyncContext {
    status: SyncStatus;
    lastSyncedAt: Date | null;
    error: string | null;
    triggerSync: () => Promise<void>;
}

export const cloudSyncContext = createContext<CloudSyncContext>({
    status: 'idle',
    lastSyncedAt: null,
    error: null,
    triggerSync: emptyFn,
});

export const useCloudSync = () => useContext(cloudSyncContext);
