// Picks a trainer portrait for a tier. Sprites live in public/trainers/<key>/
// and are served same-origin (so the canvas can draw them without tainting).

import trainersRaw from "../data/trainers.json";

type TierKey = "youngster" | "gymleader" | "elite4" | "champion" | "master";

const TRAINERS = trainersRaw as Record<TierKey, string[]>;

const TIER_KEY: Record<string, TierKey> = {
  Youngster: "youngster",
  "Gym Leader": "gymleader",
  "Elite Four": "elite4",
  Champion: "champion",
  "Pokémon Master": "master",
};

// Youngster is always the same trainer (Joey); the rest pick a random member.
export function pickTrainer(tierLabel: string): string | null {
  const key = TIER_KEY[tierLabel];
  if (!key) return null;
  const list = TRAINERS[key];
  if (!list?.length) return null;
  const id = list[Math.floor(Math.random() * list.length)];
  return `/trainers/${key}/${id}.png`;
}
