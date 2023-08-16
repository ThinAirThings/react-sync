export type Result<T> = {
    type: 'pending';
} | {
    type: 'success';
    value: T;
} | {
    type: 'failure';
    error: Error;
};
export declare const useCallbackResult: <T, Deps extends Result<any>[]>(callback: (depResults: { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never; }) => Promise<T>, dependencies: Deps, resultHandlers?: {
    pending?: (() => void) | undefined;
    success?: ((value: T) => void) | undefined;
    failure?: ((error: Error, retryCount: number) => void) | undefined;
} | undefined) => Result<T>;
