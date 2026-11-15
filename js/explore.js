/**
 * Search, continent pills, the surprise card, What's Next and reset.
 */

import { CONTINENT_LABELS, QUIPS_UNSEEN, STORAGE_KEY } from './config.js';
import { $, distanceKm, escapeHtml, flagEmoji, prefersReducedMotion, sample } from './utils.js';
import { PLACES } from './places.js';
import { getStatus, unseenPlaces, visitedPlaces, wishlistPlaces } from './state.js';
import { showToast } from './effects.js';
import { activeContinent, renderContinentReadout, setActiveContinent } from './sections.js';
import { applyContinentFilter, geo, map, pulse, resetView, zoomToPlace } from './map.js';
import { openPanel, setStatus } from './panel.js';

/** Continent pill clicks: update the filter, the readout and the map view. */
export function bindContinentPills() {
  $('continentPills').addEventListener('click', function (e) {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    setActiveContinent(btn.dataset.c);
    this.querySelectorAll('.pill').forEach((p) => {
      p.setAttribute('aria-pressed', String(p === btn));
    });
    applyContinentFilter();
    renderContinentReadout();
  });
}

/**
 * The search box: a native <datalist> offers every place by name. Picking
 * one zooms the map to it and opens its panel. This is also how keyboard
 * and screen-reader users reach countries, since SVG shapes aren't focusable.
 */
export function bindSearch() {
  const sorted = PLACES.slice().sort((a, b) => a.label.localeCompare(b.label));
  $('placeList').innerHTML = sorted.map((p) => `<option value="${escapeHtml(p.label)}">`).join('');
  const input = $('placeSearch');
  /** Resolves the typed text to a place: exact name first, then the first name starting with it. */
  function go() {
    const q = input.value.trim().toLowerCase();
    if (!q) return;
    const hit =
      sorted.filter((p) => p.label.toLowerCase() === q)[0] ||
      sorted.filter((p) => p.label.toLowerCase().indexOf(q) === 0)[0];
    if (!hit) {
      showToast('NOT FOUND', `No country matches “${input.value.trim()}”.`);
      return;
    }
    input.value = '';
    input.blur();
    focusPlace(hit.key, true);
  }
  input.addEventListener('change', go);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      go();
    }
  });
}

/**
 * Brings a place into view: scrolls to the map, zooms to the place, makes it
 * glow, and optionally opens its panel once the zoom has finished.
 * @param {string} key
 * @param {boolean} [withPanel]
 */
function focusPlace(key, withPanel) {
  $('mapContainer').scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'center'
  });
  setTimeout(() => {
    zoomToPlace(key);
    pulse([key]);
    if (withPanel)
      setTimeout(() => {
        openPanel(key);
      }, 650);
  }, 350);
}

/** "Explore the unseen" buttons: back to the full view and highlight six unseen places. */
export function bindExplore() {
  ['ctaExplore', 'ctaExplore2'].forEach((id) => {
    $(id).addEventListener('click', () => {
      $('mapContainer').scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center'
      });
      const pool = unseenPlaces().filter((p) => activeContinent === 'all' || p.continent === activeContinent);
      setTimeout(() => {
        resetView();
        pulse(sample(pool, 6).map((p) => p.key));
      }, 350);
    });
  });
}

/** "Surprise me": a random unseen place in a card, with wishlist and explore actions. */
export function bindSurprise() {
  const wrap = $('surpriseCard');
  $('ctaSurprise').addEventListener('click', () => {
    const pool = unseenPlaces().filter((p) => p.isCountry);
    if (pool.length === 0) {
      wrap.innerHTML =
        '<p class="empty-state">You’ve been to every country. There’s nothing left unseen — remarkable.</p>';
      return;
    }
    const p = sample(pool, 1)[0];
    const onList = getStatus(p.key) === 'wishlist';
    wrap.innerHTML =
      `<div class="surprise-card">` +
      `<div class="flag">${flagEmoji(p.iso2)}</div>` +
      `<h3 class="name">${escapeHtml(p.label)}</h3>` +
      `<div class="tag">${onList ? 'ON YOUR WISHLIST' : 'UNSEEN'} · ${CONTINENT_LABELS[p.continent].toUpperCase()}</div>` +
      `<p class="quip">${escapeHtml(sample(QUIPS_UNSEEN, 1)[0])}</p>` +
      `<div class="surprise-actions">` +
      `<button class="btn btn-gold btn-sm" id="surpriseWishlist" type="button"${onList ? ' disabled' : ''}>${onList ? 'On your wishlist' : 'Add to wishlist'}</button>` +
      `<button class="btn btn-primary btn-sm" id="surpriseExplore" type="button">Explore</button></div></div>`;
    $('surpriseWishlist').addEventListener('click', function () {
      setStatus(p.key, 'wishlist');
      this.disabled = true;
      this.textContent = 'On your wishlist';
    });
    $('surpriseExplore').addEventListener('click', () => {
      focusPlace(p.key, false);
    });
  });
}

