const captured = new Set<unknown>();

/**
 * Execute an async closure `fn`, and guarantee that `obj` will not be
 * garbage-collected, until the promise is resolved.
 */
export const scopedCapture = async <T>(
    fn: () => Promise<T>,
    obj: unknown,
): Promise<T> => {
    // captures the object
    // technically, this is not needed, as the delete() call above
    // should make sure the captured object is not GC'ed.
    // However, making it reachable from a global object will definitely
    // prevent GC even with crazy optimization from any runtime
    captured.add(obj);
    try {
        return await fn();
    } finally {
        captured.delete(obj);
    }
};

/**
 * Execute a closure `fn`, and guarantee that `obj` will not be
 * garbage-collected during the execution
 */
export const scopedCaptureSync = <T>(fn: () => T, obj: unknown): T => {
    // captures the object
    captured.add(obj);
    try {
        return fn();
    } finally {
        captured.delete(obj);
    }
};
