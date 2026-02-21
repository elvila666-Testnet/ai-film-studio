import IORedis from 'ioredis';

let _redis: IORedis | null = null;

export function getRedis(): IORedis | null {
    if (_redis) return _redis;

    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;

    if (!host) {
        console.warn("[Redis] REDIS_HOST not set. Background jobs will not run.");
        return null;
    }

    try {
        console.log(`[Redis] Connecting to ${host}:${port}...`);
        _redis = new IORedis({
            host,
            port,
            maxRetriesPerRequest: null, // Required by BullMQ
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        _redis.on('error', (err) => {
            console.error('[Redis] Error:', err);
        });

        _redis.on('connect', () => {
            console.log('[Redis] Connected successfully');
        });

        return _redis;
    } catch (error) {
        console.error('[Redis] Failed to initialize:', error);
        return null;
    }
}
