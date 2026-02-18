import type { Diagram } from '@/lib/domain/diagram';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const request = async ({
    path,
    method,
    accessToken,
    body,
    prefer,
}: {
    path: string;
    method: 'POST' | 'DELETE';
    accessToken: string;
    body?: unknown;
    prefer?: string;
}) => {
    if (method === 'POST' && Array.isArray(body) && body.length === 0) {
        return;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        method,
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: prefer ?? 'resolution=merge-duplicates,return=minimal',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }
};

const getRequest = async ({
    path,
    accessToken,
}: {
    path: string;
    accessToken: string;
}) => {
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        method: 'GET',
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.json();
};

interface CloudDiagramRow {
    id: string;
    name: string;
    database_type: Diagram['databaseType'];
    database_edition?: Diagram['databaseEdition'];
    created_at: string;
    updated_at: string;
}

interface CloudDiagramChildRow<T> {
    diagram_id: string;
    data: T;
}

const fetchDiagramChildren = async <T>({
    table,
    userId,
    accessToken,
}: {
    table:
        | 'db_tables'
        | 'db_relationships'
        | 'db_dependencies'
        | 'areas'
        | 'db_custom_types'
        | 'notes';
    userId: string;
    accessToken: string;
}): Promise<Map<string, T[]>> => {
    const rows = (await getRequest({
        path: `${table}?select=diagram_id,data&user_id=eq.${userId}`,
        accessToken,
    })) as CloudDiagramChildRow<T>[];

    const groupedRows = new Map<string, T[]>();

    for (const row of rows) {
        const currentRows = groupedRows.get(row.diagram_id) ?? [];
        currentRows.push(row.data);
        groupedRows.set(row.diagram_id, currentRows);
    }

    return groupedRows;
};

export const fetchDiagramsFromCloud = async ({
    userId,
    accessToken,
}: {
    userId: string;
    accessToken?: string;
}): Promise<Diagram[]> => {
    if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
        return [];
    }

    const diagramRows = (await getRequest({
        path: `diagrams?select=id,name,database_type,database_edition,created_at,updated_at&user_id=eq.${userId}&order=updated_at.desc`,
        accessToken,
    })) as CloudDiagramRow[];

    if (diagramRows.length === 0) {
        return [];
    }

    const [
        tablesByDiagram,
        relationshipsByDiagram,
        dependenciesByDiagram,
        areasByDiagram,
        customTypesByDiagram,
        notesByDiagram,
    ] = await Promise.all([
        fetchDiagramChildren<NonNullable<Diagram['tables']>[number]>({
            table: 'db_tables',
            userId,
            accessToken,
        }),
        fetchDiagramChildren<NonNullable<Diagram['relationships']>[number]>({
            table: 'db_relationships',
            userId,
            accessToken,
        }),
        fetchDiagramChildren<NonNullable<Diagram['dependencies']>[number]>({
            table: 'db_dependencies',
            userId,
            accessToken,
        }),
        fetchDiagramChildren<NonNullable<Diagram['areas']>[number]>({
            table: 'areas',
            userId,
            accessToken,
        }),
        fetchDiagramChildren<NonNullable<Diagram['customTypes']>[number]>({
            table: 'db_custom_types',
            userId,
            accessToken,
        }),
        fetchDiagramChildren<NonNullable<Diagram['notes']>[number]>({
            table: 'notes',
            userId,
            accessToken,
        }),
    ]);

    return diagramRows.map((diagramRow) => ({
        id: diagramRow.id,
        name: diagramRow.name,
        databaseType: diagramRow.database_type,
        databaseEdition: diagramRow.database_edition,
        createdAt: new Date(diagramRow.created_at),
        updatedAt: new Date(diagramRow.updated_at),
        tables: tablesByDiagram.get(diagramRow.id) ?? [],
        relationships: relationshipsByDiagram.get(diagramRow.id) ?? [],
        dependencies: dependenciesByDiagram.get(diagramRow.id) ?? [],
        areas: areasByDiagram.get(diagramRow.id) ?? [],
        customTypes: customTypesByDiagram.get(diagramRow.id) ?? [],
        notes: notesByDiagram.get(diagramRow.id) ?? [],
    }));
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

    const diagramRow = {
        id: diagram.id,
        user_id: userId,
        name: diagram.name,
        database_type: diagram.databaseType,
        database_edition: diagram.databaseEdition,
        created_at: diagram.createdAt,
        updated_at: diagram.updatedAt,
    };

    try {
        await request({
            path: 'diagrams',
            method: 'POST',
            accessToken,
            body: [diagramRow],
        });
    } catch (error) {
        // Some deployments are missing UPDATE policies for diagrams.
        // In that case UPSERT (merge-duplicates) fails with 403.
        // Fallback to delete+insert to keep sync working.
        const errorMessage =
            error instanceof Error ? error.message.toLowerCase() : '';
        const isForbidden = errorMessage.includes('403');

        if (!isForbidden) {
            throw error;
        }

        await request({
            path: `diagrams?id=eq.${diagram.id}&user_id=eq.${userId}`,
            method: 'DELETE',
            accessToken,
            prefer: 'return=minimal',
        });

        await request({
            path: 'diagrams',
            method: 'POST',
            accessToken,
            body: [diagramRow],
            prefer: 'return=minimal',
        });
    }

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
        request({
            path: 'db_dependencies',
            method: 'POST',
            accessToken,
            body: (diagram.dependencies ?? []).map((dependency) => ({
                id: dependency.id,
                diagram_id: diagram.id,
                user_id: userId,
                data: dependency,
            })),
        }),
        request({
            path: 'areas',
            method: 'POST',
            accessToken,
            body: (diagram.areas ?? []).map((area) => ({
                id: area.id,
                diagram_id: diagram.id,
                user_id: userId,
                data: area,
            })),
        }),
        request({
            path: 'db_custom_types',
            method: 'POST',
            accessToken,
            body: (diagram.customTypes ?? []).map((customType) => ({
                id: customType.id,
                diagram_id: diagram.id,
                user_id: userId,
                data: customType,
            })),
        }),
        request({
            path: 'notes',
            method: 'POST',
            accessToken,
            body: (diagram.notes ?? []).map((note) => ({
                id: note.id,
                diagram_id: diagram.id,
                user_id: userId,
                data: note,
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
