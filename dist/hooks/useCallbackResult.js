import { useEffect, useRef } from "react";
import { useImmer } from "use-immer";
export const useCallbackResult = (callback, dependencies, resultHandlers) => {
    // Set result state
    const [result, setResult] = useImmer({
        type: 'pending'
    });
    // Set the retry count ref
    const failureRetryCountRef = useRef(0);
    const failureErrorLogRef = useRef([]);
    const failureRetryCallbackRef = useRef(null);
    // Run the callback
    useEffect(() => {
        (async () => {
            if (!dependencies.map(result => result.type === 'success').every(Boolean))
                return;
            failureRetryCountRef.current = 0;
            failureErrorLogRef.current.length = 0;
            const depValues = dependencies.map(dep => dep.value);
            try {
                const success = failureRetryCallbackRef.current
                    ? await failureRetryCallbackRef.current(depValues)
                    : await callback(depValues);
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
    }, [...dependencies]);
    // Run the result handlers
    useEffect(() => {
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
            return;
        }
        resultHandlers?.[result.type]?.(result);
    }, [result, ...dependencies]);
    return result;
};
