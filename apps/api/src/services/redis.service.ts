import Redis from 'ioredis';

// CONCEPT: Redis Service (Caching + Deduplication)
// Redis serves two purposes in RESOLVE:
//   1. Cache the settlement plan per group — avoids re-running the simplification
//      algorithm on every request. Invalidated when a new expense is added.
//   2. Deduplication for RabbitMQ consumers — if the consumer crashes after sending
//      a notification but before ACKing, RabbitMQ redelivers. Redis tracks processed
//      message IDs so we don't send duplicate notifications.
//
// Interview: "I cache settlement plans in Redis with group-specific keys, invalidated
// on every expense write. Redis also deduplicates RabbitMQ messages — if a consumer
// crashes before ACKing, the message is redelivered but Redis prevents duplicate processing."

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL is not set — check your .env file');
    }
    redis = new Redis(url);
  }
  return redis;
}

/**
 * Cache a settlement plan for a group.
 * TTL: 1 hour (also invalidated explicitly on new expense).
 */
export async function cacheSettlement(groupId: string, transfers: unknown[]): Promise<void> {
  await getRedis().set(
    `settlement:${groupId}`,
    JSON.stringify(transfers),
    'EX',
    3600 // 1 hour TTL
  );
}

/**
 * Get cached settlement plan for a group. Returns null if not cached.
 */
export async function getCachedSettlement(groupId: string): Promise<unknown[] | null> {
  const cached = await getRedis().get(`settlement:${groupId}`);
  if (!cached) return null;
  return JSON.parse(cached);
}

/**
 * Invalidate the cached settlement plan for a group.
 * Called when a new expense is added.
 */
export async function invalidateSettlement(groupId: string): Promise<void> {
  await getRedis().del(`settlement:${groupId}`);
}

/**
 * Check if a RabbitMQ message has already been processed (deduplication).
 * Returns true if already processed.
 */
export async function isMessageProcessed(messageId: string): Promise<boolean> {
  const result = await getRedis().get(`notif:${messageId}`);
  return result !== null;
}

/**
 * Mark a RabbitMQ message as processed. TTL: 7 days.
 */
export async function markMessageProcessed(messageId: string): Promise<void> {
  await getRedis().set(`notif:${messageId}`, '1', 'EX', 604800); // 7 days
}
