import React, { useRef, useEffect, useState, createContext, useContext, Fragment } from 'react';
import { useImmer } from 'use-immer';

const useTrigger = (cleanupCallback) => {
    const [trigger, setTrigger] = useState('triggered');
    return [
        trigger,
        async (triggerState) => {
            if (triggerState === 'triggered') {
                // Run cleanup
                await cleanupCallback?.();
                setTrigger('triggered');
            }
            else if (triggerState === 'done') {
                setTrigger('done');
            }
        },
    ];
};
const useCallbackResult = (callback, dependencies, lifecycleHandlers) => {
    // Set result state
    const [result, setResult] = useImmer({
        type: 'pending'
    });
    const [trigger, setTrigger] = useTrigger(lifecycleHandlers?.cleanup);
    // Set the retry count ref
    const failureRetryCountRef = useRef(0);
    const failureErrorLogRef = useRef([]);
    const failureRetryCallbackRef = useRef(null);
    // Run the callback
    useEffect(() => {
        (async () => {
            if (trigger === 'triggered') {
                setResult((draft) => {
                    draft.type = 'pending';
                });
                setTrigger('done');
                return;
            }
            if (!dependencies.map(dependencyResult => dependencyResult.type === 'success').every(Boolean)) {
                setResult((draft) => {
                    draft.type = 'pending';
                });
                return;
            }
            if (result.type !== 'pending')
                return;
            const depValues = dependencies.map(dep => dep.value);
            try {
                const success = failureRetryCallbackRef.current
                    ? await failureRetryCallbackRef.current(depValues)
                    : await callback(depValues);
                // Clear failure references
                failureRetryCountRef.current = 0;
                failureErrorLogRef.current.length = 0;
                failureRetryCallbackRef.current = null;
                // Run success handler here to guarantee it run before the child's useEffect
                lifecycleHandlers?.success?.(success);
                setResult(() => ({
                    type: 'success',
                    value: success
                }));
            }
            catch (_error) {
                const error = _error;
                setResult(() => ({
                    type: 'failure',
                    value: error
                }));
            }
        })();
    }, [trigger, result, ...dependencies]); // Add result here
    // Run the result handlers
    useEffect(() => {
        if (!dependencies
            .map(dependencyResult => dependencyResult.type === 'success')
            .every(Boolean))
            return;
        // Handle Errors
        if (result.type === 'failure') {
            failureRetryCountRef.current++;
            failureErrorLogRef.current.push(result.error);
            const runRetry = (newCallback) => {
                if (newCallback)
                    failureRetryCallbackRef.current = newCallback;
                else
                    failureRetryCallbackRef.current = null;
                setResult(() => ({
                    type: 'pending'
                }));
            };
            lifecycleHandlers?.failure?.(result.error, {
                runRetry,
                errorLog: failureErrorLogRef.current,
                retryCount: failureRetryCountRef.current
            });
        }
        else if (result.type === 'pending') {
            lifecycleHandlers?.pending?.({
                errorLog: failureErrorLogRef.current,
                retryCount: failureRetryCountRef.current
            });
        }
    }, [result, ...dependencies]);
    return [result, setTrigger];
};

const ParentDependencyUpdaterContext = createContext(null);
const useUpdateParentDependencyFromChildMap = () => useContext(ParentDependencyUpdaterContext);
const DependencyResolverContext = createContext(null);
const useDependencyResolverContext = () => useContext(DependencyResolverContext);
// Dependency Control Layer
const DependencyLayer = ({ dependencyTable, dependencyPropsTable, children, }) => {
    const [dependencyResolutionMap, updateDependencyResolutionMap] = useImmer(new Map(Object.entries(dependencyTable).map(([key]) => [
        key, false
    ])));
    return (React.createElement(Fragment, null,
        Object.entries(dependencyTable).map(([key, Component]) => {
            const forwardProps = dependencyPropsTable?.[key];
            return React.createElement(DependencyResolverContext.Provider, { key: key, value: [
                    dependencyResolutionMap.get(key),
                    (resolved) => updateDependencyResolutionMap(draft => {
                        draft.set(key, resolved);
                    })
                ] },
                React.createElement(Component, { ...forwardProps ?? {} }));
        }),
        React.createElement(ParentDependencyUpdaterContext.Provider, { value: updateDependencyResolutionMap }, [...dependencyResolutionMap].every(([_, resolved]) => resolved)
            && children)));
};

const useDependencyResolver = ({ callback, cleanup }) => {
    const [dependencyResolved, setDependencyResolved] = useDependencyResolverContext();
    const [cleaningUp, setCleaningUp] = useState(false);
    const cleaningUpRef = useRef(cleaningUp);
    cleaningUpRef.current = cleaningUp;
    useEffect(() => {
        if (!dependencyResolved && !cleaningUp && !cleaningUpRef.current) {
            callback(setDependencyResolved);
        }
        return () => {
            if (!dependencyResolved || cleaningUp)
                return; // Don't run when flipped from false to true
            setCleaningUp(true);
            cleaningUpRef.current = true;
            cleanup?.(setCleaningUp);
        };
    }, [dependencyResolved, cleaningUp]);
};

export { DependencyLayer, useCallbackResult, useDependencyResolver, useDependencyResolverContext, useUpdateParentDependencyFromChildMap };
