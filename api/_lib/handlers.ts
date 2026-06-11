// Framework-agnostic handlers shared by the Vercel functions (prod) and the
// Vite dev middleware (local). They return { status, json }.
//
// Heavy modules (data/scoring, redis) are imported lazily inside the handlers
// so a failure surfaces as a caught 500 rather than a module-load crash, and
// so requests that 503 early never pay to load the dataset.

import { randomUUID } from "node:crypto";
import type {
  LeaderboardResponse,
  RunEntry,
  SubmitResponse,
} from "../../src/game/leaderboardTypes";
import type { ApiResult } from "./errors";

const MAX_NAME = 20;
// Matches ASCII control characters (0x00-0x1F and 0x7F).
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001F\\u007F]", "g");

function sanitizeName(raw: unknown): string {
  const name = String(raw ?? "")
    .replace(CONTROL_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
  return name ? name.slice(0, MAX_NAME) : "Anonymous";
}

export async function submitRun(body: {
  name?: unknown;
  teamIds?: unknown;
}): Promise<ApiResult> {
  const { getStore } = await import("./store");
  const store = getStore();
  if (!store) {
    return { status: 503, json: { error: "Leaderboard is not configured yet." } };
  }

  const { scoreTeam, rankScore } = await import("./recompute");
  const scored = scoreTeam(body?.teamIds); // throws ApiError on bad input
  const teamIds = (body!.teamIds as unknown[]).map((n) => Number(n));

  const entry: RunEntry = {
    id: randomUUID(),
    name: sanitizeName(body?.name),
    total: scored.total,
    bst: scored.bst,
    tier: scored.tier,
    teamIds,
    createdAt: Date.now(),
  };

  await store.addRun(entry, rankScore(entry.total, entry.bst));
  const rank = (await store.rankOf(entry.id)) ?? 0;
  const count = await store.count();

  const res: SubmitResponse = { entry: { ...entry, rank }, count };
  return { status: 200, json: res };
}

export async function getLeaderboard(params: { limit?: number }): Promise<ApiResult> {
  const { getStore } = await import("./store");
  const store = getStore();
  if (!store) {
    return { status: 503, json: { error: "Leaderboard is not configured yet." } };
  }

  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const top = await store.top(limit);
  const count = await store.count();

  const res: LeaderboardResponse = {
    top: top.map((t) => ({ ...t.entry, rank: t.rank })),
    count,
  };
  return { status: 200, json: res };
}

// Re-export so the thin adapters can import everything from one module.
export { ApiError, handle } from "./errors";
