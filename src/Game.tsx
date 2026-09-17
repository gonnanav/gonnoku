import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Board } from './Board.tsx';
import { GameMessage } from './GameMessage.tsx';
import { NewGameButton } from './NewGameButton.tsx';
import {
  type Coordinate,
  type GameMode,
  type GameStatus,
  type IntersectionStatus,
  chooseAiMove,
  coordinatesEqual,
  initialGameState,
  keyOf,
  nextCoordinate,
  placeStone,
  previewOrPlaceStone,
  statusAt,
  statusOf,
} from './game.ts';
import clsx from 'clsx';
import classes from './Game.module.css';

const centerCoordinate: Coordinate = { x: 0, y: 0 };

type GameProps = {
  className?: string;
  mode: GameMode;
}

export function Game({ className, mode }: GameProps) {
  const { status, statusAt, placeStone, previewOrPlaceStone, resetGame } = useGame(mode);
  const {
    registerIntersection,
    focusIntersection,
    tabIndexFor,
    setTabStop,
    resetTabStop,
  } = useRovingFocus();

  function handleNewGame() {
    resetGame();
    resetTabStop();
  }

  function handleIntersectionKeyDown(event: KeyboardEvent, coordinate: Coordinate) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      placeStone(coordinate);
      return;
    }

    if (
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight'
    ) {
      event.preventDefault();
      focusIntersection(nextCoordinate(coordinate, event.key));
    }
  }

  // On mobile (no hover), first tap previews and second tap places.
  function handleIntersectionClick(coordinate: Coordinate) {
    if (window.matchMedia('(hover: hover)').matches) {
      placeStone(coordinate);
    } else {
      previewOrPlaceStone(coordinate);
    }
  }

  return (
    <div className={clsx(classes.root, className)}>
      <div className={classes.statusBar}>
        <GameMessage className={classes.message} status={status} />
        <NewGameButton className={classes.newGameButton} onClick={handleNewGame} />
      </div>
      <Board
        className={classes.board}
        status={status}
        statusAt={statusAt}
        tabIndexFor={tabIndexFor}
        registerIntersection={registerIntersection}
        onIntersectionFocus={setTabStop}
        onIntersectionKeyDown={handleIntersectionKeyDown}
        onIntersectionClick={handleIntersectionClick}
      />
    </div>
  );
}

type UseGameResult = {
  status: GameStatus;
  statusAt: (coordinate: Coordinate) => IntersectionStatus;
  placeStone: (coordinate: Coordinate) => void;
  previewOrPlaceStone: (coordinate: Coordinate) => void;
  resetGame: () => void;
};

function useGame(mode: GameMode): UseGameResult {
  const [game, setGame] = useState(() => ({ ...initialGameState, mode }));

  useEffect(() => {
    const aiMove = chooseAiMove(game);
    if (!aiMove) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- The AI takes a separate turn in response to committed game state.
    setGame((prev) => placeStone(prev, 'ai', aiMove));
  }, [game]);

  return {
    status: statusOf(game),
    statusAt: (coordinate) => statusAt(game, coordinate),
    placeStone: (coordinate) => setGame((prev) => placeStone(prev, 'human', coordinate)),
    previewOrPlaceStone: (coordinate) => setGame((prev) => previewOrPlaceStone(prev, coordinate)),
    resetGame: () => setGame({ ...initialGameState, mode }),
  };
}

type UseRovingFocusResult = {
  registerIntersection: (element: HTMLElement | null, coordinate: Coordinate) => void;
  focusIntersection: (coordinate: Coordinate) => void;
  tabIndexFor: (coordinate: Coordinate) => number;
  setTabStop: (coordinate: Coordinate) => void;
  resetTabStop: () => void;
};

function useRovingFocus(): UseRovingFocusResult {
  const [tabStop, setTabStop] = useState<Coordinate>(centerCoordinate);
  const intersectionsRef = useRef(new Map<string, HTMLElement>());

  function registerIntersection(element: HTMLElement | null, coordinate: Coordinate) {
    if (!element) return;
    intersectionsRef.current.set(keyOf(coordinate), element);
  }

  function focusIntersection(coordinate: Coordinate) {
    intersectionsRef.current.get(keyOf(coordinate))?.focus();
  }

  function tabIndexFor(coordinate: Coordinate) {
    return coordinatesEqual(tabStop, coordinate) ? 0 : -1;
  }

  function resetTabStop() {
    setTabStop(centerCoordinate);
  }

  return { registerIntersection, focusIntersection, tabIndexFor, setTabStop, resetTabStop };
}
