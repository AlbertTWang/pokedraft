import { LIFELINES, type GameState } from "../game/gameLogic";

interface Props {
  state: GameState;
  onSwitchType: () => void;
  onRedeal: () => void;
  onRevealBst: () => void;
}

export function Lifelines({ state, onSwitchType, onRedeal, onRevealBst }: Props) {
  const { lifelines, deck } = state;

  return (
    <div className="lifelines">
      {LIFELINES.map((l) => {
        const remaining = lifelines[l.key];
        const spent = remaining <= 0;

        // Spyglass is triggered per-card; here it's an informational counter.
        const isSpyglass = l.key === "spyglass";
        const revealUsedThisRound = l.key === "revealBst" && deck.revealedBst;
        const disabled = spent || revealUsedThisRound || isSpyglass;

        const onClick =
          l.key === "switchType" ? onSwitchType
          : l.key === "redeal" ? onRedeal
          : l.key === "revealBst" ? onRevealBst
          : undefined;

        return (
          <button
            key={l.key}
            className="lifeline"
            disabled={disabled}
            onClick={onClick}
            title={l.desc + (isSpyglass ? " (click 🔍 on a card)" : "")}
          >
            <span className="lifeline__icon">{l.icon}</span>
            <span className="lifeline__label">{l.label}</span>
            <span className="lifeline__count">
              {Array.from({ length: l.max }, (_, i) => (
                <i key={i} className={i < remaining ? "pip pip--on" : "pip"} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
