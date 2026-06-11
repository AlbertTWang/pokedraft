import { TEAM_SIZE } from "../game/gameLogic";
import type { Pokemon } from "../game/types";

interface Props {
  team: Pokemon[];
  activeSlot: number; // which slot is currently being drafted
}

export function TeamTray({ team, activeSlot }: Props) {
  return (
    <div className="tray">
      {Array.from({ length: TEAM_SIZE }, (_, i) => {
        const p = team[i];
        const active = i === activeSlot && !p;
        return (
          <div key={i} className={`slot${p ? " slot--filled" : ""}${active ? " slot--active" : ""}`}>
            {p ? (
              <>
                <img src={p.sprite} alt={p.name} />
                <span className="slot__name">{p.name}</span>
              </>
            ) : (
              <span className="slot__empty">{active ? "?" : i + 1}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
