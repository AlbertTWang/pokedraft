// Core game state + transitions. Pure functions over a reducer so the UI stays thin.

import { pokemonOfType, TYPE_NAMES } from "./data";
import type { Pokemon, TypeName } from "./types";

export const TEAM_SIZE = 6;
export const DECK_SIZE = 15;

export type LifelineKey = "switchType" | "redeal" | "revealBst" | "spyglass";

export interface LifelineDef {
  key: LifelineKey;
  label: string;
  icon: string;
  max: number;
  desc: string;
}

export const LIFELINES: LifelineDef[] = [
  { key: "switchType", label: "Switch Type", icon: "🔄", max: 2, desc: "Reroll the round's type and deal a fresh 15." },
  { key: "redeal", label: "Redeal", icon: "🎴", max: 3, desc: "Deal 15 new Pokémon of the same type." },
  { key: "revealBst", label: "Reveal BST", icon: "📊", max: 2, desc: "Show every card's Base Stat Total this round." },
  { key: "spyglass", label: "Spyglass", icon: "🔍", max: 3, desc: "Reveal the stats of a single Pokémon." },
];

const INITIAL_LIFELINES = (): Record<LifelineKey, number> =>
  Object.fromEntries(LIFELINES.map((l) => [l.key, l.max])) as Record<LifelineKey, number>;

export interface RoundDeck {
  type: TypeName;
  pokemon: Pokemon[];
  revealedBst: boolean; // Reveal-BST lifeline applied to the whole deck
  spyglassed: number[]; // ids individually revealed
}

export interface GameState {
  id: number; // unique per game, used to submit a finished run exactly once
  round: number; // 0-based index of the current pick (0..TEAM_SIZE-1)
  team: Pokemon[];
  deck: RoundDeck;
  lifelines: Record<LifelineKey, number>;
  phase: "drafting" | "results";
}

let gameCounter = 0;

// --- helpers -------------------------------------------------------------

function sample<T>(arr: T[], n: number): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function randomType(exclude?: TypeName): TypeName {
  const pool = exclude ? TYPE_NAMES.filter((t) => t !== exclude) : TYPE_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

function deal(type: TypeName, excludeIds: Set<number>): RoundDeck {
  const available = pokemonOfType(type).filter((p) => !excludeIds.has(p.id));
  return { type, pokemon: sample(available, DECK_SIZE), revealedBst: false, spyglassed: [] };
}

export function initGame(): GameState {
  return {
    id: ++gameCounter,
    round: 0,
    team: [],
    deck: deal(randomType(), new Set()),
    lifelines: INITIAL_LIFELINES(),
    phase: "drafting",
  };
}

// --- actions -------------------------------------------------------------

export type Action =
  | { type: "pick"; pokemon: Pokemon }
  | { type: "switchType" }
  | { type: "redeal" }
  | { type: "revealBst" }
  | { type: "spyglass"; id: number }
  | { type: "restart" };

export function reducer(state: GameState, action: Action): GameState {
  const teamIds = new Set(state.team.map((p) => p.id));

  switch (action.type) {
    case "pick": {
      if (state.phase !== "drafting") return state;
      if (teamIds.has(action.pokemon.id)) return state;
      const team = [...state.team, action.pokemon];
      if (team.length >= TEAM_SIZE) {
        return { ...state, team, phase: "results" };
      }
      const nextIds = new Set(team.map((p) => p.id));
      return {
        ...state,
        team,
        round: state.round + 1,
        deck: deal(randomType(state.deck.type), nextIds),
      };
    }

    case "switchType": {
      if (state.lifelines.switchType <= 0) return state;
      return {
        ...state,
        lifelines: { ...state.lifelines, switchType: state.lifelines.switchType - 1 },
        deck: deal(randomType(state.deck.type), teamIds),
      };
    }

    case "redeal": {
      if (state.lifelines.redeal <= 0) return state;
      return {
        ...state,
        lifelines: { ...state.lifelines, redeal: state.lifelines.redeal - 1 },
        deck: deal(state.deck.type, teamIds),
      };
    }

    case "revealBst": {
      if (state.lifelines.revealBst <= 0 || state.deck.revealedBst) return state;
      return {
        ...state,
        lifelines: { ...state.lifelines, revealBst: state.lifelines.revealBst - 1 },
        deck: { ...state.deck, revealedBst: true },
      };
    }

    case "spyglass": {
      if (state.lifelines.spyglass <= 0) return state;
      if (state.deck.revealedBst || state.deck.spyglassed.includes(action.id)) return state;
      return {
        ...state,
        lifelines: { ...state.lifelines, spyglass: state.lifelines.spyglass - 1 },
        deck: { ...state.deck, spyglassed: [...state.deck.spyglassed, action.id] },
      };
    }

    case "restart":
      return initGame();

    default:
      return state;
  }
}
