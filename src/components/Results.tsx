import { useEffect, useMemo, useRef, useState } from "react";
import { LeaderboardError, submitRun, updateName } from "../game/api";
import { lastName, rememberName, saveRun } from "../game/history";
import type { SubmitResponse } from "../game/leaderboardTypes";
import { evaluateTeam } from "../game/scoring";
import { buildShareText, copyText, nativeShare, ordinal, type ShareData } from "../game/share";
import { generateShareImage } from "../game/shareImage";
import { pickTrainer } from "../game/trainers";
import { TYPE_EMOJI } from "../game/typeEmoji";
import type { Pokemon } from "../game/types";

interface Props {
  team: Pokemon[];
  gameId: number;
  onRestart: () => void;
  onOpenLeaderboard: (highlightId?: string) => void;
}

type SubmitStatus = "submitting" | "done" | "disabled" | "error";

// Submit a finished run exactly once per game, even across React strict-mode
// remounts, by caching the in-flight promise by game id.
const runCache = new Map<number, Promise<SubmitResponse>>();
function submitOnce(gameId: number, name: string, teamIds: number[]): Promise<SubmitResponse> {
  let p = runCache.get(gameId);
  if (!p) {
    p = submitRun(name, teamIds);
    runCache.set(gameId, p);
  }
  return p;
}

export function Results({ team, gameId, onRestart, onOpenLeaderboard }: Props) {
  const ev = useMemo(() => evaluateTeam(team), [team]);
  // Pick a trainer portrait once per game (stable across card regenerations).
  const trainerSrc = useMemo(() => pickTrainer(ev.tier.label), [gameId, ev.tier.label]);

  const [status, setStatus] = useState<SubmitStatus>("submitting");
  const [data, setData] = useState<SubmitResponse | null>(null);
  const [displayName, setDisplayName] = useState(() => lastName() || "Anonymous");
  const [nameDraft, setNameDraft] = useState(() => lastName());
  const [savingName, setSavingName] = useState(false);

  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [toast, setToast] = useState("");

  const savedRef = useRef(false);

  // --- auto-submit the run (anonymously, or with a remembered name) ---
  useEffect(() => {
    let alive = true;
    setStatus("submitting");
    submitOnce(gameId, lastName(), team.map((p) => p.id))
      .then((res) => {
        if (!alive) return;
        setData(res);
        setDisplayName(res.entry.name);
        setStatus("done");
        if (!savedRef.current) {
          savedRef.current = true;
          saveRun({
            id: res.entry.id,
            name: res.entry.name,
            total: res.entry.total,
            tier: res.entry.tier,
            bst: res.entry.bst,
            teamIds: res.entry.teamIds,
            rank: res.rank24h,
            count: res.count24h,
            createdAt: res.entry.createdAt,
          });
        }
      })
      .catch((e) => {
        if (!alive) return;
        setStatus(e instanceof LeaderboardError && e.disabled ? "disabled" : "error");
      });
    return () => {
      alive = false;
    };
  }, [gameId, team]);

  // --- (re)generate the scorecard once we know the percentile / name ---
  useEffect(() => {
    if (status === "submitting") return; // wait for the headline numbers
    let cancelled = false;
    generateShareImage({
      tier: ev.tier.label,
      total: ev.total,
      percentile: data?.percentile,
      rank24h: data?.rank24h,
      name: displayName,
      team,
      strengthPts: ev.strengthPts,
      defensePts: ev.defense.pts,
      coveragePts: ev.coverage.pts,
      trainerSrc,
    }).then((blob) => {
      if (cancelled || !blob) return;
      setCardBlob(blob);
      setCardUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [status, data, displayName, ev, team, trainerSrc]);

  useEffect(() => () => {
    if (cardUrl) URL.revokeObjectURL(cardUrl);
  }, [cardUrl]);

  const shareData: ShareData = {
    tier: ev.tier.label,
    total: ev.total,
    strengthPts: ev.strengthPts,
    defensePts: ev.defense.pts,
    coveragePts: ev.coverage.pts,
    percentile: data?.percentile,
    rank24h: data?.rank24h,
    typeEmojis: team.map((p) => TYPE_EMOJI[p.types[0]]),
    url:
      typeof location !== "undefined" && location.origin
        ? location.origin
        : "https://pokedraft-lyart.vercel.app",
  };
  const shareText = buildShareText(shareData);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1600);
  }

  async function onSaveName() {
    const name = nameDraft.trim();
    if (!name || !data) return;
    setSavingName(true);
    try {
      const res = await updateName(data.entry.id, name);
      setDisplayName(res.name);
      rememberName(res.name);
      flash("Saved to the leaderboard!");
    } catch {
      flash("Couldn't save name");
    } finally {
      setSavingName(false);
    }
  }

  function fileFromCard(): File | undefined {
    return cardBlob ? new File([cardBlob], "pokedraft.png", { type: "image/png" }) : undefined;
  }

  async function onCopy() {
    flash((await copyText(shareText)) ? "Copied to clipboard!" : "Copy failed");
  }
  async function onShare() {
    const shared = await nativeShare(shareText, fileFromCard());
    if (!shared) flash((await copyText(shareText)) ? "Copied to clipboard!" : "Share unavailable");
  }
  function onDownload() {
    if (!cardBlob) return;
    const url = URL.createObjectURL(cardBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pokedraft.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  const headline =
    status === "done" && data
      ? `${ev.tier.label} · ${ev.total}/100 · ${ordinal(data.percentile)} percentile (24h)`
      : `${ev.tier.label} · ${ev.total}/100`;

  return (
    <div className="results">
      <p className="results__headline">{headline}</p>

      <div className="scorecard">
        {cardUrl ? (
          <img src={cardUrl} alt={`PokéDraft scorecard — ${ev.tier.label}, ${ev.total} out of 100`} />
        ) : (
          <div className="scorecard__loading">Building your scorecard…</div>
        )}
      </div>

      {/* Name (optional) */}
      {status === "disabled" ? (
        <p className="submit__note">Leaderboard is offline — your scorecard still works to share.</p>
      ) : status === "error" ? (
        <p className="submit__note">Couldn’t reach the leaderboard, but your scorecard is ready below.</p>
      ) : (
        <div className="nameform">
          <input
            className="submit__input"
            type="text"
            maxLength={20}
            placeholder="Add your name (optional)"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSaveName()}
            disabled={status === "submitting"}
          />
          <button
            className="btn btn--primary"
            onClick={onSaveName}
            disabled={savingName || status === "submitting" || !nameDraft.trim()}
          >
            {savingName ? "Saving…" : "Save name"}
          </button>
        </div>
      )}

      <div className="share">
        <button className="btn btn--share" onClick={onCopy}>📋 Copy</button>
        <button className="btn btn--share" onClick={onShare}>📤 Share</button>
        <button className="btn btn--share" onClick={onDownload} disabled={!cardBlob}>🖼️ Download card</button>
        {toast && <span className="share__toast">{toast}</span>}
      </div>

      <div className="results__actions">
        <button className="btn" onClick={() => onOpenLeaderboard(data?.entry.id)}>🏆 Leaderboard</button>
        <button className="btn btn--primary" onClick={onRestart}>Draft a new team</button>
      </div>
    </div>
  );
}
