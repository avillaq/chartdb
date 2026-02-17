import type { Diagram } from '@/lib/domain/diagram';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const request = async ({
    path,
    method,
    accessToken,
    body,
}: {
    path: string;
    method: 'POST' | 'DELETE';
    accessToken: string;
    body?: unknown;
}) => {
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        method,
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }
};

const removeDiagramData = async ({
    diagramId,
    userId,
    accessToken,
}: {
    diagramId: string;
    userId: string;
    accessToken: string;
}) => {
    await Promise.all([
        request({
            path: `db_tables?diagram_id=eq.${diagramId}&user_id=eq.${userId}`,
            method: 'DELETE',
            accessToken,
        }),
        request({
            path: `db_relationships?diagram_id=eq.${diagramId}&user_id=eq.${userId}`,
            method: 'DELETE',
            accessToken,
        }),
        request({
            path: `db_dependencies?diagram_id=eq.${diagramId}&user_id=eq.${userId}`,
            method: 'DELETE',
            accessToken,
        }),
        request({
            path: `areas?diagram_id=eq.${diagramId}&user_id=eq.${userId}`,
            method: 'DELETE',
            accessToken,
        }),
        request({
            path: `db_custom_types?diagram_id=eq.${diagramId}&user_id=eq.${userId}`,
            method: 'DELETE',
            accessToken,
        }),
        request({
            path: `notes?diagram_id=eq.${diagramId}&user_id=eq.${userId}`,
            method: 'DELETE',
            accessToken,
        }),
    ]);
};

export const syncDiagramToCloud = async ({
    diagram,
    userId,
    accessToken,
}: {
    diagram: Diagram;
    userId: string;
    accessToken?: string;
}) => {
    if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
        return;
    }

    await request({
        path: 'diagrams',
        method: 'POST',
        accessToken,
        body: [
            {
                id: diagram.id,
                user_id: userId,
                name: diagram.name,
                database_type: diagram.databaseType,
                database_edition: diagram.databaseEdition,
                created_at: diagram.createdAt,
                updated_at: diagram.updatedAt,
            },
        ],
    });

    await removeDiagramData({ diagramId: diagram.id, userId, accessToken });

    await Promise.all([
        request({
            path: 'db_tables',
            method: 'POST',
            accessToken,
            body: (diagram.tables ?? []).map((table) => ({
                id: table.id,
                diagram_id: diagram.id,
                user_id: userId,
                data: table,
            })),
        }),
        request({
            path: 'db_relationships',
            method: 'POST',
            accessToken,
            body: (diagram.relationships ?? []).map((relationship) => ({
                id: relationship.id,
                diagram_id: diagram.id,
                user_id: userId,
                data: relationship,
            })),
        }),
    ]);
};

export const deleteDiagramFromCloud = async ({
    diagramId,
    userId,
    accessToken,
}: {
    diagramId: string;
    userId: string;
    accessToken?: string;
}) => {
    if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
        return;
    }

    await removeDiagramData({ diagramId, userId, accessToken });

    await request({
        path: `diagrams?id=eq.${diagramId}&user_id=eq.${userId}`,
        method: 'DELETE',
        accessToken,
    });
};
