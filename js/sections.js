/**
 * The sections around the map: headline figures, continent filters, My
 * World, memories, timeline and score. They need no geography, so they
 * work even before the map has loaded.
 */

import { CONTINENT_LABELS, CONTINENT_ORDER } from './config.js';
import { $, escapeHtml, formatMonthYear, plural } from './utils.js';
import { COUNTRIES, TOTAL_COUNTRIES, placeTitle } from './places.js';
import { getStatus, state, visitedCountries, visitedPlaces, wishlistPlaces } from './state.js';
import { animateNumber } from './effects.js';

export let activeContinent = 'all';

/** Sets activeContinent (imported bindings are read-only in other modules). */
export function setActiveContinent(value) {
  activeContinent = value;
}

/** Headline stats under the map, plus the "You've seen / still unseen" block. */
function renderStats() {
  const seen = visitedCountries().length;
  const unseen = TOTAL_COUNTRIES - seen;
  animateNumber($('statSeen'), seen);
  $('statSeenLbl').textContent = `/ ${TOTAL_COUNTRIES} countries seen`;
  animateNumber($('statUnseen'), unseen);
  animateNumber($('statPct'), (seen / TOTAL_COUNTRIES) * 100, (v) => `${v.toFixed(1)}%`);
  animateNumber($('statWishlist'), wishlistPlaces().length);
  $('philSeen').textContent = plural(seen, 'country', 'countries');
  $('philUnseen').textContent = unseen + (unseen === 1 ? ' is still unseen.' : ' are still unseen.');
}

/** Builds the continent filter pills once; their click handler is in bindContinentPills. */
export function renderContinentPills() {
  let html = '<button class="pill" type="button" data-c="all" aria-pressed="true">ALL</button>';
  CONTINENT_ORDER.forEach((c) => {
    html += `<button class="pill" type="button" data-c="${c}" aria-pressed="false">${CONTINENT_LABELS[c].toUpperCase()}</button>`;
  });
  $('continentPills').innerHTML = html;
}

/** The "EUROPE — 18 / 45 · 40.0% explored" line shown while a continent is selected. */
export function renderContinentReadout() {
  const el = $('continentReadout');
  if (activeContinent === 'all') {
    el.textContent = '';
    return;
  }
  const label = CONTINENT_LABELS[activeContinent].toUpperCase();
  const countries = COUNTRIES.filter((p) => p.continent === activeContinent);
  if (countries.length === 0) {
    // Antarctica has no countries, only territories — report those instead.
    const any = visitedPlaces().some((p) => p.continent === activeContinent);
    el.innerHTML = `<strong>${label}</strong> — ${any ? 'you’ve been here.' : 'not yet explored.'}`;
    return;
  }
  const seen = countries.filter((p) => getStatus(p.key) === 'visited').length;
  el.innerHTML = `<strong>${label}</strong> — ${seen} / ${countries.length} countries · ${((seen / countries.length) * 100).toFixed(1)}% explored`;
}

/** "My world" totals and the per-continent progress bars. */
export function renderMyWorld() {
  // 1. Totals from the places you have been: countries, continents, cities, best rating.
  const visited = visitedPlaces();
  const countries = visitedCountries();
  const territories = visited.length - countries.length;
  const continents = new Set();
  let cities = 0;
  let best = null;
  visited.forEach((p) => {
    const c = state.countries[p.key];
    continents.add(p.continent);
    cities += (c.cities || []).length;
    if (c.rating && (!best || c.rating > best.rating)) best = { place: p, rating: c.rating };
  });

  /** One stat tile: big number, label, optional small line underneath. */
  function cell(num, label, sub) {
    return (
      `<div class="stat">` +
      `<div class="num">${num}</div>` +
      `<div class="lbl">${label}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`
    );
  }
  // 2. The grid of totals.
  $('myWorldGrid').innerHTML =
    `${
      cell(
        countries.length,
        'Countries visited',
        territories ? `+ ${plural(territories, 'territory', 'territories')}` : ''
      ) +
      cell(continents.size, 'Continents visited') +
      cell(cities, 'Cities visited') +
      cell(wishlistPlaces().length, 'Wishlist')
    }` +
    `<div class="stat">` +
    `<div class="num small">${best ? `${placeTitle(best.place)} — ${best.rating}/10` : '—'}</div>` +
    `<div class="lbl">Best rated</div></div>`;

  // 3. One progress bar per continent.
  const rows = CONTINENT_ORDER.map((c) => {
    const all = COUNTRIES.filter((p) => p.continent === c);
    const seen = all.filter((p) => getStatus(p.key) === 'visited').length;
    let pct, frac;
    if (all.length) {
      pct = (seen / all.length) * 100;
      frac = `${seen} / ${all.length}`;
    } else {
      // continent of territories only (Antarctica)
      const been = visited.some((p) => p.continent === c);
      pct = been ? 100 : 0;
      frac = been ? 'Visited' : '—';
    }
    return (
      `<div class="continent-row">` +
      `<span class="name">${CONTINENT_LABELS[c]}</span>` +
      `<div class="continent-bar" role="progressbar" aria-label="${CONTINENT_LABELS[c]}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}">` +
      `<div class="continent-bar-fill" data-w="${pct.toFixed(2)}"></div></div>` +
      `<span class="frac">${frac}</span></div>`
    );
  });
  // 4. Redraw the bars at their old widths, then grow them to the new ones on the next frame.
  const list = $('continentList');
  const oldWidths = [...list.querySelectorAll('.continent-bar-fill')].map((f) => f.style.width);
  list.innerHTML = rows.join('');
  const fills = list.querySelectorAll('.continent-bar-fill');
  fills.forEach((f, i) => {
    f.style.width = oldWidths[i] || '0%';
  });
  requestAnimationFrame(() => {
    fills.forEach((f) => {
      f.style.width = `${f.dataset.w}%`;
    });
  });
}

