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
type DependencyValues<Deps extends Array<Result<any>>> = { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never }
export const useTriggeredResultEffect = <T, Deps extends Array<Result<any>>>(
    callback: (dependencyValues: DependencyValues<Deps>) => Promise<T>,
    dependencies: Deps,
    lifecycleHandlers?: {
        pending?: (dependencyValues: DependencyValues<Deps>) => void,
        success?: (value: T, dependencyValues: DependencyValues<Deps>) => void
        cleanup?: (value: T) => Promise<void>|void
        failure?: {
            maxRetryCount?: number
            retry?: (error: Error, failureLog: {
                runRetry: (newCallback?: typeof callback) => void,
                retryAttempt: number,
                maxRetryCount: number,
                errorLog: Array<Error>
            }) => void
            final?: (failureLog: {
                maxRetryCount: number,
                errorLog: Array<Error>
            }) => void
        }
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
            if (result.type === 'pending') {
                const depValues = dependencies.map(dep => (dep as Result<any>  & { type: 'success' }).value) as { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never };
                lifecycleHandlers?.pending?.(depValues)
                try {
                    const success = failureRetryCallbackRef.current 
                        ? await failureRetryCallbackRef.current(depValues)
                        : await callback(depValues) 
                    // Clear failure references
                    failureRetryCountRef.current = 0
                    failureErrorLogRef.current.length = 0
                    failureRetryCallbackRef.current = null
                    // Run success handler here to guarantee it run before the child's useEffect
                    lifecycleHandlers?.success?.(success, depValues)
                    setResult(() => ({
                        type: 'success',
                        value: success
                    }))
                } catch (_error) {
                    const error = _error as Error
                    failureRetryCountRef.current++
                    failureErrorLogRef.current.push(error)
                    const runRetry = (newCallback?: typeof callback) => {
                        if (newCallback) failureRetryCallbackRef.current = newCallback
                        else failureRetryCallbackRef.current = null
                        setResult(() => ({
                            type: 'pending'
                        }))
                    }
                    setResult(() => ({
                        type: 'failure',
                        value: error
                    }))
                    if (failureRetryCountRef.current > (lifecycleHandlers?.failure?.maxRetryCount ?? 0)) {
                        lifecycleHandlers?.failure?.retriesExceeded?.({
                            errorLog: failureErrorLogRef.current,
                            maxRetryCount: failureRetryCountRef.current
                        })
                        return
                    }
                    lifecycleHandlers?.failure?.retry?.(error, {
                        runRetry,
                        errorLog: failureErrorLogRef.current, 
                        retryAttempt: failureRetryCountRef.current,
                        maxRetryCount: lifecycleHandlers?.failure?.maxRetryCount ?? 0
                    })
                }
            }
        })()
    }, [trigger, result, ...dependencies])   // Add result here
    return [
        result, 
        () => setTrigger('triggered')
    ] as const
}