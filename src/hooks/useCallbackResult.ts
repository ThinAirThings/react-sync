import { useEffect, useRef } from "react"
import { useImmer } from "use-immer"


export type Result<T> = 
    | {type: 'pending'}
    | {type: 'success', value: T}
    | {type: 'failure', error: Error}


export const useCallbackResult = <T, Deps extends Array<Result<any>>>(
    callback: (depResults: { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never }) => Promise<T>,
    dependencies: Deps,
    resultHandlers?: {
        pending?: () => void,
        success?: (value: T) => void,
        failure?: (error: Error, retryCount:number) => void
    }, 
) => {
    // Set result state
    const [result, setResult] = useImmer<Result<T>>({
        type: 'pending'
    })
    // Set the retry count ref
    const failureRetryCountRef = useRef(0)
    // Run the callback
    useEffect(() => {
        (async () => {
            if (!dependencies.map(result => result.type === 'success').every(Boolean)) return
            failureRetryCountRef.current = 0
            const depValues = dependencies.map(dep => (dep as Result<any>  & { type: 'success' }).value) as { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never };
            try {
                const success = await callback(depValues)
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
    }, [...dependencies])
    // Run the result handlers
    useEffect(() => {
        if (!dependencies.map(result => result.type === 'success').every(Boolean)) return 
        resultHandlers?.[result.type]?.(result as any, failureRetryCountRef.current)
    }, [result, ...dependencies])
    return result
}