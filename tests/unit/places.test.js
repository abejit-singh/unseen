// The list of places is the denominator of every figure, so its shape is checked here.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { CONTINENT_ORDER, MICROSTATES, NAME_ALIASES, TERRITORIES } from '../../js/config.js';
import { COUNTRIES, PLACE_BY_KEY, PLACES, TOTAL_COUNTRIES, placeTitle } from '../../js/places.js';

test('there are 195 countries: 193 UN members and the two observer states', () => {
  assert.equal(TOTAL_COUNTRIES, 195);
  assert.ok(PLACE_BY_KEY['Vatican City'].isCountry);
  assert.ok(PLACE_BY_KEY['Palestine'].isCountry);
});

test('territories can be marked but are not counted as countries', () => {
  assert.ok(TERRITORIES.length > 0);
  for (const name of TERRITORIES) {
    assert.ok(PLACE_BY_KEY[name], `${name} is not a place`);
    assert.equal(PLACE_BY_KEY[name].isCountry, false);
  }
  assert.equal(PLACES.length, TOTAL_COUNTRIES + TERRITORIES.length);
});

test('no place is listed twice, and each one has a known continent', () => {
  assert.equal(new Set(PLACES.map((p) => p.key)).size, PLACES.length);
  for (const p of PLACES) assert.ok(CONTINENT_ORDER.includes(p.continent), `${p.key}: ${p.continent}`);
});

test('every country has a two-letter code for its flag', () => {
  for (const p of COUNTRIES) assert.match(p.iso2, /^[A-Z]{2}$/, p.key);
  assert.equal(new Set(COUNTRIES.map((p) => p.iso2)).size, COUNTRIES.length);
});

test('the 29 small states are dots with real coordinates', () => {
  assert.equal(MICROSTATES.length, 29);
  for (const [name] of MICROSTATES) {
    const [lon, lat] = PLACE_BY_KEY[name].lonLat;
    assert.ok(lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90, name);
  }
});

test('every place with a shape exists in the map data, under its name or an alias', () => {
  const atlas = JSON.parse(readFileSync(new URL('../../data/countries-110m.json', import.meta.url), 'utf8'));
  const names = atlas.objects.countries.geometries.map((g) => g.properties.name);
  const known = new Set(names.map((n) => (PLACE_BY_KEY[n] ? n : NAME_ALIASES[n])));
  for (const p of PLACES.filter((q) => !q.lonLat))
    assert.ok(known.has(p.key), `${p.key} has no shape in the atlas`);
});

test('a place title is its flag and its name, escaped', () => {
  assert.equal(placeTitle(PLACE_BY_KEY['Italy']), '🇮🇹 Italy');
  assert.equal(placeTitle({ iso2: '', label: 'A <b>' }), '🌍 A &lt;b&gt;');
});
