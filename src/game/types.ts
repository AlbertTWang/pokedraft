// Shared domain types for PokéDraft.

export type TypeName =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice"
  | "fighting" | "poison" | "ground" | "flying" | "psychic" | "bug"
  | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export interface Pokemon {
  id: number;
  name: string;
  types: TypeName[];
  stats: Stats;
  bst: number;
  sprite: string;
}

export interface TypeData {
  name: string;
  // Effectiveness when this type is DEFENDING against an attacking type.
  damageFrom: { x2: TypeName[]; x05: TypeName[]; x0: TypeName[] };
  // Effectiveness when this type is ATTACKING a defending type.
  damageTo: { x2: TypeName[]; x05: TypeName[]; x0: TypeName[] };
}
