import { useEffect } from "react";
import { useImmer } from "use-immer";
export const useCallbackResult = (callback, dependencies, resultHandlers) => {
    // Set result state
    const [result, setResult] = useImmer({
        type: 'pending'
    });
    useEffect(() => {
        (async () => {
            if (!dependencies.map(result => result.type === 'success').every(Boolean))
                return;
            const depValues = dependencies.map(dep => dep.value);
            try {
                const success = await callback(depValues);
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
    useEffect(() => {
        if (!dependencies.map(result => result.type === 'success').every(Boolean))
            return;
        resultHandlers?.[result.type]?.(result);
    }, [result, ...dependencies]);
    return result;
};
