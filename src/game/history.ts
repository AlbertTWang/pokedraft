// Local "your runs" history + remembered display name (localStorage).

export interface SavedRun {
  id?: string; // server entry id once submitted
  name: string;
  total: number;
  tier: string;
  bst: number;
  teamIds: number[];
  rank?: number;
  count?: number;
  createdAt: number;
}

const RUNS_KEY = "pokedraft:runs";
const NAME_KEY = "pokedraft:name";
const MAX_RUNS = 50;

export function loadRuns(): SavedRun[] {
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    return raw ? (JSON.parse(raw) as SavedRun[]) : [];
  } catch {
    return [];
  }
}

export function saveRun(run: SavedRun): void {
  const runs = [run, ...loadRuns()].slice(0, MAX_RUNS);
  try {
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function lastName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* non-fatal */
  }
}
