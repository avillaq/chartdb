import { describe, expect, it } from 'vitest';
import { diagramFromJSONInput } from '@/lib/export-import-utils';
import { DatabaseType } from '@/lib/domain/database-type';

describe('diagramFromJSONInput', () => {
    it('should accept null databaseEdition in imported JSON', () => {
        const input = JSON.stringify({
            id: 'diagram-1',
            name: 'Imported Diagram',
            databaseType: DatabaseType.POSTGRESQL,
            databaseEdition: null,
            tables: [],
            relationships: [],
            dependencies: [],
            areas: [],
            customTypes: [],
            notes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        const diagram = diagramFromJSONInput(input);

        expect(diagram.name).toBe('Imported Diagram');
        expect(diagram.databaseType).toBe(DatabaseType.POSTGRESQL);
        expect(diagram.databaseEdition).toBeUndefined();
    });
});
