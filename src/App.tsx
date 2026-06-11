import { useReducer } from "react";
import { initGame, reducer, TEAM_SIZE } from "./game/gameLogic";
import { TYPE_COLORS, typeLabel } from "./game/typeColors";
import { Lifelines } from "./components/Lifelines";
import { PokemonCard } from "./components/PokemonCard";
import { TeamTray } from "./components/TeamTray";
import { Results } from "./components/Results";

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initGame);

  if (state.phase === "results") {
    return (
      <div className="app">
        <Header />
        <Results team={state.team} onRestart={() => dispatch({ type: "restart" })} />
      </div>
    );
  }

  const { deck } = state;
  const spyglassLeft = state.lifelines.spyglass;

  return (
    <div className="app">
      <Header />

      <div className="progress">
        <span className="progress__label">
          Pick {state.round + 1} of {TEAM_SIZE}
        </span>
        <TeamTray team={state.team} activeSlot={state.round} />
      </div>

      <div className="round" style={{ ["--type-color" as string]: TYPE_COLORS[deck.type] }}>
        <div className="round__banner">
          <span className="round__eyebrow">This round's type</span>
          <span className="round__type">{typeLabel(deck.type)}</span>
          <span className="round__hint">Draft the Pokémon you think is strongest — BSTs are hidden.</span>
        </div>

        <Lifelines
          state={state}
          onSwitchType={() => dispatch({ type: "switchType" })}
          onRedeal={() => dispatch({ type: "redeal" })}
          onRevealBst={() => dispatch({ type: "revealBst" })}
        />

        <div className="deck">
          {deck.pokemon.map((p) => (
            <PokemonCard
              key={p.id}
              pokemon={p}
              revealed={deck.revealedBst || deck.spyglassed.includes(p.id)}
              canSpyglass={spyglassLeft > 0}
              onPick={() => dispatch({ type: "pick", pokemon: p })}
              onSpyglass={() => dispatch({ type: "spyglass", id: p.id })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="header">
      <img src="/pokeball.svg" alt="" className="header__logo" />
      <h1 className="header__title">PokéDraft</h1>
      <span className="header__tag">Build the ultimate team</span>
    </header>
  );
}
