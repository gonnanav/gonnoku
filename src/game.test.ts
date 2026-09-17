import { assert, describe, expect, test } from 'vitest';
import {
  boardCoordinates,
  chooseAiMove,
  initialGameState,
  placeStone,
  previewOrPlaceStone,
  statusAt,
  statusOf,
  type Coordinate,
  type GameState,
} from './game.ts';

const black = expect.objectContaining({ kind: 'black' });
const white = expect.objectContaining({ kind: 'white' });
const empty = expect.objectContaining({ kind: 'empty' });

// Plays the moves in order, starting from a new game.
function play(...moves: Coordinate[]) {
  return moves.reduce(
    (game, coordinate) => placeStone(game, 'human', coordinate),
    initialGameState,
  );
}

describe('an intersection that had no stone placed on it is empty', () => {
  test('in a new game', () => {
    expect(statusAt(initialGameState, { x: 0, y: 0 })).toEqual(empty);
  });

  test('when a stone was placed elsewhere', () => {
    const game = play({ x: 1, y: 0 });

    expect(statusAt(game, { x: 0, y: 0 })).toEqual(empty);
  });
});

describe('stones are placed in alternating colors, starting with black', () => {
  test('when a single stone has been placed', () => {
    const game = play({ x: 0, y: 0 });

    expect(statusAt(game, { x: 0, y: 0 })).toEqual(black);
  });

  test('when four stones have been placed', () => {
    const game = play(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    );

    expect(statusAt(game, { x: 0, y: 0 })).toEqual(black);
    expect(statusAt(game, { x: 1, y: 0 })).toEqual(white);
    expect(statusAt(game, { x: 2, y: 0 })).toEqual(black);
    expect(statusAt(game, { x: 3, y: 0 })).toEqual(white);
  });
});

describe('the turn alternates between the players, starting with black', () => {
  test('in the first turn', () => {
    expect(statusOf(initialGameState)).toHaveProperty('currentColor', 'black');
  });

  test('in the second turn', () => {
    const game = play({ x: 0, y: 0 });

    expect(statusOf(game)).toHaveProperty('currentColor', 'white');
  });

  test('in the third turn', () => {
    const game = play(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    );

    expect(statusOf(game)).toHaveProperty('currentColor', 'black');
  });

  test('in the fourth turn', () => {
    const game = play(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    );

    expect(statusOf(game)).toHaveProperty('currentColor', 'white');
  });
});

describe('a player can make a move in his own turn', () => {
  test('when the player is human', () => {
    const game: GameState = { ...initialGameState, mode: 'ai' };

    const nextGame = placeStone(game, 'human', { x: 0, y: 0 });

    expect(statusAt(nextGame, { x: 0, y: 0 })).toEqual(black);
  });

  test('when the player is AI', () => {
    const initialGame: GameState = { ...initialGameState, mode: 'ai' };
    const game = placeStone(initialGame, 'human', { x: 0, y: 0 });

    const nextGame = placeStone(game, 'ai', { x: 1, y: 0 });

    expect(statusAt(nextGame, { x: 1, y: 0 })).toEqual(white);
  });
});

describe('a player cannot make a move not in his turn', () => {
  test('when the player is human', () => {
    const initialGame: GameState = { ...initialGameState, mode: 'ai' };
    const game = placeStone(initialGame, 'human', { x: 0, y: 0 });

    expect(placeStone(game, 'human', { x: 1, y: 0 })).toBe(game);
  });

  test('when the player is AI', () => {
    const game: GameState = { ...initialGameState, mode: 'ai' };

    expect(placeStone(game, 'ai', { x: 0, y: 0 })).toBe(game);
  });
});

test('AI chooses an empty intersection on the board on its turn', () => {
  const game: GameState = {
    ...play({ x: -7, y: 7 }, { x: 0, y: 0 }, { x: 7, y: -7 }),
    mode: 'ai',
  };

  const move = chooseAiMove(game);

  assert(move !== undefined, 'AI should choose a move on its turn');
  expect(boardCoordinates).toContainEqual(move);
  expect(statusAt(game, move)).toEqual(empty);
});

