// Leaderboard storage abstraction.
//
// Production: Upstash Redis (a sorted set for ranking + one JSON key per run).
// Local dev with no Redis env: an in-memory store so the flow is testable.
// Production with no Redis env: null -> handlers return a clean 503.

import { Redis } from "@upstash/redis";
import type { RunEntry } from "../../src/game/leaderboardTypes";

const ZKEY = "pd:lb"; // sorted set: member = run id, score = composite rank score
const runKey = (id: string) => `pd:run:${id}`;

export interface Store {
  addRun(entry: RunEntry, rankScore: number): Promise<void>;
  top(limit: number): Promise<{ entry: RunEntry; rank: number }[]>;
  rankOf(id: string): Promise<number | null>; // 1-based, or null if absent
  count(): Promise<number>;
}

function createRedisStore(url: string, token: string): Store {
  const redis = new Redis({ url, token });
  return {
    async addRun(entry, rankScore) {
      await redis.set(runKey(entry.id), entry);
      await redis.zadd(ZKEY, { score: rankScore, member: entry.id });
    },
    async top(limit) {
      const ids = await redis.zrange<string[]>(ZKEY, 0, limit - 1, { rev: true });
      if (!ids.length) return [];
      const runs = await redis.mget<RunEntry[]>(...ids.map(runKey));
      return runs
        .map((entry, i) => (entry ? { entry, rank: i + 1 } : null))
        .filter((x): x is { entry: RunEntry; rank: number } => x !== null);
    },
    async rankOf(id) {
      const rank = await redis.zrevrank(ZKEY, id);
      return rank === null ? null : rank + 1;
    },
    async count() {
      return await redis.zcard(ZKEY);
    },
  };
}

function createMemoryStore(): Store {
  const runs = new Map<string, RunEntry>();
  const scores = new Map<string, number>();
  const ranked = () =>
    [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);

  return {
    async addRun(entry, rankScore) {
      runs.set(entry.id, entry);
      scores.set(entry.id, rankScore);
    },
    async top(limit) {
      return ranked()
        .slice(0, limit)
        .map((id, i) => ({ entry: runs.get(id)!, rank: i + 1 }));
    },
    async rankOf(id) {
      const idx = ranked().indexOf(id);
      return idx === -1 ? null : idx + 1;
    },
    async count() {
      return scores.size;
    },
  };
}

let cached: Store | null | undefined;

export function getStore(): Store | null {
  if (cached !== undefined) return cached;

  // Support both Upstash-native and Vercel KV integration env var names.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (url && token) {
    cached = createRedisStore(url, token);
  } else if (process.env.NODE_ENV !== "production") {
    console.warn("[leaderboard] no Redis env — using in-memory store (dev only, not persisted)");
    cached = createMemoryStore();
  } else {
    console.warn("[leaderboard] no Redis env in production — leaderboard disabled");
    cached = null;
  }
  return cached;
}
