// Downloads a curated set of trainer sprites (Pokémon Showdown) into
// public/trainers/<tier>/ and writes src/data/trainers.json mapping each tier
// to the sprites that downloaded successfully. Run once: npm run fetch-trainers

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SPRITES = "https://play.pokemonshowdown.com/sprites/trainers";

// tier key -> candidate Showdown trainer ids (we keep whichever return 200)
const CANDIDATES = {
  youngster: ["youngster"],
  gymleader: [
    "brock", "misty", "ltsurge", "erika", "koga", "sabrina", "blaine", "giovanni",
    "falkner", "bugsy", "whitney", "morty", "chuck", "jasmine", "pryce", "clair",
    "roxanne", "brawly", "wattson", "flannery", "norman", "winona", "juan",
    "roark", "gardenia", "maylene", "fantina", "byron", "candice", "volkner",
  ],
  elite4: [
    "bruno", "will", "karen", "sidney", "phoebe", "glacia", "drake",
    "aaron", "bertha", "flint", "lucian", "caitlin", "shauntal", "marshal",
    "grimsley", "siebold", "malva", "wikstrom", "drasna",
  ],
  champion: ["blue", "lance", "steven", "wallace", "cynthia", "alder", "iris", "diantha"],
  master: ["red"],
};

async function tryDownload(tier, id) {
  const res = await fetch(`${SPRITES}/${id}.png`);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) return null; // guard against error placeholders
  await mkdir(resolve(ROOT, "public/trainers", tier), { recursive: true });
  await writeFile(resolve(ROOT, "public/trainers", tier, `${id}.png`), buf);
  return id;
}

async function main() {
  const manifest = {};
  for (const [tier, ids] of Object.entries(CANDIDATES)) {
    const got = [];
    for (const id of ids) {
      try {
        const ok = await tryDownload(tier, id);
        if (ok) got.push(ok);
      } catch {
        /* skip */
      }
    }
    manifest[tier] = got;
    console.log(`${tier}: ${got.length}/${ids.length} -> ${got.join(", ")}`);
  }
  await mkdir(resolve(ROOT, "src/data"), { recursive: true });
  await writeFile(resolve(ROOT, "src/data/trainers.json"), JSON.stringify(manifest, null, 2));
  console.log("wrote src/data/trainers.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
