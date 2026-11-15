// The small helpers every other module relies on.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distanceKm, escapeHtml, flagEmoji, formatMonthYear, plural, sample } from '../../js/utils.js';

test('distanceKm measures along the globe, from [longitude, latitude] pairs', () => {
  const rome = [12.5, 41.9];
  const tokyo = [139.7, 35.7];
  assert.equal(distanceKm(rome, rome), 0);
  assert.ok(Math.abs(distanceKm(rome, tokyo) - 9850) < 60, `Rome–Tokyo was ${distanceKm(rome, tokyo)}`);
  // A quarter of the equator.
  assert.ok(Math.abs(distanceKm([0, 0], [90, 0]) - 10007.5) < 1);
  assert.equal(distanceKm(rome, tokyo), distanceKm(tokyo, rome));
});

test('flagEmoji builds a flag from a country code, or falls back to a globe', () => {
  assert.equal(flagEmoji('IT'), '🇮🇹');
  assert.equal(flagEmoji('JP'), '🇯🇵');
  assert.equal(flagEmoji(''), '🌍');
  assert.equal(flagEmoji(undefined), '🌍');
});

test('formatMonthYear writes a saved date as month and year', () => {
  assert.equal(formatMonthYear('2019-05-02'), 'May 2019');
  assert.equal(formatMonthYear('2024-12-31'), 'December 2024');
});

test('plural picks the right word', () => {
  assert.equal(plural(1, 'trip', 'trips'), '1 trip');
  assert.equal(plural(2, 'trip', 'trips'), '2 trips');
});

test('sample picks different items, at most as many as there are', () => {
  const picked = sample(['a', 'b', 'c', 'd'], 3);
  assert.equal(picked.length, 3);
  assert.equal(new Set(picked).size, 3);
  assert.equal(sample(['a'], 5).length, 1);
});

test('escapeHtml neutralises markup, quotes included', () => {
  assert.equal(
    escapeHtml('<img src="x" onerror=\'y\'>'),
    '&lt;img src=&quot;x&quot; onerror=&#39;y&#39;&gt;'
  );
});
