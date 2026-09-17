import { test, expect, type Page } from '@playwright/test';

test('AI responds with a white stone and returns the turn to the human', async ({ page }) => {
  await goToAiPlayPage(page);

  await getIntersection(page, 0, 0).click();

  await expect(getIntersection(page, 0, 0)).toHaveAttribute('data-status', 'black');
  await expect(page.locator('[data-status="black"]')).toHaveCount(1);
  await expect(page.locator('[data-status="white"]')).toHaveCount(1);
  await expect(page.getByText(`Black's turn`, { exact: true })).toBeVisible();
});

test('starting a new game preserves AI mode', async ({ page }) => {
  await goToAiPlayPage(page);
  await getNewGameButton(page).click();

  await getIntersection(page, 0, 0).click();

  await expect(page.locator('[data-status="white"]')).toHaveCount(1);
});

test('shows whose turn it is', async ({ page }) => {
  await goToManualPlayPage(page);

  await expect(page.getByText(`Black's turn`, { exact: true })).toBeVisible();

  await getIntersection(page, 0, 0).click();

  await expect(page.getByText(`White's turn`, { exact: true })).toBeVisible();
});

test('shows who won the game', async ({ page }) => {
  await goToManualPlayPage(page);

  await play(
    page,
    [0, 0], [0, 7],
    [1, 0], [1, 7],
    [2, 0], [2, 7],
    [3, 0], [3, 7],
    [4, 0],
  );

  await expect(page.getByText('Black wins!', { exact: true })).toBeVisible();
});

test('clicking places alternating stones, starting with black', async ({ page }) => {
  await goToManualPlayPage(page);

  const first = getIntersection(page, 0, 0);
  await first.click();
  await expect(first).toHaveAttribute('data-status', 'black');

  const second = getIntersection(page, 1, 0);
  await second.click();
  await expect(second).toHaveAttribute('data-status', 'white');

  const third = getIntersection(page, 2, 0);
  await third.click();
  await expect(third).toHaveAttribute('data-status', 'black');
});

test('marks the last move made', async ({ page }) => {
  await goToManualPlayPage(page);

  const first = getIntersection(page, 0, 0);
  const second = getIntersection(page, 1, 0);

  await expect(first).not.toHaveAttribute('data-last-move');
  await first.click();
  await expect(first).toHaveAttribute('data-last-move');

  await second.click();
  await expect(first).not.toHaveAttribute('data-last-move');
  await expect(second).toHaveAttribute('data-last-move');
});

test('marks the stones of the line that won the game', async ({ page }) => {
  await goToManualPlayPage(page);

  await play(
    page,
    [0, 0], [0, 7],
    [1, 0], [1, 7],
    [2, 0], [2, 7],
    [3, 0], [3, 7],
  );

  for (let x = 0; x <= 3; x++) {
    await expect(getIntersection(page, x, 0)).not.toHaveAttribute('data-winning');
  }

  await play(page, [4, 0]);

  for (let x = 0; x <= 4; x++) {
    await expect(getIntersection(page, x, 0)).toHaveAttribute('data-winning');
  }
  await expect(getIntersection(page, 0, 7)).not.toHaveAttribute('data-winning');
});

test('clicking an occupied intersection is ignored', async ({ page }) => {
  await goToManualPlayPage(page);

  const first = getIntersection(page, 0, 0);
  await first.click();

  await expect(first).toHaveAttribute('data-status', 'black');
  await first.click();
  await expect(first).toHaveAttribute('data-status', 'black');

  // The ignored click didn't consume the turn: white is still the one to play
  const second = getIntersection(page, 1, 0);
  await second.click();
  await expect(second).toHaveAttribute('data-status', 'white');
});

test('tab reaches the new game button and then the center intersection', async ({ page }) => {
  await goToHomePage(page);

  await page.keyboard.press('Tab');
  await expect(getNewGameButton(page)).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(getIntersection(page, 0, 0)).toBeFocused();
});

