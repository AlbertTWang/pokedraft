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
  count: number; // total runs on the board
}

export interface LeaderboardResponse {
  top: RankedEntry[];
  count: number;
}
