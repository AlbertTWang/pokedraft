// Admin utility: wipe all leaderboard data from Redis.
// Reads Upstash/KV credentials from the environment (e.g. source
// .vercel/.env.production.local first). Deletes pd:lb, pd:lb:time, pd:run:*.

import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error("Missing Redis env (KV_REST_API_URL / KV_REST_API_TOKEN).");
  process.exit(1);
}

const redis = new Redis({ url, token });

const before = await redis.zcard("pd:lb");
console.log(`entries before: ${before}`);

let cursor = "0";
const runKeys = [];
do {
  const [next, keys] = await redis.scan(cursor, { match: "pd:run:*", count: 200 });
  cursor = next;
  runKeys.push(...keys);
} while (cursor !== "0");

const toDelete = ["pd:lb", "pd:lb:time", ...runKeys];
if (toDelete.length) await redis.del(...toDelete);

const after = await redis.zcard("pd:lb");
console.log(`deleted ${toDelete.length} keys (${runKeys.length} runs). entries after: ${after}`);
