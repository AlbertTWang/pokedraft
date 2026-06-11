import { evaluateTeam } from "../game/scoring";
import type { Pokemon } from "../game/types";
import { TypeBadge } from "./TypeBadge";

interface Props {
  team: Pokemon[];
  onRestart: () => void;
}

export function Results({ team, onRestart }: Props) {
  const ev = evaluateTeam(team);

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

      <button className="btn btn--primary" onClick={onRestart}>
        Draft a new team
      </button>
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
