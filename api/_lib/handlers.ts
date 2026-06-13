// Framework-agnostic handlers shared by the Vercel functions (prod) and the
// Vite dev middleware (local). They return { status, json }.

import { randomUUID } from "node:crypto";
import type {
  LeaderboardResponse,
  NameResponse,
  RunEntry,
  SubmitResponse,
} from "../../src/game/leaderboardTypes.js";
import { ApiError, type ApiResult } from "./errors.js";
import { rankScore, scoreTeam } from "./recompute.js";
import { getStore } from "./store.js";

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const store = getStore();
  if (!store) {
    return { status: 503, json: { error: "Leaderboard is not configured yet." } };
  }

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

  const rs = rankScore(entry.total, entry.bst);
  await store.addRun(entry, rs);
  const rank = (await store.rankOf(entry.id)) ?? 0;
  const count = await store.count();
  const window = await store.windowStats(rs, DAY_MS);

  const res: SubmitResponse = {
    entry: { ...entry, rank },
    count,
    percentile: window.percentile,
    rank24h: window.rank,
    count24h: window.count,
  };
  return { status: 200, json: res };
}

// Optionally attach a display name to an already-submitted run.
export async function updateName(body: { id?: unknown; name?: unknown }): Promise<ApiResult> {
  const store = getStore();
  if (!store) {
    return { status: 503, json: { error: "Leaderboard is not configured yet." } };
  }
  const id = String(body?.id ?? "").trim();
  if (!id) throw new ApiError(400, "Missing run id.");
  const name = sanitizeName(body?.name);
  const ok = await store.updateName(id, name);
  if (!ok) throw new ApiError(404, "Run not found.");

  const res: NameResponse = { ok: true, name };
  return { status: 200, json: res };
}

export async function getLeaderboard(params: { limit?: number }): Promise<ApiResult> {
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
export { ApiError, handle } from "./errors.js";
