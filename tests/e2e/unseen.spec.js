// The app as a visitor uses it: marking countries through the search field and the panel.
import { expect, setRange, test } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // The map is drawn once the world shapes have been read.
  await expect(page.locator('#mapContainer svg .place').first()).toBeVisible();
});

/** Opens a country's panel through the search field. */
async function open(page, country) {
  await page.fill('#placeSearch', country);
  await page.press('#placeSearch', 'Enter');
  await expect(page.locator('#panel')).toHaveClass(/open/);
  await expect(page.locator('#panelTitle')).toContainText(country);
}

async function closePanel(page) {
  await page.keyboard.press('Escape');
  await expect(page.locator('#panel')).not.toHaveClass(/open/);
}

test('the map shows every place: 166 country shapes, 29 dots and the territories', async ({ page }) => {
  await expect(page.locator('#mapContainer circle.place')).toHaveCount(29);
  expect(await page.locator('#mapContainer path.place').count()).toBeGreaterThan(166);
  await expect(page.locator('#mapContainer .sphere')).toHaveCount(1);
  await expect(page.locator('#statSeen')).toHaveText('0');
  await expect(page.locator('#statUnseen')).toHaveText('195');
});

test('marking a country as visited counts it and colours it on the map', async ({ page }) => {
  await open(page, 'Italy');
  await page.click('#fMarkVisited');
  await expect(page.locator('#panel .panel-badge')).toHaveText('VISITED');
  await closePanel(page);
  await expect(page.locator('#statSeen')).toHaveText('1');
  await expect(page.locator('#statUnseen')).toHaveText('194');
  await expect(page.locator('#statPct')).toHaveText('0.5%');
  await expect(page.locator('.place.state-visited')).toHaveCount(1);
});

test('the details of a visit appear in memories and on the timeline', async ({ page }) => {
  await open(page, 'Italy');
  await page.click('#fMarkVisited');
  await page.fill('#fCityInput', 'Rome');
  await page.click('#fCityAdd');
  await page.fill('#fCityInput', 'Florence');
  await page.press('#fCityInput', 'Enter');
  await expect(page.locator('#panel .chip')).toHaveCount(2);
  await setRange(page.locator('#fRating'), 9);
  await page.fill('#fMemory', 'Gelato at midnight.');
  await page.fill('#fFirstVisited', '2019-05-02');
  await page.locator('#fFirstVisited').dispatchEvent('change');
  await closePanel(page);

  const card = page.locator('.memory-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Italy');
  await expect(card).toContainText('Rome, Florence');
  await expect(card).toContainText('May 2019');
  await expect(card).toContainText('Gelato at midnight.');
  await expect(page.locator('.timeline-year')).toHaveCount(1);
  await expect(page.locator('.timeline-year .yr')).toHaveText('2019');
});

test('the wishlist is counted apart and has its own colour', async ({ page }) => {
  await open(page, 'Japan');
  await page.click('#fAddWishlist');
  await closePanel(page);
  await expect(page.locator('#statWishlist')).toHaveText('1');
  await expect(page.locator('#statSeen')).toHaveText('0');
  await expect(page.locator('.place.state-wishlist')).toHaveCount(1);
});

test('a territory can be marked but does not count as a country', async ({ page }) => {
  await open(page, 'Greenland');
  await expect(page.locator('#panel .panel-note')).toContainText('not counted among the 195 countries');
  await page.click('#fMarkVisited');
  await closePanel(page);
  await expect(page.locator('#statSeen')).toHaveText('0');
  await expect(page.locator('.place.state-visited')).toHaveCount(1);
});

test('a continent filter dims the rest of the world', async ({ page }) => {
  await page.click('.pill[data-c="europe"]');
  await expect(page.locator('.pill[data-c="europe"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#continentReadout')).toContainText('EUROPE');
  expect(await page.locator('.place.dimmed').count()).toBeGreaterThan(100);
  await page.click('.pill[data-c="all"]');
  await expect(page.locator('.place.dimmed')).toHaveCount(0);
});

test('what next: the three closest unseen countries, measured from where you have been', async ({ page }) => {
  await page.click('.next-buttons button[data-mode="closest"]');
  await expect(page.locator('#nextResults')).toContainText('Mark a country as visited first');
  await open(page, 'Italy');
  await page.click('#fMarkVisited');
  await closePanel(page);
  await page.click('.next-buttons button[data-mode="closest"]');
  await expect(page.locator('.next-card')).toHaveCount(3);
  // San Marino and Vatican City are inside Italy: nothing is closer.
  await expect(page.locator('#nextResults')).toContainText('San Marino');
  await expect(page.locator('#nextResults')).toContainText('Vatican City');
});

test('the surprise button suggests a country you have not seen', async ({ page }) => {
  await page.click('#ctaSurprise');
  await expect(page.locator('.surprise-card')).toHaveCount(1);
  await expect(page.locator('.surprise-card .name')).not.toBeEmpty();
});

test('everything is still there after a reload, and reset clears it', async ({ page }) => {
  await open(page, 'Italy');
  await page.click('#fMarkVisited');
  await closePanel(page);
  await open(page, 'Japan');
  await page.click('#fAddWishlist');
  await closePanel(page);
  await page.reload();
  await expect(page.locator('.place.state-visited')).toHaveCount(1);
  await expect(page.locator('.place.state-wishlist')).toHaveCount(1);
  await expect(page.locator('#statSeen')).toHaveText('1');

  await page.click('#resetBtn'); // the confirmation is accepted by the test helper
  await expect(page.locator('#statSeen')).toHaveText('0');
  await expect(page.locator('.place.state-visited')).toHaveCount(0);
});

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });

  test('the map is drawn with no connection after one visit', async ({ page, context }) => {
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); // now controlled by the service worker
    await page.waitForLoadState('networkidle');
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#mapContainer circle.place')).toHaveCount(29);
  });
});
