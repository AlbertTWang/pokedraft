// Loads the pre-baked datasets and builds lookup indexes used by the game.

import pokemonRaw from "../data/pokemon.json";
import typesRaw from "../data/types.json";
import type { Pokemon, TypeData, TypeName } from "./types";

export const ALL_POKEMON = pokemonRaw as Pokemon[];
export const TYPES = typesRaw as Record<TypeName, TypeData>;
export const TYPE_NAMES = Object.keys(TYPES) as TypeName[];

const byId = new Map<number, Pokemon>();
for (const p of ALL_POKEMON) byId.set(p.id, p);

// type -> Pokémon that have that type (primary OR secondary).
const byType = new Map<TypeName, Pokemon[]>();
for (const t of TYPE_NAMES) byType.set(t, []);
for (const p of ALL_POKEMON) {
  for (const t of p.types) byType.get(t)?.push(p);
}

export function getPokemonById(id: number): Pokemon | undefined {
  return byId.get(id);
}

export function pokemonOfType(type: TypeName): Pokemon[] {
  return byType.get(type) ?? [];
}