test('tab returns to the last focused intersection', async ({ page }) => {
  await goToHomePage(page);

  const intersection = getIntersection(page, 2, 2);
  await intersection.focus();

  await page.keyboard.press('Shift+Tab');
  await expect(intersection).not.toBeFocused();

  await page.keyboard.press('Tab');
  await expect(intersection).toBeFocused();
});

test('starting a new game clears the board', async ({ page }) => {
  await goToManualPlayPage(page);

  const first = getIntersection(page, 0, 0);
  const second = getIntersection(page, 1, 0);
  await first.click();
  await second.click();

  await getNewGameButton(page).click();

  await expect(first).toHaveAttribute('data-status', 'empty');
  await expect(second).toHaveAttribute('data-status', 'empty');
});

test('starting a new game resets the board tab stop to the center', async ({ page }) => {
  await goToHomePage(page);

  await getIntersection(page, 2, 2).focus();

  await getNewGameButton(page).click();
  await expect(getNewGameButton(page)).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(getIntersection(page, 0, 0)).toBeFocused();
});

for (const key of ['Enter', 'Space']) {
  test(`pressing ${key} on the focused intersection places a stone on it`, async ({ page }) => {
    await goToHomePage(page);

    const intersection = getIntersection(page, 0, 0);
    await intersection.focus();
    await page.keyboard.press(key);

    await expect(intersection).toHaveAttribute('data-status', 'black');
  });
}

test('arrow keys navigate focus to adjacent intersections', async ({ page }) => {
  await goToHomePage(page);

  await getIntersection(page, 0, 0).focus();

  await page.keyboard.press('ArrowUp');
  await expect(getIntersection(page, 0, 1)).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(getIntersection(page, 0, 0)).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(getIntersection(page, 1, 0)).toBeFocused();

  await page.keyboard.press('ArrowLeft');
  await expect(getIntersection(page, 0, 0)).toBeFocused();
});

test('arrow keys keep focus in place at the edges of the board', async ({ page }) => {
  await goToHomePage(page);

  // The two opposite corners between them exercise all four edges.
  const topLeft = getIntersection(page, -7, 7);
  await topLeft.focus();

  await page.keyboard.press('ArrowUp');
  await expect(topLeft).toBeFocused();

  await page.keyboard.press('ArrowLeft');
  await expect(topLeft).toBeFocused();

  const bottomRight = getIntersection(page, 7, -7);
  await bottomRight.focus();

  await page.keyboard.press('ArrowDown');
  await expect(bottomRight).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(bottomRight).toBeFocused();
});

test.describe('on a device without hover (mobile)', () => {
  test.use({ hasTouch: true });

  test('the first tap previews a stone and the second tap places it', async ({ page }) => {
    await goToHomePage(page);

    const intersection = getIntersection(page, 0, 0);

    await expect(intersection).not.toHaveAttribute('data-previewed');
    await intersection.tap();
    await expect(intersection).toHaveAttribute('data-previewed');
    await expect(intersection).toHaveAttribute('data-status', 'empty');

    await intersection.tap();
    await expect(intersection).not.toHaveAttribute('data-previewed');
    await expect(intersection).toHaveAttribute('data-status', 'black');
  });

  test('tapping another intersection moves the preview to it', async ({ page }) => {
    await goToHomePage(page);

    const first = getIntersection(page, 0, 0);
    const second = getIntersection(page, 1, 0);

    await first.tap();
    await expect(first).toHaveAttribute('data-previewed');

    await second.tap();
    await expect(first).not.toHaveAttribute('data-previewed');
    await expect(second).toHaveAttribute('data-previewed');
  });
});

async function goToHomePage(page: Page) {
  await page.goto('/');
}

// Allows explicit control of both players' moves without AI.
async function goToManualPlayPage(page: Page) {
  await page.goto('/?mode=manual');
}

async function goToAiPlayPage(page: Page) {
  await page.goto('/?mode=ai');
}

function getNewGameButton(page: Page) {
  return page.getByRole('button', { name: 'New game' });
}

function getIntersection(page: Page, x: number, y: number) {
  return page.getByTestId(`intersection-(${x},${y})`);
}

async function play(page: Page, ...moves: [x: number, y: number][]) {
  for (const [x, y] of moves) await getIntersection(page, x, y).click();
}
