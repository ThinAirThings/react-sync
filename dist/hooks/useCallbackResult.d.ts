export type Result<T> = {
    type: 'pending';
} | {
    type: 'success';
    value: T;
} | {
    type: 'failure';
    error: Error;
} | {
    type: 'trigger';
    state: 'triggered' | 'done';
};
export declare const useTrigger: (initialTriggerState: 'triggered' | 'done', cleanupCallback?: () => Promise<void>) => readonly [{
    type: 'trigger';
    state: 'triggered' | 'done';
} & {
    type: "trigger";
}, (triggerState: 'triggered' | 'done') => Promise<void>];
export declare const useCallbackResult: <T, Deps extends Result<any>[]>(callback: (depResults: { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never; }) => Promise<T>, dependencies: Deps, resultHandlers?: {
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
}) => Result<T>;
