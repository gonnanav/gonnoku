export type Coordinate = { readonly x: number; readonly y: number };

export type Player = 'human' | 'ai';

export type GameMode = 'manual' | 'ai';

export type GameState = {
  readonly mode: GameMode;
  readonly moves: readonly Coordinate[];
  readonly previewedStone: Coordinate | null;
};

export const initialGameState: GameState = {
  mode: 'manual',
  moves: [],
  previewedStone: null,
};

export function placeStone(game: GameState, player: Player, coordinate: Coordinate): GameState {
  if (!canPlaceStone(game, player, coordinate)) return game;

  return {
    ...game,
    moves: [...game.moves, coordinate],
    previewedStone: null,
  };
}

export function previewOrPlaceStone(game: GameState, coordinate: Coordinate): GameState {
  if (!canPlaceStone(game, 'human', coordinate)) return game;
  if (isPreviewedAt(game, coordinate)) return placeStone(game, 'human', coordinate);

  return { ...game, previewedStone: coordinate };
}

function canPlaceStone(game: GameState, player: Player, coordinate: Coordinate): boolean {
  const status = statusOf(game);
  if (status.kind !== 'playing' || statusAt(game, coordinate).kind !== 'empty') return false;

  if (game.mode === 'manual') return player === 'human';

  return player === (status.currentColor === 'black' ? 'human' : 'ai');
}

export function chooseAiMove(game: GameState): Coordinate | undefined {
  const legalMoves = boardCoordinates.filter((coordinate) => canPlaceStone(game, 'ai', coordinate));
  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
}

export type StoneColor = 'black' | 'white';

export type GameStatus =
  | { readonly kind: 'playing'; readonly currentColor: StoneColor }
  | { readonly kind: 'won'; readonly winner: StoneColor };

export function statusOf(game: GameState): GameStatus {
  const { lastMove, winningStones } = deriveGame(game);

  if (!lastMove || winningStones.size === 0) {
    return { kind: 'playing', currentColor: colorOfMove(game.moves.length) };
  }

  // Only the last move can complete a line, so the winner is whoever played it.
  return { kind: 'won', winner: lastMove.color };
}

export type IntersectionStatus =
  | { readonly kind: 'empty'; readonly isPreviewed: boolean }
  | { readonly kind: StoneColor; readonly isLastMove: boolean; readonly isWinning: boolean };

export function statusAt(game: GameState, coordinate: Coordinate): IntersectionStatus {
  const { stones, lastMove, winningStones } = deriveGame(game);
  const color = stones.get(keyOf(coordinate));

  if (!lastMove || !color) return { kind: 'empty', isPreviewed: isPreviewedAt(game, coordinate) };

  return {
    kind: color,
    isLastMove: coordinatesEqual(lastMove.coordinate, coordinate),
    isWinning: winningStones.has(keyOf(coordinate)),
  };
}

function lastMoveOf(game: GameState): Move | undefined {
  const coordinate = game.moves.at(-1);
  if (!coordinate) return undefined;

  return { coordinate, color: colorOfMove(game.moves.length - 1) };
}

function isPreviewedAt(game: GameState, coordinate: Coordinate): boolean {
  return game.previewedStone !== null && coordinatesEqual(game.previewedStone, coordinate);
}

export function keyOf({ x, y }: Coordinate) {
  return `${x},${y}`;
}

export function coordinatesEqual(a: Coordinate, b: Coordinate) {
  return a.x === b.x && a.y === b.y;
}

type DerivedGame = {
  readonly stones: ReadonlyMap<string, StoneColor>;
  readonly lastMove: Move | undefined;
  readonly winningStones: ReadonlySet<string>;
};

const derivedGameCache = new WeakMap<readonly Coordinate[], DerivedGame>();

function deriveGame(game: GameState): DerivedGame {
  const cached = derivedGameCache.get(game.moves);
  if (cached) return cached;

  const stones = stonesOf(game.moves);
  const lastMove = lastMoveOf(game);
  const winningStones = winningStonesOf(stones, lastMove);
  const derivedGame = { stones, lastMove, winningStones };

  derivedGameCache.set(game.moves, derivedGame);

  return derivedGame;
}

function stonesOf(moves: readonly Coordinate[]): ReadonlyMap<string, StoneColor> {
  return new Map(moves.map((move, moveIndex) => [keyOf(move), colorOfMove(moveIndex)]));
}

function colorOfMove(moveIndex: number): StoneColor {
  return moveIndex % 2 === 0 ? 'black' : 'white';
}

type Move = { readonly coordinate: Coordinate; readonly color: StoneColor };

function winningStonesOf(
  stones: ReadonlyMap<string, StoneColor>,
  lastMove: Move | undefined,
): ReadonlySet<string> {
  const winningStones = new Set<string>();
  if (!lastMove) return winningStones;

  const { coordinate, color } = lastMove;

  const forwardSteps = [
    [1, 0], // horizontal
    [0, 1], // vertical
    [1, 1], // diagonal
    [1, -1], // anti-diagonal
  ] as const;

  for (const step of forwardSteps) {
    const [xStep, yStep] = step;
    const backward = consecutiveStonesAfter(stones, coordinate, color, [-xStep, -yStep]);
    const forward = consecutiveStonesAfter(stones, coordinate, color, step);
    const line = [...backward, coordinate, ...forward];

    if (line.length >= 5) {
      for (const stone of line) winningStones.add(keyOf(stone));
    }
  }

  return winningStones;
}

function consecutiveStonesAfter(
  stones: ReadonlyMap<string, StoneColor>,
  origin: Coordinate,
  color: StoneColor,
  [xStep, yStep]: readonly [xStep: number, yStep: number],
): Coordinate[] {
  const consecutiveStones: Coordinate[] = [];
  let coordinate = { x: origin.x + xStep, y: origin.y + yStep };

  while (stones.get(keyOf(coordinate)) === color) {
    consecutiveStones.push(coordinate);
    coordinate = { x: coordinate.x + xStep, y: coordinate.y + yStep };
  }

  return consecutiveStones;
}

export const boardSize = 15; // intersections per side; odd, so the center is an intersection
const radius = (boardSize - 1) / 2; // intersections from the center out to any edge

export const boardCoordinates: Coordinate[] = createBoardCoordinates();

function createBoardCoordinates(): Coordinate[] {
  const coordinates: Coordinate[] = [];

  for (let y = radius; y >= -radius; y--) {
    for (let x = -radius; x <= radius; x++) {
      coordinates.push({ x, y });
    }
  }

  return coordinates;
}

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export function nextCoordinate(coordinate: Coordinate, key: ArrowKey): Coordinate {
  switch (key) {
    case 'ArrowUp':
      return { x: coordinate.x, y: clampToBoard(coordinate.y + 1) };
    case 'ArrowDown':
      return { x: coordinate.x, y: clampToBoard(coordinate.y - 1) };
    case 'ArrowLeft':
      return { x: clampToBoard(coordinate.x - 1), y: coordinate.y };
    case 'ArrowRight':
      return { x: clampToBoard(coordinate.x + 1), y: coordinate.y };
  }
}

function clampToBoard(value: number): number {
  return Math.min(Math.max(value, -radius), radius);
}
