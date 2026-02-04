export const defaultRetryOptions = {
    attempts: 5,
    backoff: {
        type: 'exponential',
        delay: 2000 // base ms
    }
};
