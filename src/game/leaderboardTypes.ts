// Shared between the client and the /api serverless functions.

export interface RunEntry {
  id: string;
  name: string;
  total: number; // 0..100 display score (server-recomputed)
  bst: number;
  tier: string;
  teamIds: number[];
  createdAt: number; // epoch ms
}

export interface RankedEntry extends RunEntry {
  rank: number; // 1-based global rank
}

export interface SubmitResponse {
  entry: RankedEntry;
  count: number; // total runs on the board (all-time)
  // Stats over the last 24 hours (the headline numbers on the scorecard):
  percentile: number; // 0..100, "you beat X% of teams in the last 24h"
  rank24h: number; // 1-based rank among last-24h teams
  count24h: number; // total teams in the last 24h
}

export interface NameResponse {
  ok: true;
  name: string;
}

export interface LeaderboardResponse {
  top: RankedEntry[];
  count: number;
}
