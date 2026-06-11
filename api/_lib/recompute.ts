// Server-authoritative scoring: the client submits only the team (6 ids);
// we recompute the score here so the leaderboard number can't be forged.
// NOTE: this does not yet verify the team was actually drafted legitimately —
// that requires the deferred server-dealt / daily-seed mode. See README roadmap.

import { getPokemonById } from "../../src/game/data.js";
import { evaluateTeam } from "../../src/game/scoring.js";
import type { Pokemon } from "../../src/game/types.js";
import { ApiError } from "./errors.js";

export const TEAM_SIZE = 6;

export interface ScoredTeam {
  total: number;
  bst: number;
  tier: string;
}

export function scoreTeam(rawTeamIds: unknown): ScoredTeam {
  if (!Array.isArray(rawTeamIds) || rawTeamIds.length !== TEAM_SIZE) {
    throw new ApiError(400, `Team must have exactly ${TEAM_SIZE} Pokémon.`);
  }
  const ids = rawTeamIds.map((n) => Number(n));
  if (ids.some((n) => !Number.isInteger(n))) {
    throw new ApiError(400, "Team contains invalid ids.");
  }
  if (new Set(ids).size !== ids.length) {
    throw new ApiError(400, "Team has duplicate Pokémon.");
  }
  const team = ids.map(getPokemonById);
  if (team.some((p) => !p)) {
    throw new ApiError(400, "Team references an unknown Pokémon.");
  }
  const ev = evaluateTeam(team as Pokemon[]);
  return { total: ev.total, bst: ev.bst, tier: ev.tier.label };
}

// Composite so ties on the 0..100 score break by raw stat total.
export function rankScore(total: number, bst: number): number {
  return total * 1_000_000 + bst;
}
