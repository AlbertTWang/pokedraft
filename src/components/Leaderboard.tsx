import { useEffect, useState } from "react";
import { fetchLeaderboard, LeaderboardError } from "../game/api";
import { loadRuns, type SavedRun } from "../game/history";
import type { LeaderboardResponse } from "../game/leaderboardTypes";

interface Props {
  onClose: () => void;
  highlightId?: string;
}

type State = "loading" | "ready" | "disabled" | "error";

export function Leaderboard({ onClose, highlightId }: Props) {
  const [state, setState] = useState<State>("loading");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [err, setErr] = useState("");
  const runs = loadRuns();

  useEffect(() => {
    let alive = true;
    fetchLeaderboard(50)
      .then((d) => {
        if (alive) {
          setData(d);
          setState("ready");
        }
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof LeaderboardError && e.disabled) setState("disabled");
        else {
          setErr(e?.message ?? "Could not load leaderboard");
          setState("error");
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel__head">
          <h2>🏆 Global Leaderboard</h2>
          <button className="panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {state === "loading" && <p className="panel__msg">Loading…</p>}

        {state === "disabled" && (
          <p className="panel__msg">
            The global leaderboard isn’t live yet — it switches on once the database is
            connected. Your scores are saved locally in the meantime.
          </p>
        )}

        {state === "error" && <p className="panel__msg">Couldn’t load the leaderboard: {err}</p>}

        {state === "ready" && data && (
          <>
            <div className="panel__sub">
              {data.count.toLocaleString()} team{data.count === 1 ? "" : "s"} drafted
            </div>
            {data.top.length === 0 ? (
              <p className="panel__msg">No teams yet — be the first to submit one!</p>
            ) : (
              <table className="lb">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Trainer</th>
                    <th>Tier</th>
                    <th className="num">Score</th>
                    <th className="num">BST</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top.map((e) => (
                    <tr key={e.id} className={e.id === highlightId ? "lb__me" : undefined}>
                      <td>{e.rank}</td>
                      <td className="lb__name">{e.name}</td>
                      <td>{e.tier}</td>
                      <td className="num">{e.total}</td>
                      <td className="num">{e.bst}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {runs.length > 0 && (
          <div className="panel__runs">
            <h3>Your recent runs</h3>
            <ul>
              {runs.slice(0, 5).map((r: SavedRun) => (
                <li key={r.createdAt}>
                  <span className="run__tier">{r.tier}</span>
                  <span className="run__score">{r.total}/100</span>
                  {r.rank ? <span className="run__rank">#{r.rank.toLocaleString()}</span> : null}
                  <span className="run__date">{new Date(r.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
