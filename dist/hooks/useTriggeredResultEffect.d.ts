export type Result<T> = {
    type: 'pending';
} | {
    type: 'success';
    value: T;
} | {
    type: 'failure';
    error: Error;
};
export declare const useTriggeredResultEffect: <T, Deps extends Result<any>[]>(callback: (depResults: { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never; }) => Promise<T>, dependencies: Deps, lifecycleHandlers?: {
    pending?: (failureLog: {
        retryCount: number;
        errorLog: Array<Error>;
    }) => void;
    success?: (value: T) => void;
    cleanup?: (value: T) => Promise<void> | void;
    failure?: {
        maxRetryCount?: number;
        retry?: (error: Error, failureLog: {
            runRetry: (newCallback?: (depResults: { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never; }) => Promise<T>) => void;
            retryAttempt: number;
            maxRetryCount: number;
            errorLog: Array<Error>;
        }) => void;
        retriesExceeded?: (failureLog: {
            maxRetryCount: number;
            errorLog: Array<Error>;
        }) => void;
    };
}) => readonly [Result<T>, () => Promise<void>];