describe('AI chooses no move', () => {
  test('when the game is in manual mode', () => {
    const game = play({ x: 0, y: 0 });

    expect(chooseAiMove(game)).toBeUndefined();
  });

  test('when it is the human player\'s turn', () => {
    const game: GameState = { ...initialGameState, mode: 'ai' };

    expect(chooseAiMove(game)).toBeUndefined();
  });

  test('when the game ends', () => {
    const game: GameState = {
      ...play(
        { x: 0, y: 0 }, { x: 0, y: 7 },
        { x: 1, y: 0 }, { x: 1, y: 7 },
        { x: 2, y: 0 }, { x: 2, y: 7 },
        { x: 3, y: 0 }, { x: 3, y: 7 },
        { x: 4, y: 0 },
      ),
      mode: 'ai',
    };

    expect(chooseAiMove(game)).toBeUndefined();
  });
});

describe('an intersection that was played last is marked as the last move', () => {
  test('when it has the only stone on the board', () => {
    const game = play({ x: 0, y: 0 });

    expect(statusAt(game, { x: 0, y: 0 })).toHaveProperty('isLastMove', true);
  });

  test('when it has one of several stones on the board', () => {
    const game = play(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    );

    expect(statusAt(game, { x: 1, y: 0 })).toHaveProperty('isLastMove', true);
  });
});

test('an intersection that was not played last is not marked as the last move', () => {
  const game = play(
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  );

  expect(statusAt(game, { x: 0, y: 0 })).toHaveProperty('isLastMove', false);
});

describe('AI cannot place stones in manual mode', () => {
  test('when it is black\'s turn', () => {
    expect(placeStone(initialGameState, 'ai', { x: 0, y: 0 })).toBe(initialGameState);
  });

  test('when it is white\'s turn', () => {
    const game = play({ x: 0, y: 0 });

    expect(placeStone(game, 'ai', { x: 1, y: 0 })).toBe(game);
  });
});

test('trying to place a stone on an occupied intersection does nothing', () => {
  const game = play({ x: 0, y: 0 });

  expect(placeStone(game, 'human', { x: 0, y: 0 })).toBe(game);
});

describe('an intersection that was previewed since the last play is marked as previewed', () => {
  test('when no intersection is previewed', () => {
    const game = previewOrPlaceStone(initialGameState, { x: 0, y: 0 });

    expect(statusAt(game, { x: 0, y: 0 })).toHaveProperty('isPreviewed', true);
  });

  test('when another intersection is already previewed', () => {
    let game = previewOrPlaceStone(initialGameState, { x: 0, y: 0 });
    game = previewOrPlaceStone(game, { x: 1, y: 0 });

    expect(statusAt(game, { x: 1, y: 0 })).toHaveProperty('isPreviewed', true);
  });
});

describe('an intersection that was not previewed since the last play is not marked as previewed', () => {
  test('when it has never been previewed', () => {
    expect(statusAt(initialGameState, { x: 0, y: 0 })).toHaveProperty('isPreviewed', false);
  });

  test('when another intersection was previewed after it', () => {
    let game = previewOrPlaceStone(initialGameState, { x: 0, y: 0 });
    game = previewOrPlaceStone(game, { x: 1, y: 0 });

    expect(statusAt(game, { x: 0, y: 0 })).toHaveProperty('isPreviewed', false);
  });

  test('when a stone was placed after it was previewed', () => {
    let game = previewOrPlaceStone(initialGameState, { x: 0, y: 0 });
    game = placeStone(game, 'human', { x: 1, y: 0 });

    expect(statusAt(game, { x: 0, y: 0 })).toHaveProperty('isPreviewed', false);
  });
});

test('previewing and then confirming is the same as placing a stone directly', () => {
  let game = previewOrPlaceStone(initialGameState, { x: 0, y: 0 });
  game = previewOrPlaceStone(game, { x: 0, y: 0 });

  expect(game).toEqual(placeStone(initialGameState, 'human', { x: 0, y: 0 }));
});

test('previewing and then placing a stone is the same as placing a stone directly', () => {
  let game = previewOrPlaceStone(initialGameState, { x: 0, y: 0 });
  game = placeStone(game, 'human', { x: 0, y: 0 });

  expect(game).toEqual(placeStone(initialGameState, 'human', { x: 0, y: 0 }));
});

test('trying to preview an occupied intersection does nothing', () => {
  const game = play({ x: 0, y: 0 });

  expect(previewOrPlaceStone(game, { x: 0, y: 0 })).toBe(game);
});

