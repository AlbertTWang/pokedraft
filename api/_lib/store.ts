// Leaderboard storage abstraction.
//
// Production: Upstash Redis. Keys:
//   pd:lb        sorted set, member = run id, score = composite rank score (all-time)
//   pd:lb:time   sorted set, member = run id, score = createdAt (for 24h windows)
//   pd:run:{id}  JSON of the run
// Local dev with no Redis env: an in-memory store so the flow is testable.
// Production with no Redis env: null -> handlers return a clean 503.

import { Redis } from "@upstash/redis";
import type { RunEntry } from "../../src/game/leaderboardTypes.js";

const ZKEY = "pd:lb";
const TKEY = "pd:lb:time";
const runKey = (id: string) => `pd:run:${id}`;

const scoreOf = (r: RunEntry) => r.total * 1_000_000 + r.bst;

export interface WindowStats {
  rank: number; // 1-based rank within the window
  count: number; // total entries in the window
  percentile: number; // 0..100, share of window entries at or below this score
}

export interface Store {
  addRun(entry: RunEntry, rankScore: number): Promise<void>;
  top(limit: number): Promise<{ entry: RunEntry; rank: number }[]>;
  rankOf(id: string): Promise<number | null>; // 1-based, or null if absent
  count(): Promise<number>;
  windowStats(rankScore: number, windowMs: number): Promise<WindowStats>;
  updateName(id: string, name: string): Promise<boolean>;
}

function statsFromScores(scores: number[], myScore: number): WindowStats {
  if (!scores.length) return { rank: 1, count: 1, percentile: 100 };
  const above = scores.filter((s) => s > myScore).length;
  const atOrBelow = scores.length - above;
  return {
    rank: above + 1,
    count: scores.length,
    percentile: Math.round((atOrBelow / scores.length) * 100),
  };
}

function createRedisStore(url: string, token: string): Store {
  const redis = new Redis({ url, token });
  return {
    async addRun(entry, rankScore) {
      await redis.set(runKey(entry.id), entry);
      await redis.zadd(ZKEY, { score: rankScore, member: entry.id });
      await redis.zadd(TKEY, { score: entry.createdAt, member: entry.id });
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
    async windowStats(myScore, windowMs) {
      const cutoff = Date.now() - windowMs;
      const ids = await redis.zrange<string[]>(TKEY, cutoff, Number.MAX_SAFE_INTEGER, {
        byScore: true,
      });
      if (!ids.length) return { rank: 1, count: 1, percentile: 100 };
      const runs = await redis.mget<RunEntry[]>(...ids.map(runKey));
      const scores = runs.filter((r): r is RunEntry => Boolean(r)).map(scoreOf);
      return statsFromScores(scores, myScore);
    },
    async updateName(id, name) {
      const run = await redis.get<RunEntry>(runKey(id));
      if (!run) return false;
      run.name = name;
      await redis.set(runKey(id), run);
      return true;
    },
  };
}

function createMemoryStore(): Store {
  const runs = new Map<string, RunEntry>();
  const scores = new Map<string, number>();
  const ranked = () => [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);

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
    async windowStats(myScore, windowMs) {
      const cutoff = Date.now() - windowMs;
      const windowScores = [...runs.values()]
        .filter((r) => r.createdAt >= cutoff)
        .map(scoreOf);
      return statsFromScores(windowScores, myScore);
    },
    async updateName(id, name) {
      const run = runs.get(id);
      if (!run) return false;
      run.name = name;
      return true;
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
