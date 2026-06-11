import type { Pokemon } from "../game/types";
import { TypeBadge } from "./TypeBadge";

interface Props {
  pokemon: Pokemon;
  revealed: boolean;
  canSpyglass: boolean;
  onPick: () => void;
  onSpyglass: () => void;
}

const STAT_ROWS: [keyof Pokemon["stats"], string][] = [
  ["hp", "HP"],
  ["attack", "Atk"],
  ["defense", "Def"],
  ["spAtk", "SpA"],
  ["spDef", "SpD"],
  ["speed", "Spe"],
];

export function PokemonCard({ pokemon, revealed, canSpyglass, onPick, onSpyglass }: Props) {
  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
    >
      {canSpyglass && !revealed && (
        <button
          className="card__spyglass"
          title="Spyglass: reveal this Pokémon's stats"
          onClick={(e) => {
            e.stopPropagation();
            onSpyglass();
          }}
        >
          🔍
        </button>
      )}

      <div className="card__art">
        <img src={pokemon.sprite} alt={pokemon.name} loading="lazy" />
      </div>

      <div className="card__name">{pokemon.name}</div>

      <div className="card__types">
        {pokemon.types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>

      {revealed ? (
        <div className="card__stats">
          <div className="card__bst">
            BST <strong>{pokemon.bst}</strong>
          </div>
          <div className="card__statgrid">
            {STAT_ROWS.map(([key, label]) => (
              <span key={key} className="stat">
                <em>{label}</em>
                {pokemon.stats[key]}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="card__hidden">
          <span className="lock">🔒</span> BST hidden
        </div>
      )}

      <div className="card__draft">Draft →</div>
    </div>
  );
}
