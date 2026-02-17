import React from 'react';
import { Cloud, CloudOff, LoaderCircle } from 'lucide-react';
import { useCloudSync } from '@/context/cloud-sync-context/use-cloud-sync';
import { Button } from '@/components/button/button';

const statusMap = {
    idle: 'Local',
    pending: 'Pendiente',
    syncing: 'Sincronizando',
    synced: 'Sincronizado',
    error: 'Error',
} as const;

export const SyncStatus: React.FC = () => {
    const { status, triggerSync } = useCloudSync();

    const icon =
        status === 'syncing' ? (
            <LoaderCircle className="size-4 animate-spin" />
        ) : status === 'error' ? (
            <CloudOff className="size-4" />
        ) : (
            <Cloud className="size-4" />
        );

    return (
        <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => void triggerSync()}
            title="Sincronizar con la nube"
        >
            {icon}
            {statusMap[status]}
        </Button>
    );
};
