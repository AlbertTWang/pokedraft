// Client wrappers for the leaderboard API.

import type { LeaderboardResponse, SubmitResponse } from "./leaderboardTypes";

export class LeaderboardError extends Error {
  constructor(
    message: string,
    public status: number,
    public disabled = false, // 503 -> backend not configured yet
  ) {
    super(message);
    this.name = "LeaderboardError";
  }
}

async function parse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new LeaderboardError(
      (data.error as string) || `Request failed (${res.status})`,
      res.status,
      res.status === 503,
    );
  }
  return data as T;
}

export async function submitRun(name: string, teamIds: number[]): Promise<SubmitResponse> {
  const res = await fetch("/api/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, teamIds }),
  });
  return parse<SubmitResponse>(res);
}

export async function fetchLeaderboard(limit = 25): Promise<LeaderboardResponse> {
  const res = await fetch(`/api/leaderboard?limit=${limit}`);
  return parse<LeaderboardResponse>(res);
}
