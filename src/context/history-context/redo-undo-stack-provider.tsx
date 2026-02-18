import React, { useCallback } from 'react';
import type { RedoUndoAction } from './redo-undo-action';
import type { RedoUndoStackContext } from './redo-undo-stack-context';
import { redoUndoStackContext } from './redo-undo-stack-context';

export const RedoUndoStackProvider: React.FC<React.PropsWithChildren> = ({
    children,
}) => {
    const [undoStack, setUndoStack] = React.useState<RedoUndoAction[]>([]);
    const [redoStack, setRedoStack] = React.useState<RedoUndoAction[]>([]);
    const undoStackRef = React.useRef<RedoUndoAction[]>([]);
    const redoStackRef = React.useRef<RedoUndoAction[]>([]);

    const popRedoAction: RedoUndoStackContext['popRedoAction'] =
        useCallback(() => {
            const stack = redoStackRef.current;
            const action = stack.at(-1);

            if (!action) {
                return undefined;
            }

            const nextStack = stack.slice(0, -1);
            redoStackRef.current = nextStack;
            setRedoStack(nextStack);

            return action;
        }, [setRedoStack]);

    const popUndoAction: RedoUndoStackContext['popUndoAction'] =
        useCallback(() => {
            const stack = undoStackRef.current;
            const action = stack.at(-1);

            if (!action) {
                return undefined;
            }

            const nextStack = stack.slice(0, -1);
            undoStackRef.current = nextStack;
            setUndoStack(nextStack);

            return action;
        }, [setUndoStack]);

    const addRedoAction: RedoUndoStackContext['addRedoAction'] = useCallback(
        (action) => {
            setRedoStack((prev) => {
                const nextStack = [...prev, action];
                redoStackRef.current = nextStack;
                return nextStack;
            });
        },
        [setRedoStack]
    );

    const addUndoAction: RedoUndoStackContext['addUndoAction'] = useCallback(
        (action) => {
            setUndoStack((prev) => {
                const nextStack = [...prev, action];
                undoStackRef.current = nextStack;
                return nextStack;
            });
        },
        [setUndoStack]
    );

    const resetRedoStack: RedoUndoStackContext['resetRedoStack'] =
        useCallback(() => {
            redoStackRef.current = [];
            setRedoStack([]);
        }, [setRedoStack]);

    const resetUndoStack: RedoUndoStackContext['resetUndoStack'] =
        useCallback(() => {
            undoStackRef.current = [];
            setUndoStack([]);
        }, [setUndoStack]);

    const hasRedo = redoStack.length > 0;
    const hasUndo = undoStack.length > 0;

    return (
        <redoUndoStackContext.Provider
            value={{
                redoStack,
                undoStack,
                popRedoAction,
                popUndoAction,
                addRedoAction,
                addUndoAction,
                resetRedoStack,
                resetUndoStack,
                hasRedo,
                hasUndo,
            }}
        >
            {children}
        </redoUndoStackContext.Provider>
    );
};
