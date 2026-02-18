import { z } from 'zod';

export interface DBRelationship {
    id: string;
    name: string;
    sourceSchema?: string | null;
    sourceTableId: string;
    targetSchema?: string | null;
    targetTableId: string;
    sourceFieldId: string;
    targetFieldId: string;
    sourceCardinality: Cardinality;
    targetCardinality: Cardinality;
    onDelete?: ReferentialAction;
    onUpdate?: ReferentialAction;
    createdAt: number;
}

export type ReferentialAction =
    | 'no_action'
    | 'restrict'
    | 'cascade'
    | 'set_null'
    | 'set_default';

const referentialActionValues = [
    'no_action',
    'restrict',
    'cascade',
    'set_null',
    'set_default',
] as const;

const referentialActionSchema = z.union(
    referentialActionValues.map((value) => z.literal(value)) as [
        z.ZodLiteral<(typeof referentialActionValues)[number]>,
        ...z.ZodLiteral<(typeof referentialActionValues)[number]>[],
    ]
);

export const dbRelationshipSchema: z.ZodType<DBRelationship> = z.object({
    id: z.string(),
    name: z.string(),
    sourceSchema: z.string().or(z.null()).optional(),
    sourceTableId: z.string(),
    targetSchema: z.string().or(z.null()).optional(),
    targetTableId: z.string(),
    sourceFieldId: z.string(),
    targetFieldId: z.string(),
    sourceCardinality: z.union([z.literal('one'), z.literal('many')]),
    targetCardinality: z.union([z.literal('one'), z.literal('many')]),
    onDelete: referentialActionSchema.optional(),
    onUpdate: referentialActionSchema.optional(),
    createdAt: z.number(),
});

export const referentialActionToSQL = (action?: ReferentialAction): string => {
    if (!action) {
        return 'NO ACTION';
    }

    return action.replace('_', ' ').toUpperCase();
};

export const buildReferentialActionsSQL = (relationship: {
    onDelete?: ReferentialAction;
    onUpdate?: ReferentialAction;
}): string => {
    const clauses: string[] = [];

    if (relationship.onDelete) {
        clauses.push(
            ` ON DELETE ${referentialActionToSQL(relationship.onDelete)}`
        );
    }

    if (relationship.onUpdate) {
        clauses.push(
            ` ON UPDATE ${referentialActionToSQL(relationship.onUpdate)}`
        );
    }

    return clauses.join('');
};

export const parseReferentialAction = (
    action?: string | null
): ReferentialAction | undefined => {
    if (!action) {
        return undefined;
    }

    const normalized = action.trim().toLowerCase().replace(/\s+/g, '_');
    return referentialActionValues.includes(normalized as ReferentialAction)
        ? (normalized as ReferentialAction)
        : undefined;
};

export type RelationshipType =
    | 'one_to_one'
    | 'one_to_many'
    | 'many_to_one'
    | 'many_to_many';
export type Cardinality = 'one' | 'many';

export const determineRelationshipType = ({
    sourceCardinality,
    targetCardinality,
}: {
    sourceCardinality: Cardinality;
    targetCardinality: Cardinality;
}): RelationshipType => {
    if (sourceCardinality === 'one' && targetCardinality === 'one')
        return 'one_to_one';
    if (sourceCardinality === 'one' && targetCardinality === 'many')
        return 'one_to_many';
    if (sourceCardinality === 'many' && targetCardinality === 'one')
        return 'many_to_one';
    return 'many_to_many';
};

export const determineCardinalities = (
    relationshipType: RelationshipType
): {
    sourceCardinality: Cardinality;
    targetCardinality: Cardinality;
} => {
    switch (relationshipType) {
        case 'one_to_one':
            return { sourceCardinality: 'one', targetCardinality: 'one' };
        case 'one_to_many':
            return { sourceCardinality: 'one', targetCardinality: 'many' };
        case 'many_to_one':
            return { sourceCardinality: 'many', targetCardinality: 'one' };
        case 'many_to_many':
            return { sourceCardinality: 'many', targetCardinality: 'many' };
    }
};
