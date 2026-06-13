import { useReducer, useState } from "react";
import { initGame, reducer, TEAM_SIZE } from "./game/gameLogic";
import { TYPE_COLORS, typeLabel } from "./game/typeColors";
import { Lifelines } from "./components/Lifelines";
import { PokemonCard } from "./components/PokemonCard";
import { TeamTray } from "./components/TeamTray";
import { Results } from "./components/Results";
import { Leaderboard } from "./components/Leaderboard";

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initGame);
  const [leaderboard, setLeaderboard] = useState<{ open: boolean; highlightId?: string }>({
    open: false,
  });

  const openLeaderboard = (highlightId?: string) => setLeaderboard({ open: true, highlightId });
  const closeLeaderboard = () => setLeaderboard((s) => ({ ...s, open: false }));

  return (
    <div className="app">
      <Header onOpenLeaderboard={() => openLeaderboard()} />

      {state.phase === "results" ? (
        <Results
          team={state.team}
          gameId={state.id}
          onRestart={() => dispatch({ type: "restart" })}
          onOpenLeaderboard={openLeaderboard}
        />
      ) : (
        <DraftView state={state} dispatch={dispatch} />
      )}

      {leaderboard.open && (
        <Leaderboard onClose={closeLeaderboard} highlightId={leaderboard.highlightId} />
      )}
    </div>
  );
}

function DraftView({
  state,
  dispatch,
}: {
  state: ReturnType<typeof initGame>;
  dispatch: React.Dispatch<Parameters<typeof reducer>[1]>;
}) {
  const { deck } = state;
  const spyglassLeft = state.lifelines.spyglass;

  return (
    <>
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
          <span className="round__hint">
            Draft the Pokémon you think is strongest — BSTs are hidden.
          </span>
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
    </>
  );
}

function Header({ onOpenLeaderboard }: { onOpenLeaderboard: () => void }) {
  return (
    <header className="header">
      <img src="/pokeball.svg" alt="" className="header__logo" />
      <h1 className="header__title">PokéDraft</h1>
      <button className="header__lb" onClick={onOpenLeaderboard}>
        🏆 Leaderboard
      </button>
    </header>
  );
}
