export type Result<T> = {
    type: 'pending';
} | {
    type: 'success';
    value: T;
} | {
    type: 'failure';
    error: Error;
};
export declare const useCallbackResult: <T, Deps extends Result<any>[]>(callback: (depResults: { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never; }) => Promise<T>, dependencies: Deps, lifecycleHandlers?: {
    pending?: (failureLog: {
        retryCount: number;
        errorLog: Array<Error>;
    }) => void;
    failure?: (error: Error, failureLog: {
        runRetry: (newCallback?: (depResults: { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never; }) => Promise<T>) => void;
        retryCount: number;
        errorLog: Array<Error>;
    }) => void;
    success?: (value: T) => void;
    cleanup?: (value: T) => Promise<void> | void;
}) => readonly [Result<T>, (triggerState: 'triggered' | 'done') => Promise<void>];
