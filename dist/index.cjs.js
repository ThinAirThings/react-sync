'use strict';

var React = require('react');
var useImmer = require('use-immer');

const useTrigger = (initialTriggerState, cleanupCallback) => {
    const [trigger, setTrigger] = React.useState(initialTriggerState === 'triggered'
        ? {
            type: 'success',
            value: 'triggered'
        }
        : { type: 'pending' });
    React.useRef(initialTriggerState);
    return [
        trigger,
        async (triggerState) => {
            if (triggerState === 'triggered') {
                // Run cleanup
                await cleanupCallback?.();
                // triggerValueRef.current = 'triggered'
                setTrigger(() => ({
                    type: 'success',
                    value: 'triggered'
                }));
            }
            else if (triggerState === 'done') {
                // triggerValueRef.current = 'done'
                setTrigger(() => ({
                    type: 'pending',
                }));
            }
        },
        // triggerValueRef.current
    ];
};
const useCallbackResult = (callback, dependencies, resultHandlers) => {
    // Set result state
    const [result, setResult] = useImmer.useImmer({
        type: 'pending'
    });
    // Set the retry count ref
    const failureRetryCountRef = React.useRef(0);
    const failureErrorLogRef = React.useRef([]);
    const failureRetryCallbackRef = React.useRef(null);
    // Run the callback
    React.useEffect(() => {
        (async () => {
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
    }, [result, ...dependencies]); // Add result here
    // Run the result handlers
    React.useEffect(() => {
        if (!dependencies.map(result => result.type === 'success').every(Boolean))
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
            resultHandlers?.failure?.(result.error, {
                runRetry,
                errorLog: failureErrorLogRef.current,
                retryCount: failureRetryCountRef.current
            });
        }
        else if (result.type === 'pending') {
            resultHandlers?.pending?.({
                errorLog: failureErrorLogRef.current,
                retryCount: failureRetryCountRef.current
            });
        }
        else if (result.type === 'success') {
            resultHandlers?.success?.(result.value);
        }
    }, [result, ...dependencies]);
    return result;
};

const ParentDependencyUpdaterContext = React.createContext(null);
const useUpdateParentDependencyFromChildMap = () => React.useContext(ParentDependencyUpdaterContext);
const DependencyResolverContext = React.createContext(null);
const useDependencyResolverContext = () => React.useContext(DependencyResolverContext);
// Dependency Control Layer
const DependencyLayer = ({ dependencyTable, dependencyPropsTable, children, }) => {
    const [dependencyResolutionMap, updateDependencyResolutionMap] = useImmer.useImmer(new Map(Object.entries(dependencyTable).map(([key]) => [
        key, false
    ])));
    return (React.createElement(React.Fragment, null,
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
    const [cleaningUp, setCleaningUp] = React.useState(false);
    const cleaningUpRef = React.useRef(cleaningUp);
    cleaningUpRef.current = cleaningUp;
    React.useEffect(() => {
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

exports.DependencyLayer = DependencyLayer;
exports.useCallbackResult = useCallbackResult;
exports.useDependencyResolver = useDependencyResolver;
exports.useDependencyResolverContext = useDependencyResolverContext;
exports.useTrigger = useTrigger;
exports.useUpdateParentDependencyFromChildMap = useUpdateParentDependencyFromChildMap;
