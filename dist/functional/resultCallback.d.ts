export declare const resultCallback: <T>(callback: () => Promise<T>, resultHandler: {
    pending: () => void;
    success: (result: T) => void;
    error: (error: Error) => void;
    finally: () => void;
}) => void;
