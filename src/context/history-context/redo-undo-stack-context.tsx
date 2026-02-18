import { createContext } from 'react';
import type { RedoUndoAction } from './redo-undo-action';
import { emptyFn } from '@/lib/utils';

export interface RedoUndoStackContext {
    redoStack: RedoUndoAction[];
    undoStack: RedoUndoAction[];
    popRedoAction: () => RedoUndoAction | undefined;
    popUndoAction: () => RedoUndoAction | undefined;
    addRedoAction: (action: RedoUndoAction) => void;
    addUndoAction: (action: RedoUndoAction) => void;
    resetRedoStack: () => void;
    resetUndoStack: () => void;
    hasRedo: boolean;
    hasUndo: boolean;
}

export const redoUndoStackContext = createContext<RedoUndoStackContext>({
    redoStack: [],
    undoStack: [],
    popRedoAction: () => undefined,
    popUndoAction: () => undefined,
    addRedoAction: emptyFn,
    addUndoAction: emptyFn,
    resetRedoStack: emptyFn,
    resetUndoStack: emptyFn,
    hasRedo: false,
    hasUndo: false,
});
