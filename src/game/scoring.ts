// Team evaluation: strength (BST) + defensive synergy + offensive coverage.
// All weights are intentionally simple and tunable — this is a v1.

import { TYPES, TYPE_NAMES } from "./data.js";
import type { Pokemon, TypeName } from "./types.js";

// How much damage `attackType` deals to a defender with `defenderTypes`.
export function defensiveMultiplier(attackType: TypeName, defenderTypes: TypeName[]): number {
  let mult = 1;
  for (const d of defenderTypes) {
    const rel = TYPES[d].damageFrom;
    if (rel.x0.includes(attackType)) mult *= 0;
    else if (rel.x2.includes(attackType)) mult *= 2;
    else if (rel.x05.includes(attackType)) mult *= 0.5;
  }
  return mult;
}

// Does `pokemon` hit `defendType` super-effectively via one of its own (STAB) types?
function hitsSuperEffectively(pokemon: Pokemon, defendType: TypeName): boolean {
  return pokemon.types.some((atk) => TYPES[atk].damageTo.x2.includes(defendType));
}

export interface DefenseBreakdown {
  weaknesses: number;   // (member,type) pairs taking >1x
  resistances: number;  // (member,type) pairs taking <1x but >0
  immunities: number;   // (member,type) pairs taking 0x
  stacked: number;      // shared weaknesses beyond the first, per attacking type
  pts: number;          // 0..30
}

export interface CoverageBreakdown {
  covered: number; // of 18 types hit super-effectively by someone
  pts: number;     // 0..20
}

export interface Tier {
  label: string;
  blurb: string;
  min: number; // inclusive lower bound on total score
}

export const TIERS: Tier[] = [
  { label: "Youngster", blurb: "Still catching the basics. Everyone starts here.", min: 0 },
  { label: "Gym Leader", blurb: "A solid squad that can hold a badge.", min: 35 },
  { label: "Elite Four", blurb: "Sharp synergy and serious firepower.", min: 50 },
  { label: "Champion", blurb: "Tournament-grade. Few teams stand up to this.", min: 65 },
  { label: "Pokémon Master", blurb: "A legend's roster. Near-perfect balance and power.", min: 80 },
];

export function tierForScore(total: number): Tier {
  let chosen = TIERS[0];
  for (const t of TIERS) if (total >= t.min) chosen = t;
  return chosen;
}

export interface Evaluation {
  bst: number;
  strengthPts: number; // 0..50
  defense: DefenseBreakdown;
  coverage: CoverageBreakdown;
  total: number; // 0..100
  tier: Tier;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function evaluateTeam(team: Pokemon[]): Evaluation {
  // --- Strength: total base stats ---
  const bst = team.reduce((sum, p) => sum + p.bst, 0);
  // ~1800 (six weaklings) -> 0 pts, ~4000 (stacked legendaries) -> 50 pts.
  const strengthPts = clamp(((bst - 1800) / (4000 - 1800)) * 50, 0, 50);

  // --- Defensive synergy: how the team collectively eats each attacking type ---
  let weaknesses = 0;
  let resistances = 0;
  let immunities = 0;
  let stacked = 0;
  for (const atk of TYPE_NAMES) {
    let weakHere = 0;
    for (const p of team) {
      const m = defensiveMultiplier(atk, p.types);
      if (m === 0) immunities++;
      else if (m > 1) {
        weaknesses++;
        weakHere++;
      } else if (m < 1) resistances++;
    }
    if (weakHere > 1) stacked += weakHere - 1; // shared weaknesses are dangerous
  }
  const net = resistances + 2 * immunities - weaknesses - 2 * stacked;
  // Empirically net lands roughly in [-15, 40] for real teams.
  const defensePts = clamp(((net + 15) / 55) * 30, 0, 30);

  // --- Offensive coverage: how many types the team threatens ---
  let covered = 0;
  for (const def of TYPE_NAMES) {
    if (team.some((p) => hitsSuperEffectively(p, def))) covered++;
  }
  const coveragePts = (covered / TYPE_NAMES.length) * 20;

  const total = Math.round(strengthPts + defensePts + coveragePts);

  return {
    bst,
    strengthPts: Math.round(strengthPts),
    defense: { weaknesses, resistances, immunities, stacked, pts: Math.round(defensePts) },
    coverage: { covered, pts: Math.round(coveragePts) },
    total,
    tier: tierForScore(total),
  };
}