/**
 * For a candidate place, finds the nearest place the user has already
 * visited. Measuring to the NEAREST visited place (not to an average of
 * all of them) is what makes "closest" meaningful for someone who has been
 * to both Italy and Japan: the average of those two is in the middle of Asia.
 * @param {Place} p
 * @param {Place[]} visited - visited places that have coordinates
 * @returns {{place:Place, km:number}}
 */
function nearestVisited(p, visited) {
  let best = null;
  visited.forEach((v) => {
    const km = distanceKm(geo[p.key].centroid, geo[v.key].centroid);
    if (!best || km < best.km) best = { place: v, km };
  });
  return best;
}

/**
 * Builds the list of suggestions for a What's Next mode.
 *  - closest:   the three unseen countries nearest to anywhere you've been;
 *  - different: one country from each continent you haven't touched (or the
 *               farthest away, once every continent has been visited) —
 *               the three most distant of those;
 *  - wishlist:  your wishlist; random: one random unseen country.
 * @param {string} mode
 * @returns {{items?:object[], empty?:string}}
 */
function suggestions(mode) {
  // 1. Wishlist and random need no geography.
  if (mode === 'wishlist') {
    const w = wishlistPlaces();
    return w.length
      ? {
          items: w.map((p) => ({
            place: p
          }))
        }
      : { empty: 'Your wishlist is empty. Click any country on the map to add it.' };
  }
  const unseen = unseenPlaces().filter((p) => p.isCountry);
  if (mode === 'random') {
    return unseen.length
      ? { items: [{ place: sample(unseen, 1)[0] }] }
      : { empty: 'You’ve been everywhere.' };
  }
  // 2. The other modes measure distances: they need the map and at least one visited country.
  if (!map) return { empty: 'The map is still loading — try again in a moment.' };
  const visited = visitedPlaces().filter((p) => geo[p.key]);
  if (visited.length === 0)
    return { empty: 'Mark a country as visited first, so there’s somewhere to measure from.' };
  // 3. For every unseen country, the distance to the nearest place you have been.
  const scored = unseen
    .filter((p) => geo[p.key])
    .map((p) => {
      const n = nearestVisited(p, visited);
      return { place: p, km: n.km, from: n.place };
    });
  // 4. Closest: the three nearest.
  if (mode === 'closest') {
    return { items: scored.sort((a, b) => a.km - b.km).slice(0, 3) };
  }
  // 5. Farthest: one per continent you have not been to yet if possible, otherwise just the farthest.
  const touched = new Set(visited.map((p) => p.continent));
  const fresh = scored.filter((s) => !touched.has(s.place.continent));
  const farthest = (list) => list.sort((a, b) => b.km - a.km);
  if (fresh.length) {
    const perContinent = {};
    farthest(fresh).forEach((s) => {
      if (!perContinent[s.place.continent]) perContinent[s.place.continent] = s;
    });
    return { items: farthest(Object.values(perContinent)).slice(0, 3) };
  }
  return { items: farthest(scored).slice(0, 3) };
}

/** What's Next: mode buttons and clickable result cards. */
export function bindNext() {
  const wrap = $('nextResults');
  const buttons = document.querySelectorAll('.next-buttons button');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      const res = suggestions(btn.dataset.mode);
      if (res.empty) {
        wrap.innerHTML = `<p class="empty-state">${escapeHtml(res.empty)}</p>`;
        return;
      }
      wrap.innerHTML = res.items
        .map((it) => {
          const p = it.place;
          const detail =
            it.km != null
              ? `${Math.round(it.km).toLocaleString('en-US')} km from ${escapeHtml(it.from.label)}`
              : CONTINENT_LABELS[p.continent];
          return (
            `<button class="next-card" type="button" data-key="${escapeHtml(p.key)}">` +
            `<div class="flag">${flagEmoji(p.iso2)}</div>` +
            `<div class="name">${escapeHtml(p.label)}</div>` +
            `<div class="dist">${detail}</div></button>`
          );
        })
        .join('');
    });
  });
  wrap.addEventListener('click', (e) => {
    const card = e.target.closest('.next-card');
    if (card) focusPlace(card.dataset.key, true);
  });
}

/** Reset button: erases everything after confirmation. */
export function bindReset() {
  $('resetBtn').addEventListener('click', () => {
    if (!confirm('Erase all your UNSEEN data? This can’t be undone.')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable: nothing to erase */
    }
    location.reload();
  });
}
