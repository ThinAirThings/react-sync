import { useEffect, useRef, useState } from "react"
import { useImmer } from "use-immer"


export type Result<T> = 
    | {type: 'pending'}
    | {type: 'success', value: T}
    | {type: 'failure', error: Error}

const useTrigger = (cleanupCallback?: () => Promise<void>|void) => {
    const [trigger, setTrigger] = useState<'triggered' | 'done'>('triggered')
    return [
        trigger,
        async (triggerState: 'triggered' | 'done') => {
            if (triggerState === 'triggered') {
                // Run cleanup
                await cleanupCallback?.()
                setTrigger('triggered')
            } else if (triggerState === 'done') {
                setTrigger('done')
            }
        },
    ] as const
}

export const useTriggeredResultEffect = <T, Deps extends Array<Result<any>>>(
    callback: (depResults: { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never }) => Promise<T>,
    dependencies: Deps,
    lifecycleHandlers?: {
        pending?: (failureLog: {
            retryCount: number,
            errorLog: Array<Error>
        }) => void,
        failure?: (error: Error, failureLog: {
            runRetry: (newCallback?: typeof callback) => void,
            retryCount: number,
            errorLog: Array<Error>
        }) => void
        success?: (value: T) => void
        cleanup?: (value: T) => Promise<void>|void
    }, 
) => {
    // Set result state
    const [result, setResult] = useImmer<Result<T>>({
        type: 'pending'
    })
    const [trigger, setTrigger] = useTrigger(() => {
        lifecycleHandlers?.cleanup?.((result as Result<T> & { type: 'success' }).value)
    })
    // Set the retry count ref
    const failureRetryCountRef = useRef(0)
    const failureErrorLogRef = useRef<Array<Error>>([])
    const failureRetryCallbackRef = useRef<(typeof callback) | null>(null)
    // Run the callback
    useEffect(() => {
        (async () => {
            if (trigger === 'triggered') {
                setResult((draft) => {
                    draft.type = 'pending'
                })
                setTrigger('done')
                return
            }
            if (!dependencies.map(dependencyResult => dependencyResult.type === 'success').every(Boolean)) {
                setResult((draft) => {
                    draft.type = 'pending'
                })
                return
            }
            if (result.type !== 'pending') return
            const depValues = dependencies.map(dep => (dep as Result<any>  & { type: 'success' }).value) as { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never };
            try {
                const success = failureRetryCallbackRef.current 
                    ? await failureRetryCallbackRef.current(depValues)
                    : await callback(depValues)

                // Clear failure references
                failureRetryCountRef.current = 0
                failureErrorLogRef.current.length = 0
                failureRetryCallbackRef.current = null
                // Run success handler here to guarantee it run before the child's useEffect
                lifecycleHandlers?.success?.(success)
                setResult(() => ({
                    type: 'success',
                    value: success
                }))
            } catch (_error) {
                const error = _error as Error
                setResult(() => ({
                    type: 'failure',
                    value: error
                }))
            }
        })()
    }, [trigger, result, ...dependencies])   // Add result here
    // Run the result handlers
    useEffect(() => {
        if (!dependencies
            .map(dependencyResult => dependencyResult.type === 'success')
            .every(Boolean)
        ) return 
        // Handle Errors
        if (result.type === 'failure') {
            failureRetryCountRef.current++
            failureErrorLogRef.current.push(result.error)
            const runRetry = (newCallback?: typeof callback) => {
                if (newCallback) failureRetryCallbackRef.current = newCallback
                else failureRetryCallbackRef.current = null
                setResult(() => ({
                    type: 'pending'
                }))
            }
            lifecycleHandlers?.failure?.(result.error, {
                runRetry,
                errorLog: failureErrorLogRef.current, 
                retryCount: failureRetryCountRef.current
            })
        } else if (result.type === 'pending') {
            lifecycleHandlers?.pending?.({
                errorLog: failureErrorLogRef.current,
                retryCount: failureRetryCountRef.current
            })
        } 
    }, [result, ...dependencies])
    return [
        result, 
        () => setTrigger('triggered')
    ] as const
}