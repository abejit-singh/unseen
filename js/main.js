/**
 * UNSEEN — an interactive map of everywhere you've been, and everywhere you haven't.
 *
 * Entry point. The code is split into ES modules that the browser loads as
 * they are: no build step, no framework, no backend. D3 draws the map and
 * topojson-client decodes the world-atlas file into shapes; both, and the
 * data, are kept with the site (js/vendor, data).
 *
 *   config.js    data tables: continents, countries, territories, limits
 *   utils.js     small helpers: text, dates, flags, distances
 *   places.js    the list of everything that can be marked
 *   state.js     the saved data: load, check, save, and questions about it
 *   effects.js   motion and light: counters, toast, reveal, pointer
 *   sections.js  the sections around the map (figures, memories, timeline…)
 *   map.js       the map itself: shapes, dots, zoom, filters
 *   panel.js     the country panel
 *   explore.js   search, continent pills, surprise, What's Next, reset
 *   main.js      this file: start-up
 *
 * How it fits together
 * - All user data lives in one `state` object, saved to localStorage after
 *   every change. Render functions only ever READ from `state` and rebuild
 *   their part of the page; nothing keeps a second copy of the data, so the
 *   screen and the saved data can never drift apart.
 * - "Places" are everything the user can mark: the 195 countries (193 UN
 *   members plus the two observer states, Vatican City and Palestine) and a
 *   handful of territories that appear on the map (Greenland, Puerto Rico,
 *   Antarctica…). Territories can be marked like any country but are not
 *   counted in the 195, so the headline number means what it says.
 * - At this map's scale (1:110m) 29 small countries — Malta, Singapore,
 *   San Marino, Vatican City and others — are too small to have a shape.
 *   They are drawn as dots at their real coordinates so every country can
 *   still be clicked on the map.
 */

import { $ } from './utils.js';
import { setupPointerEffects, setupReveal } from './effects.js';
import { renderAll, renderContinentPills } from './sections.js';
import { initMap } from './map.js';
import { bindPanel, closePanel } from './panel.js';
import { bindContinentPills, bindExplore, bindNext, bindReset, bindSearch, bindSurprise } from './explore.js';

/**
 * Runs one start-up step, isolating failures: if one feature throws (say,
 * the map library didn't load), the error is logged and every other part of
 * the app still starts.
 */
function safeCall(fn, label) {
  try {
    fn();
  } catch (e) {
    console.error(`UNSEEN: start-up step "${label}" failed.`, e);
  }
}

/**
 * Start-up: load saved data, draw every section from it straight away, then
 * start the map download and wire up the controls. The page is usable (and
 * shows the user's numbers) even before the map arrives.
 */
function init() {
  safeCall(renderContinentPills, 'pills');
  safeCall(renderAll, 'render');
  safeCall(initMap, 'map');
  safeCall(bindContinentPills, 'continent filter');
  safeCall(bindSearch, 'search');
  safeCall(bindPanel, 'panel');
  safeCall(bindExplore, 'explore');
  safeCall(bindSurprise, 'surprise');
  safeCall(bindNext, "what's next");
  safeCall(bindReset, 'reset');
  safeCall(setupReveal, 'reveal');
  safeCall(setupPointerEffects, 'pointer effects');
  safeCall(() => {
    $('panelScrim').addEventListener('click', closePanel);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePanel();
    });
  }, 'panel close');
}

// A module script runs once the document has been parsed, so the page is ready.
init();

// Service worker: makes the app installable and lets it open offline once visited.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      /* offline mode unavailable; the app still works online */
    });
  });
}
