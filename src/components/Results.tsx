import { useMemo, useState } from "react";
import { LeaderboardError, submitRun } from "../game/api";
import { lastName, rememberName, saveRun } from "../game/history";
import type { SubmitResponse } from "../game/leaderboardTypes";
import { evaluateTeam } from "../game/scoring";
import { buildShareText, copyText, nativeShare, type ShareData } from "../game/share";
import { generateShareImage } from "../game/shareImage";
import { TYPE_EMOJI } from "../game/typeEmoji";
import type { Pokemon } from "../game/types";
import { TypeBadge } from "./TypeBadge";

interface Props {
  team: Pokemon[];
  onRestart: () => void;
  onOpenLeaderboard: (highlightId?: string) => void;
}

type SubmitState = "idle" | "submitting" | "done" | "disabled" | "error";

export function Results({ team, onRestart, onOpenLeaderboard }: Props) {
  const ev = useMemo(() => evaluateTeam(team), [team]);
  const [name, setName] = useState(lastName());
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  const shareUrl =
    typeof location !== "undefined" && location.origin
      ? location.origin
      : "https://pokedraft-lyart.vercel.app";

  const shareData: ShareData = {
    tier: ev.tier.label,
    total: ev.total,
    strengthPts: ev.strengthPts,
    defensePts: ev.defense.pts,
    coveragePts: ev.coverage.pts,
    rank: result?.entry.rank,
    count: result?.count,
    typeEmojis: team.map((p) => TYPE_EMOJI[p.types[0]]),
    url: shareUrl,
  };
  const shareText = buildShareText(shareData);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1600);
  }

  async function onSubmit() {
    setSubmitState("submitting");
    setErr("");
    try {
      const r = await submitRun(name, team.map((p) => p.id));
      setResult(r);
      setSubmitState("done");
      rememberName(name);
      saveRun({
        id: r.entry.id,
        name: r.entry.name,
        total: r.entry.total,
        tier: r.entry.tier,
        bst: r.entry.bst,
        teamIds: r.entry.teamIds,
        rank: r.entry.rank,
        count: r.count,
        createdAt: r.entry.createdAt,
      });
    } catch (e) {
      if (e instanceof LeaderboardError && e.disabled) {
        setSubmitState("disabled");
      } else {
        setErr(e instanceof Error ? e.message : "Submission failed");
        setSubmitState("error");
      }
    }
  }

  async function onCopy() {
    flash((await copyText(shareText)) ? "Copied to clipboard!" : "Copy failed");
  }

  async function onShare() {
    let file: File | undefined;
    try {
      const blob = await generateShareImage({
        tier: ev.tier.label,
        total: ev.total,
        teamIds: team.map((p) => p.id),
        rank: result?.entry.rank,
        count: result?.count,
      });
      if (blob) file = new File([blob], "pokedraft.png", { type: "image/png" });
    } catch {
      /* fall back to text-only share */
    }
    const shared = await nativeShare(shareText, file);
    if (!shared) flash((await copyText(shareText)) ? "Copied to clipboard!" : "Share unavailable");
  }

  async function onDownload() {
    const blob = await generateShareImage({
      tier: ev.tier.label,
      total: ev.total,
      teamIds: team.map((p) => p.id),
      rank: result?.entry.rank,
      count: result?.count,
    });
    if (!blob) {
      flash("Couldn’t make image");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pokedraft.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="results">
      <div className="results__verdict">
        <div className="results__tierlabel">Your team ranks as a</div>
        <h1 className="results__tier">{ev.tier.label}</h1>
        <p className="results__blurb">{ev.tier.blurb}</p>
        <div className="results__score">
          <span className="results__total">{ev.total}</span>
          <span className="results__outof">/ 100</span>
        </div>
      </div>

      <div className="results__breakdown">
        <ScoreBar label="Strength (BST)" value={ev.strengthPts} max={50}
          detail={`${ev.bst} total base stats`} />
        <ScoreBar label="Defensive Synergy" value={ev.defense.pts} max={30}
          detail={`${ev.defense.resistances} resists · ${ev.defense.immunities} immunities · ${ev.defense.weaknesses} weaknesses`} />
        <ScoreBar label="Offensive Coverage" value={ev.coverage.pts} max={20}
          detail={`hits ${ev.coverage.covered}/18 types super-effectively`} />
      </div>

      <div className="results__team">
        {team.map((p) => (
          <div key={p.id} className="results__member">
            <img src={p.sprite} alt={p.name} />
            <span className="results__membername">{p.name}</span>
            <span className="results__memberbst">{p.bst}</span>
            <div className="results__membertypes">
              {p.types.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard submission */}
      <div className="submit">
        {submitState === "done" && result ? (
          <div className="submit__done">
            <span className="submit__rank">
              🌍 Ranked <strong>#{result.entry.rank.toLocaleString()}</strong> of{" "}
              {result.count.toLocaleString()}
            </span>
            <button className="btn btn--ghost" onClick={() => onOpenLeaderboard(result.entry.id)}>
              View leaderboard
            </button>
          </div>
        ) : submitState === "disabled" ? (
          <p className="submit__note">
            Global leaderboard isn’t live yet — your run is saved locally. Sharing still works!
          </p>
        ) : (
          <div className="submit__form">
            <input
              className="submit__input"
              type="text"
              maxLength={20}
              placeholder="Your trainer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
            <button
              className="btn btn--primary"
              onClick={onSubmit}
              disabled={submitState === "submitting"}
            >
              {submitState === "submitting" ? "Submitting…" : "Submit to leaderboard"}
            </button>
          </div>
        )}
        {submitState === "error" && <p className="submit__err">{err}</p>}
      </div>

      {/* Share */}
      <div className="share">
        <button className="btn btn--share" onClick={onCopy}>📋 Copy result</button>
        <button className="btn btn--share" onClick={onShare}>📤 Share</button>
        <button className="btn btn--share" onClick={onDownload}>🖼️ Download card</button>
        {toast && <span className="share__toast">{toast}</span>}
      </div>

      <div className="results__actions">
        <button className="btn" onClick={() => onOpenLeaderboard(result?.entry.id)}>
          🏆 Leaderboard
        </button>
        <button className="btn btn--primary" onClick={onRestart}>
          Draft a new team
        </button>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max, detail }: { label: string; value: number; max: number; detail: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="scorebar">
      <div className="scorebar__head">
        <span className="scorebar__label">{label}</span>
        <span className="scorebar__value">{value}/{max}</span>
      </div>
      <div className="scorebar__track">
        <div className="scorebar__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="scorebar__detail">{detail}</div>
    </div>
  );
}
