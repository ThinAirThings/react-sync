export declare const useDependencyResolver: ({ callback, cleanup }: {
    callback: (setDependencyResolved: (resolved: boolean) => void) => void;
    cleanup?: ((setCleaningUp: (cleaningUp: boolean) => void) => void) | undefined;
}) => void;
