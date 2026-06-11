// Pulls Pokémon + type data from PokeAPI into static JSON bundled with the app.
// Run once with: npm run fetch-data
//
// Outputs:
//   src/data/pokemon.json  -> [{ id, name, types, stats, bst, sprite }]
//   src/data/types.json    -> { dragon: { name, damageFrom, damageTo }, ... }
//
// We pre-bake the data so gameplay needs zero network calls.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../src/data");

const API = "https://pokeapi.co/api/v2";
const POKEMON_COUNT = 1025; // National dex IDs 1..1025 are the default species forms.
const CONCURRENCY = 16;

// The 18 canonical battle types (skip "unknown", "shadow", "stellar").
const CANONICAL_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

async function fetchJson(url, attempt = 1) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } catch (err) {
    if (attempt >= 5) throw err;
    const backoff = 300 * attempt;
    await new Promise((r) => setTimeout(r, backoff));
    return fetchJson(url, attempt + 1);
  }
}

// Run an async mapper over items with a fixed concurrency pool.
async function pool(items, size, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  let done = 0;
  async function run() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
      done++;
      if (done % 50 === 0 || done === items.length) {
        process.stdout.write(`\r  ${done}/${items.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, run));
  process.stdout.write("\n");
  return results;
}

function prettifyName(raw) {
  // "mr-mime" -> "Mr. Mime", "ho-oh" -> "Ho-Oh", "nidoran-f" -> "Nidoran F"
  return raw
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace(/\bMr\b/g, "Mr.")
    .replace(/\bMime Jr\b/g, "Mime Jr.");
}

const STAT_KEYS = {
  hp: "hp",
  attack: "attack",
  defense: "defense",
  "special-attack": "spAtk",
  "special-defense": "spDef",
  speed: "speed",
};

async function buildPokemon() {
  console.log(`Fetching ${POKEMON_COUNT} Pokémon...`);
  const ids = Array.from({ length: POKEMON_COUNT }, (_, i) => i + 1);

  const pokemon = await pool(ids, CONCURRENCY, async (id) => {
    const p = await fetchJson(`${API}/pokemon/${id}`);

    const stats = {};
    for (const s of p.stats) {
      const key = STAT_KEYS[s.stat.name];
      if (key) stats[key] = s.base_stat;
    }
    const bst = Object.values(stats).reduce((a, b) => a + b, 0);

    const types = p.types
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name)
      .filter((t) => CANONICAL_TYPES.includes(t));

    const sprite =
      p.sprites?.other?.["official-artwork"]?.front_default ||
      p.sprites?.front_default ||
      null;

    return { id: p.id, name: prettifyName(p.name), types, stats, bst, sprite };
  });

  // Drop anything with no canonical type or missing artwork (keeps the deck clean).
  const cleaned = pokemon.filter((p) => p.types.length > 0 && p.sprite);
  console.log(`Kept ${cleaned.length}/${pokemon.length} Pokémon.`);
  return cleaned;
}

async function buildTypes() {
  console.log(`Fetching ${CANONICAL_TYPES.length} types...`);
  const out = {};
  await pool(CANONICAL_TYPES, 8, async (typeName) => {
    const t = await fetchJson(`${API}/type/${typeName}`);
    const names = (rels) => rels.map((r) => r.name).filter((n) => CANONICAL_TYPES.includes(n));
    out[typeName] = {
      name: typeName.charAt(0).toUpperCase() + typeName.slice(1),
      // How this type fares when DEFENDING against an attacking type.
      damageFrom: {
        x2: names(t.damage_relations.double_damage_from),
        x05: names(t.damage_relations.half_damage_from),
        x0: names(t.damage_relations.no_damage_from),
      },
      // How this type fares when ATTACKING a defending type.
      damageTo: {
        x2: names(t.damage_relations.double_damage_to),
        x05: names(t.damage_relations.half_damage_to),
        x0: names(t.damage_relations.no_damage_to),
      },
    };
  });
  return out;
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const [pokemon, types] = await Promise.all([buildPokemon(), buildTypes()]);

  await writeFile(
    resolve(DATA_DIR, "pokemon.json"),
    JSON.stringify(pokemon),
    "utf8",
  );
  await writeFile(
    resolve(DATA_DIR, "types.json"),
    JSON.stringify(types, null, 2),
    "utf8",
  );

  console.log(`\nWrote ${pokemon.length} Pokémon and ${Object.keys(types).length} types to src/data/`);
}

main().catch((err) => {
  console.error("\nfetch-data failed:", err);
  process.exit(1);
});
