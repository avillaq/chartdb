import type {
    Cardinality,
    DBField,
    DBRelationship,
    DBTable,
} from '@/lib/domain';
import {
    parseReferentialAction,
    schemaNameToDomainSchemaName,
} from '@/lib/domain';
import type { ForeignKeyInfo } from '../metadata-types/foreign-key-info';
import { generateId } from '@/lib/utils';

const parseRelationshipActionsFromDefinition = (fkDef: string) => {
    const deleteMatch = fkDef.match(
        /ON\s+DELETE\s+(NO\s+ACTION|RESTRICT|CASCADE|SET\s+NULL|SET\s+DEFAULT)/i
    );
    const updateMatch = fkDef.match(
        /ON\s+UPDATE\s+(NO\s+ACTION|RESTRICT|CASCADE|SET\s+NULL|SET\s+DEFAULT)/i
    );

    return {
        onDelete: parseReferentialAction(deleteMatch?.[1]),
        onUpdate: parseReferentialAction(updateMatch?.[1]),
    };
};

const determineCardinality = (
    field: DBField,
    isTablePKComplex: boolean
): Cardinality => {
    return field.unique || (field.primaryKey && !isTablePKComplex)
        ? 'one'
        : 'many';
};

export const createRelationshipsFromMetadata = ({
    foreignKeys,
    tables,
}: {
    foreignKeys: ForeignKeyInfo[];
    tables: DBTable[];
}): DBRelationship[] => {
    return foreignKeys
        .map((fk: ForeignKeyInfo): DBRelationship | null => {
            const schema = schemaNameToDomainSchemaName(fk.schema);
            const sourceTable = tables.find(
                (table) => table.name === fk.table && table.schema === schema
            );

            const targetSchema = schemaNameToDomainSchemaName(
                fk.reference_schema
            );

            const targetTable = tables.find(
                (table) =>
                    table.name === fk.reference_table &&
                    table.schema === targetSchema
            );
            const sourceField = sourceTable?.fields.find(
                (field) => field.name === fk.column
            );
            const targetField = targetTable?.fields.find(
                (field) => field.name === fk.reference_column
            );

            const isSourceTablePKComplex =
                (sourceTable?.fields.filter((field) => field.primaryKey) ?? [])
                    .length > 1;
            const isTargetTablePKComplex =
                (targetTable?.fields.filter((field) => field.primaryKey) ?? [])
                    .length > 1;

            if (sourceTable && targetTable && sourceField && targetField) {
                // In ForeignKeyInfo: schema/table/column = FK table, reference_* = PK table
                // In DBRelationship: source = referenced table (PK), target = FK table
                // So we swap them here
                const sourceCardinality = determineCardinality(
                    targetField,
                    isTargetTablePKComplex
                );
                const targetCardinality = determineCardinality(
                    sourceField,
                    isSourceTablePKComplex
                );

                const { onDelete, onUpdate } =
                    parseRelationshipActionsFromDefinition(fk.fk_def);

                return {
                    id: generateId(),
                    name: fk.foreign_key_name,
                    sourceSchema: targetSchema,
                    targetSchema: schema,
                    sourceTableId: targetTable.id,
                    targetTableId: sourceTable.id,
                    sourceFieldId: targetField.id,
                    targetFieldId: sourceField.id,
                    sourceCardinality,
                    targetCardinality,
                    onDelete,
                    onUpdate,
                    createdAt: Date.now(),
                };
            }

            return null;
        })
        .filter((rel) => rel !== null) as DBRelationship[];
};