test('the board coordinates run left to right, starting with the top row', () => {
  expect(boardCoordinates.at(0)).toEqual({ x: -7, y: 7 });
  expect(boardCoordinates.at(1)).toEqual({ x: -6, y: 7 });
  expect(boardCoordinates.at(-1)).toEqual({ x: 7, y: -7 });
});

describe('the player who lines up five stones in a row wins', () => {
  test('horizontally', () => {
    const game = play(
      { x: 0, y: 0 }, { x: 0, y: 7 },
      { x: 1, y: 0 }, { x: 1, y: 7 },
      { x: 2, y: 0 }, { x: 2, y: 7 },
      { x: 3, y: 0 }, { x: 3, y: 7 },
      { x: 4, y: 0 },
    );

    expect(statusOf(game)).toEqual({ kind: 'won', winner: 'black' });
  });

  test('vertically', () => {
    const game = play(
      { x: 0, y: 0 }, { x: 0, y: 7 },
      { x: 0, y: 1 }, { x: 1, y: 7 },
      { x: 0, y: 2 }, { x: 2, y: 7 },
      { x: 0, y: 3 }, { x: 3, y: 7 },
      { x: 0, y: 4 },
    );

    expect(statusOf(game)).toEqual({ kind: 'won', winner: 'black' });
  });

  test('diagonally', () => {
    const game = play(
      { x: 0, y: 0 }, { x: 0, y: 7 },
      { x: 1, y: 1 }, { x: 1, y: 7 },
      { x: 2, y: 2 }, { x: 2, y: 7 },
      { x: 3, y: 3 }, { x: 3, y: 7 },
      { x: 4, y: 4 },
    );

    expect(statusOf(game)).toEqual({ kind: 'won', winner: 'black' });
  });

  test('anti-diagonally', () => {
    const game = play(
      { x: 0, y: 4 }, { x: 0, y: 7 },
      { x: 1, y: 3 }, { x: 1, y: 7 },
      { x: 2, y: 2 }, { x: 2, y: 7 },
      { x: 3, y: 1 }, { x: 3, y: 7 },
      { x: 4, y: 0 },
    );

    expect(statusOf(game)).toEqual({ kind: 'won', winner: 'black' });
  });

  test('as white, too', () => {
    const game = play(
      { x: 0, y: 7 }, { x: 0, y: 0 },
      { x: 1, y: 7 }, { x: 1, y: 0 },
      { x: 2, y: 7 }, { x: 2, y: 0 },
      { x: 3, y: 7 }, { x: 3, y: 0 },
      { x: 0, y: 6 }, { x: 4, y: 0 },
    );

    expect(statusOf(game)).toEqual({ kind: 'won', winner: 'white' });
  });

  test('with more than five in a row', () => {
    const game = play(
      { x: 0, y: 0 }, { x: 0, y: 7 },
      { x: 1, y: 0 }, { x: 1, y: 7 },
      { x: 2, y: 0 }, { x: 2, y: 7 },
      { x: 3, y: 0 }, { x: 3, y: 7 },
      { x: 5, y: 0 }, { x: 0, y: 6 },
      { x: 4, y: 0 },
    );

    expect(statusOf(game)).toEqual({ kind: 'won', winner: 'black' });
  });
});

describe('the stones of the line that won the game are marked as winning', () => {
  test('when the line is exactly five stones long', () => {
    const game = play(
      { x: 0, y: 0 }, { x: 0, y: 7 },
      { x: 1, y: 0 }, { x: 1, y: 7 },
      { x: 2, y: 0 }, { x: 2, y: 7 },
      { x: 3, y: 0 }, { x: 3, y: 7 },
      { x: 4, y: 0 },
    );

    for (let x = 0; x <= 4; x++) {
      expect(statusAt(game, { x, y: 0 })).toHaveProperty('isWinning', true);
    }
  });

  test('when the line is longer than five stones', () => {
    const game = play(
      { x: 0, y: 0 }, { x: 0, y: 7 },
      { x: 1, y: 0 }, { x: 1, y: 7 },
      { x: 2, y: 0 }, { x: 2, y: 7 },
      { x: 3, y: 0 }, { x: 3, y: 7 },
      { x: 5, y: 0 }, { x: 0, y: 6 },
      { x: 4, y: 0 },
    );

    for (let x = 0; x <= 5; x++) {
      expect(statusAt(game, { x, y: 0 })).toHaveProperty('isWinning', true);
    }
  });

  test('in both lines, when the winning move completed two', () => {
    const game = play(
      // Black takes the x axis from 1 to 4, leaving the origin open.
      { x: 1, y: 0 }, { x: 0, y: 7 },
      { x: 2, y: 0 }, { x: 1, y: 7 },
      { x: 3, y: 0 }, { x: 2, y: 7 },
      { x: 4, y: 0 }, { x: 3, y: 7 },

      // Then the y axis from 1 to 4, leaving the origin open there too.
      { x: 0, y: 1 }, { x: 0, y: 6 },
      { x: 0, y: 2 }, { x: 1, y: 6 },
      { x: 0, y: 3 }, { x: 2, y: 6 },
      { x: 0, y: 4 }, { x: 3, y: 6 },

      // The origin is where the two axes cross, so it completes both at once.
      { x: 0, y: 0 },
    );

    for (let x = 0; x <= 4; x++) {
      expect(statusAt(game, { x, y: 0 })).toHaveProperty('isWinning', true);
    }

    for (let y = 0; y <= 4; y++) {
      expect(statusAt(game, { x: 0, y })).toHaveProperty('isWinning', true);
    }
  });
});