/** Memory cards for visited places that have a memory, rating or photo — newest first. */
export function renderMemories() {
  const grid = $('memoryGrid');
  // 1. Visited places with a note, a rating or a photo, most recent first.
  const items = visitedPlaces()
    .filter((p) => {
      const c = state.countries[p.key];
      return c.memory || c.rating || c.photo;
    })
    .sort((a, b) =>
      (state.countries[b.key].firstVisited || '').localeCompare(state.countries[a.key].firstVisited || '')
    );
  // 2. None yet: a placeholder.
  if (items.length === 0) {
    grid.innerHTML =
      '<p class="empty-state">No memories yet. Mark a country as visited and add a note to see it here.</p>';
    return;
  }
  // 3. One card each: photo, name, cities and date, stars, note.
  grid.innerHTML = items
    .map((p) => {
      const c = state.countries[p.key];
      const full = c.rating ? Math.round(c.rating / 2) : 0; // 1–10 rating shown as 0–5 stars
      const meta = [
        (c.cities || []).join(', '),
        c.firstVisited ? formatMonthYear(c.firstVisited) : '',
        c.trips > 1 ? `${c.trips} trips` : ''
      ]
        .filter(Boolean)
        .join(' · ');
      return (
        `<article class="memory-card">` +
        (c.photo
          ? `<img src="${escapeHtml(c.photo)}" alt="Photo from ${escapeHtml(p.label)}" loading="lazy">`
          : '') +
        `<h3>${placeTitle(p)}</h3>` +
        (meta ? `<div class="memory-meta">${escapeHtml(meta)}</div>` : '') +
        (c.rating
          ? `<div class="memory-stars" aria-label="Rated ${c.rating} out of 10">${'★'.repeat(full)}${'☆'.repeat(5 - full)} <span style="font-family:var(--font-mono);font-size:.75rem">${c.rating}/10</span></div>`
          : '') +
        (c.memory ? `<p class="memory-quote">“${escapeHtml(c.memory)}”</p>` : '') +
        `</article>`
      );
    })
    .join('');
}

/** Year-by-year timeline built from "first visited" dates, oldest first. */
export function renderTimeline() {
  const list = $('timelineList');
  const dated = visitedPlaces()
    .filter((p) => state.countries[p.key].firstVisited)
    .sort((a, b) => state.countries[a.key].firstVisited.localeCompare(state.countries[b.key].firstVisited));
  if (dated.length === 0) {
    list.innerHTML =
      '<p class="empty-state">Add a “first visited” date to a country to see your timeline take shape.</p>';
    return;
  }
  const years = [],
    byYear = {};
  dated.forEach((p) => {
    const y = state.countries[p.key].firstVisited.slice(0, 4);
    if (!byYear[y]) {
      byYear[y] = [];
      years.push(y);
    }
    byYear[y].push(p);
  });
  list.innerHTML = years
    .map(
      (y) =>
        `<div class="timeline-year">` +
        `<div class="yr">${y}</div>` +
        `<div class="timeline-chips">` +
        byYear[y].map((p) => `<span class="timeline-chip">${placeTitle(p)}</span>`).join('') +
        `</div></div>`
    )
    .join('');
}

/** World Score: countries (main number), continents, and "experiences". */
export function renderScore() {
  const visited = visitedPlaces();
  const countriesPct = (visitedCountries().length / TOTAL_COUNTRIES) * 100;
  const continents = {};
  visited.forEach((p) => {
    continents[p.continent] = true;
  });
  const continentsPct = (Object.keys(continents).length / CONTINENT_ORDER.length) * 100;
  const documented = visited.filter((p) => {
    const c = state.countries[p.key];
    return c.memory || c.rating;
  }).length;
  const experiencesPct = visited.length ? (documented / visited.length) * 100 : 0;
  const pct1 = (v) => `${v.toFixed(1)}%`,
    pct0 = (v) => `${v.toFixed(0)}%`;
  animateNumber($('worldScoreNum'), countriesPct, pct1);
  animateNumber($('scoreCountries'), countriesPct, pct0);
  animateNumber($('scoreContinents'), continentsPct, pct0);
  animateNumber($('scoreExperiences'), experiencesPct, pct0);
}

/** Re-renders every section that depends on saved data. Called after any change. */
export function renderAll() {
  renderStats();
  renderContinentReadout();
  renderMyWorld();
  renderMemories();
  renderTimeline();
  renderScore();
}
