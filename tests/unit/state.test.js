// What is saved is never trusted when it is read back: every entry goes through sanitizeEntry.
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import {
  getStatus,
  sanitizeEntry,
  state,
  unseenPlaces,
  visitedCountries,
  visitedPlaces,
  wishlistPlaces
} from '../../js/state.js';
import { PLACES } from '../../js/places.js';

beforeEach(() => {
  state.countries = {};
});

test('an entry without a valid status is dropped', () => {
  assert.equal(sanitizeEntry(null), null);
  assert.equal(sanitizeEntry({}), null);
  assert.equal(sanitizeEntry({ status: 'maybe' }), null);
});

test('a wishlist entry keeps no details', () => {
  assert.deepEqual(sanitizeEntry({ status: 'wishlist', rating: 9, memory: 'x' }), { status: 'wishlist' });
});

test('a visited entry keeps only well-formed details', () => {
  const clean = sanitizeEntry({
    status: 'visited',
    firstVisited: '2019-05-02',
    cities: ['  Rome ', '', 42, 'Florence'],
    rating: '9',
    memory: 'Gelato at midnight.',
    trips: 3,
    photo: 'data:image/jpeg;base64,AAAA',
    somethingElse: true
  });
  assert.deepEqual(clean, {
    status: 'visited',
    firstVisited: '2019-05-02',
    cities: ['Rome', 'Florence'],
    rating: 9,
    memory: 'Gelato at midnight.',
    trips: 3,
    photo: 'data:image/jpeg;base64,AAAA'
  });
});

test('out-of-range values and unsafe photos are left out', () => {
  const clean = sanitizeEntry({
    status: 'visited',
    firstVisited: 'yesterday',
    rating: 11,
    trips: 0,
    memory: '   ',
    photo: 'javascript:alert(1)'
  });
  assert.deepEqual(clean, { status: 'visited' });
  assert.equal(sanitizeEntry({ status: 'visited', trips: 5000 }).trips, 999);
  assert.equal(
    sanitizeEntry({ status: 'visited', photo: 'data:image/svg+xml;base64,AAAA' }).photo,
    undefined
  );
});

test('a place has no status until it is marked, and "unseen" means not visited yet', () => {
  assert.equal(getStatus('Italy'), undefined);
  assert.equal(unseenPlaces().length, PLACES.length);
  state.countries = {
    Italy: { status: 'visited' },
    Japan: { status: 'wishlist' },
    Greenland: { status: 'visited' }
  };
  assert.equal(getStatus('Italy'), 'visited');
  assert.deepEqual(
    visitedPlaces()
      .map((p) => p.key)
      .sort(),
    ['Greenland', 'Italy']
  );
  assert.deepEqual(
    visitedCountries().map((p) => p.key),
    ['Italy']
  ); // Greenland is a territory
  assert.deepEqual(
    wishlistPlaces().map((p) => p.key),
    ['Japan']
  );
  assert.equal(unseenPlaces().length, PLACES.length - 2); // the wishlist is still unseen
});