describe('a stone that is not part of the line that won the game is not marked as winning', () => {
  test('when nobody has won yet', () => {
    const game = play(
      { x: 0, y: 0 }, { x: 0, y: 7 },
      { x: 1, y: 0 }, { x: 1, y: 7 },
      { x: 2, y: 0 }, { x: 2, y: 7 },
      { x: 3, y: 0 },
    );

    expect(statusAt(game, { x: 3, y: 0 })).toHaveProperty('isWinning', false);
  });

  test('when the winner played it elsewhere on the board', () => {
    const game = play(
      { x: 0, y: 0 }, { x: 0, y: 7 },
      { x: 1, y: 0 }, { x: 1, y: 7 },
      { x: 2, y: 0 }, { x: 2, y: 7 },
      { x: 3, y: 0 }, { x: 3, y: 7 },
      { x: 2, y: 3 }, { x: 0, y: 6 },
      { x: 4, y: 0 },
    );

    expect(statusAt(game, { x: 2, y: 3 })).toHaveProperty('isWinning', false);
  });

  test('when it extends the line in the opposing color', () => {
    const game = play(
      { x: 0, y: 0 }, { x: 5, y: 0 },
      { x: 1, y: 0 }, { x: 0, y: 7 },
      { x: 2, y: 0 }, { x: 1, y: 7 },
      { x: 3, y: 0 }, { x: 2, y: 7 },
      { x: 4, y: 0 },
    );

    expect(statusAt(game, { x: 5, y: 0 })).toHaveProperty('isWinning', false);
  });
});

describe('the game does not change once it has been won', () => {
  // A game black won with five in a row along the x axis.
  const game = play(
    { x: 0, y: 0 }, { x: 0, y: 7 },
    { x: 1, y: 0 }, { x: 1, y: 7 },
    { x: 2, y: 0 }, { x: 2, y: 7 },
    { x: 3, y: 0 }, { x: 3, y: 7 },
    { x: 4, y: 0 },
  );

  test('when trying to place a stone', () => {
    expect(placeStone(game, 'human', { x: 2, y: 3 })).toBe(game);
  });

  test('when trying to preview an intersection', () => {
    expect(previewOrPlaceStone(game, { x: 2, y: 3 })).toBe(game);
  });
});

describe('the game is still playing while nobody has five in a row', () => {
  test('in a new game', () => {
    expect(statusOf(initialGameState)).toHaveProperty('kind', 'playing');
  });

  test('with only four in a row', () => {
    const game = play(
      { x: 0, y: 0 }, { x: 0, y: 7 },
      { x: 1, y: 0 }, { x: 1, y: 7 },
      { x: 2, y: 0 }, { x: 2, y: 7 },
      { x: 3, y: 0 },
    );

    expect(statusOf(game)).toHaveProperty('kind', 'playing');
  });

  test('with five stones on a line that an opposing stone splits', () => {
    const game = play(
      { x: 0, y: 0 }, { x: 2, y: 0 },
      { x: 1, y: 0 }, { x: 0, y: 7 },
      { x: 3, y: 0 }, { x: 1, y: 7 },
      { x: 4, y: 0 }, { x: 2, y: 7 },
      { x: 5, y: 0 },
    );

    expect(statusOf(game)).toHaveProperty('kind', 'playing');
  });
});
