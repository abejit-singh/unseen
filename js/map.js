/**
 * The map: loading the world shapes, drawing countries and dots with D3,
 * zoom and pan, continent filters and the colour spreading over a country.
 */

import { CONTINENT_VIEWS, NAME_ALIASES, WORLD_ATLAS_URL } from './config.js';
import { $, escapeHtml, prefersReducedMotion } from './utils.js';
import { PLACES, PLACE_BY_KEY } from './places.js';
import { getStatus } from './state.js';
import { activeContinent } from './sections.js';
import { openPanel } from './panel.js';

const MAP_W = 960,
  MAP_H = 500; // SVG coordinate space; CSS scales it to fit

const MICRO_RADIUS = 3.2; // dot radius at 1× zoom, in SVG units

const ENCLAVE_MIN_ZOOM = 3; // zoom level at which dots inside other countries become clickable

export let map = null; // set once the map is built: { svg, layer, zoom, path, projection }

export const geo = {}; // per place key: { centroid:[lon,lat], feature? } for distance maths

/** Finds the SVG element (shape or dot) drawn for a place. */
function placeEl(key) {
  if (!map) return null;
  let found = null;
  map.layer.selectAll('.place').each(function () {
    if (this.__key === key) found = this;
  });
  return found;
}

/** Applies a place's current status to its SVG element as a CSS class. */
function paintPlace(el) {
  if (!el) return;
  const st = getStatus(el.__key);
  el.classList.toggle('state-visited', st === 'visited');
  el.classList.toggle('state-wishlist', st === 'wishlist');
}

/**
 * For MultiPolygon countries (France with French Guiana, the US with Alaska,
 * Norway with Svalbard), returns only the largest polygon. Distances and
 * zooming use this "mainland", so "closest to France" measures from Paris's
 * side of the Atlantic, not from somewhere between Europe and South America.
 * @param {object} feature - GeoJSON feature
 * @returns {object} a GeoJSON feature with a single Polygon
 */
function mainland(feature) {
  const g = feature.geometry;
  if (!g || g.type !== 'MultiPolygon') return feature;
  let best = null,
    bestArea = -1;
  g.coordinates.forEach((poly) => {
    const f = { type: 'Feature', geometry: { type: 'Polygon', coordinates: poly } };
    const a = d3.geoArea(f);
    if (a > bestArea) {
      bestArea = a;
      best = f;
    }
  });
  return best;
}

/** Shows the map's error state with a Retry button (reloads the page). */
function showMapError(msg) {
  $('mapContainer').innerHTML =
    `<div class="map-error">${escapeHtml(msg)}<button class="btn btn-ghost btn-sm" id="mapRetryBtn" type="button" style="margin-top:.9rem;">Retry</button></div>`;
  $('mapRetryBtn').addEventListener('click', () => {
    location.reload();
  });
}

/** Entry point: checks the libraries loaded, then fetches the world shapes. */
export function initMap() {
  if (typeof d3 === 'undefined' || typeof topojson === 'undefined') {
    showMapError('The map library couldn’t load. Check your connection, then retry.');
    return;
  }
  loadWorldData();
}

/** Downloads the world shapes, decodes them and builds the map. */
function loadWorldData() {
  fetch(WORLD_ATLAS_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((topology) => {
      buildMap(topojson.feature(topology, topology.objects.countries));
    })
    .catch(() => {
      showMapError('The world map data couldn’t be loaded. Check your connection, then retry.');
    });
}

/**
 * Builds the SVG map: one path per country shape, one dot per microstate,
 * zoom/pan behaviour, and the shared event handlers.
 * @param {object} fc - GeoJSON FeatureCollection of country shapes
 */
function buildMap(fc) {
  const container = $('mapContainer');
  // Keep only shapes we know; map alternative spellings onto our keys.
  fc.features.forEach((f) => {
    const n = f.properties && f.properties.name;
    f.__key = PLACE_BY_KEY[n] ? n : NAME_ALIASES[n] && PLACE_BY_KEY[NAME_ALIASES[n]] ? NAME_ALIASES[n] : null;
  });
  const shapes = fc.features.filter((f) => f.__key);

  // 1. Projection: Natural Earth, fitted to the map box.
  const projection = d3.geoNaturalEarth1().fitSize([MAP_W - 8, MAP_H - 8], fc);
  const path = d3.geoPath(projection);

  // 2. The SVG takes the place of the loading message.
  const loading = $('mapLoading');
  if (loading) loading.remove();
  const svg = d3
    .select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${MAP_W} ${MAP_H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('role', 'img')
    .attr('aria-label', 'World map. Use the search field above to choose a country with the keyboard.');
  const defs = svg.append('defs').attr('id', 'mapDefs');
  // Ocean shading for the globe: lighter in the middle, darker at the rim (colours from CSS).
  const ocean = defs
    .append('radialGradient')
    .attr('id', 'oceanGrad')
    .attr('cx', '50%')
    .attr('cy', '42%')
    .attr('r', '62%');
  ocean.append('stop').attr('offset', '0').attr('class', 'ocean-stop-a');
  ocean.append('stop').attr('offset', '1').attr('class', 'ocean-stop-b');
  const layer = svg.append('g'); // everything that zooms lives in here

  // The outline of the Earth and a 10° grid of meridians and parallels, under
  // the countries. Neither has class .place: not clickable, not counted.
  layer.append('path').datum({ type: 'Sphere' }).attr('class', 'sphere').attr('d', path);
  layer.append('path').datum(d3.geoGraticule10()).attr('class', 'graticule').attr('d', path);

  // 3. One path per country, coloured by its state.
  layer
    .selectAll('path.place')
    .data(shapes)
    .enter()
    .append('path')
    .attr('class', 'place')
    .attr('d', path)
    .each(function (f) {
      this.__key = f.__key;
      const m = mainland(f);
      geo[f.__key] = { centroid: d3.geoCentroid(m), feature: m };
      paintPlace(this);
    });

  // 4. Countries too small for a shape: a dot at their real location.
  const micro = PLACES.filter((p) => p.lonLat);
  const boxes = shapes.map((f) => path.bounds(f)); // each country's box on the map, for a quick first check
  layer
    .selectAll('circle.place')
    .data(micro)
    .enter()
    .append('circle')
    .attr('class', 'place micro')
    .attr('cx', (p) => projection(p.lonLat)[0])
    .attr('cy', (p) => projection(p.lonLat)[1])
    .attr('r', MICRO_RADIUS)
    .each(function (p) {
      this.__key = p.key;
      geo[p.key] = { centroid: p.lonLat };
      // Enclaves (San Marino, Vatican City, Monaco…) sit on top of a bigger
      // country. At full view their dot would steal taps meant for Italy or
      // France, so they only become clickable once the user zooms in.
      // The exact test (geoContains) is slow, so it only runs for the countries whose box holds the dot.
      const lonLat = p.lonLat;
      const [x, y] = projection(lonLat);
      const inside = shapes.some((f, i) => {
        const [[x0, y0], [x1, y1]] = boxes[i];
        return x >= x0 - 1 && x <= x1 + 1 && y >= y0 - 1 && y <= y1 + 1 && d3.geoContains(f, lonLat);
      });
      if (inside) this.classList.add('enclave', 'locked');
      paintPlace(this);
    });

  // 5. Zoom and pan.
  const zoom = d3
    .zoom()
    .scaleExtent([1, 12])
    .translateExtent([
      [0, 0],
      [MAP_W, MAP_H]
    ])
    .clickDistance(5) // tolerate a little hand jitter: otherwise D3 drops the click
    .filter(zoomFilter)
    .on('zoom', onZoom);
  svg.call(zoom).on('dblclick.zoom', null); // double-click would zoom AND open the panel twice

  // 6. Keep what the rest of the code needs, then add the controls and the pointer handlers.
  map = { svg, layer, zoom, path, projection, k: 1 };

  addMapChrome(container);
  bindMapPointer(svg);
  applyContinentFilter(false);
}

/**
 * Decides which gestures the map handles and which it leaves to the page.
 * The map is a large area in the middle of a long scrolling page, so it
 * must not trap the user:
 *  - mouse wheel zooms only with Ctrl/⌘ held (trackpad pinch sends Ctrl
 *    automatically), so plain scrolling still scrolls the page;
 *  - on touch screens one finger scrolls the page until the user has zoomed
 *    in; pinching (two fingers) always zooms the map.
 * @param {Event} ev
 * @returns {boolean} true if the zoom behaviour should handle the event
 */
function zoomFilter(ev) {
  if (ev.type === 'wheel') return ev.ctrlKey || ev.metaKey;
  if (ev.type === 'touchstart') return ev.touches.length > 1 || map.k > 1;
  return !ev.ctrlKey && !ev.button;
}

/**
 * Called continuously while zooming/panning. Applies the transform, keeps
 * microstate dots the same size on screen, and switches touch-action so a
 * zoomed-in map pans with one finger while a full-view map lets the page scroll.
 * @param {object} ev - d3 zoom event
 */
function onZoom(ev) {
  const t = ev.transform;
  map.k = t.k;
  map.layer.attr('transform', t);
  map.layer.selectAll('circle.place').attr('r', MICRO_RADIUS / Math.sqrt(t.k));
  map.layer.selectAll('circle.enclave').classed('locked', t.k < ENCLAVE_MIN_ZOOM);
  map.svg.style('touch-action', t.k > 1 ? 'none' : 'pan-x pan-y');
}

/** Adds the zoom buttons and the gesture hint on top of the map. */
function addMapChrome(container) {
  const controls = document.createElement('div');
  controls.className = 'map-controls';
  controls.innerHTML =
    '<button type="button" data-z="in" aria-label="Zoom in">+</button>' +
    '<button type="button" data-z="out" aria-label="Zoom out">−</button>' +
    '<button type="button" data-z="reset" aria-label="Show the whole world">⟲</button>';
  controls.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const z = b.dataset.z;
    if (z === 'reset') resetView();
    else
      map.svg
        .transition()
        .duration(350)
        .call(map.zoom.scaleBy, z === 'in' ? 1.8 : 1 / 1.8);
  });
  container.appendChild(controls);

  const hint = document.createElement('div');
  hint.className = 'map-hint';
  const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  hint.textContent = touch ? 'Pinch to zoom · tap a country' : 'Ctrl/⌘ + scroll to zoom · drag to pan';
  container.appendChild(hint);
}

/** Tooltip on hover (mouse only) and click → open the country panel. */
function bindMapPointer(svg) {
  const tooltip = $('mapTooltip');
  svg.on('pointermove', (ev) => {
    const el = ev.target.closest && ev.target.closest('.place');
    if (!el || ev.pointerType !== 'mouse') {
      tooltip.style.opacity = 0;
      return;
    }
    const p = PLACE_BY_KEY[el.__key],
      st = getStatus(el.__key);
    tooltip.textContent = p.label + (st ? ` · ${st.toUpperCase()}` : '');
    tooltip.style.opacity = 1;
    tooltip.style.left = `${ev.clientX}px`;
    tooltip.style.top = `${ev.clientY}px`;
  });
  svg.on('pointerleave', () => {
    tooltip.style.opacity = 0;
  });
  svg.on('click', (ev) => {
    const el = ev.target.closest && ev.target.closest('.place');
    if (el) {
      tooltip.style.opacity = 0;
      openPanel(el.__key);
    }
  });
}

/**
 * Smoothly zooms the map so a box (in SVG units) fills most of the view.
 * @param {number[][]} b - [[x0, y0], [x1, y1]]
 * @param {number} [maxK] - zoom ceiling, so small countries don't fill the screen
 */
function zoomToBox(b, maxK) {
  const dx = b[1][0] - b[0][0],
    dy = b[1][1] - b[0][1];
  const k = Math.max(1, Math.min(maxK || 8, 0.85 / Math.max(dx / MAP_W, dy / MAP_H)));
  const cx = (b[0][0] + b[1][0]) / 2,
    cy = (b[0][1] + b[1][1]) / 2;
  const t = d3.zoomIdentity
    .translate(MAP_W / 2, MAP_H / 2)
    .scale(k)
    .translate(-cx, -cy);
  map.svg
    .transition()
    .duration(prefersReducedMotion() ? 0 : 750)
    .call(map.zoom.transform, t);
}

/** Zooms to one place: the bounds of its mainland, or a close-up around a dot. */
export function zoomToPlace(key) {
  if (!map || !geo[key]) return;
  if (geo[key].feature) zoomToBox(map.path.bounds(geo[key].feature), 6);
  else {
    const xy = map.projection(geo[key].centroid);
    zoomToBox(
      [
        [xy[0] - 25, xy[1] - 15],
        [xy[0] + 25, xy[1] + 15]
      ],
      8
    );
  }
}

/**
 * Zooms to a continent's view window. The box is sampled on a grid rather
 * than just its corners because the Natural Earth projection curves
 * meridians, so the projected corners alone would miss parts of the area.
 */
function zoomToContinent(c) {
  const v = CONTINENT_VIEWS[c],
    xs = [],
    ys = [];
  for (let i = 0; i <= 8; i++)
    for (let j = 0; j <= 8; j++) {
      const pt = map.projection([
        v[0][0] + ((v[1][0] - v[0][0]) * i) / 8,
        v[0][1] + ((v[1][1] - v[0][1]) * j) / 8
      ]);
      if (pt) {
        xs.push(pt[0]);
        ys.push(pt[1]);
      }
    }
  zoomToBox(
    [
      [d3.min(xs), d3.min(ys)],
      [d3.max(xs), d3.max(ys)]
    ],
    5
  );
}

/** Back to the whole-world view (or the active continent, if one is selected). */
export function resetView() {
  if (!map) return;
  if (activeContinent !== 'all') zoomToContinent(activeContinent);
  else
    map.svg
      .transition()
      .duration(prefersReducedMotion() ? 0 : 600)
      .call(map.zoom.transform, d3.zoomIdentity);
}

/**
 * Dims every place outside the selected continent.
 * @param {boolean} [zoom=true] - also move the map to the continent
 */
export function applyContinentFilter(zoom) {
  if (!map) return;
  // :not(.place-overlay) skips the temporary copy drawn by animateFill(),
  // which carries no place key while a colour change is still spreading.
  map.layer.selectAll('.place:not(.place-overlay)').classed('dimmed', function () {
    return activeContinent !== 'all' && PLACE_BY_KEY[this.__key].continent !== activeContinent;
  });
  if (zoom !== false) resetView();
}

/**
 * Makes a few places glow briefly — used by "Explore the unseen", "Surprise
 * me" and What's Next to point at places on the map.
 * @param {string[]} keys
 */
export function pulse(keys) {
  keys.forEach((k) => {
    const el = placeEl(k);
    if (!el) return;
    el.classList.remove('pulse');
    void el.getBBox(); // restart the CSS animation if it was already running
    el.classList.add('pulse');
    setTimeout(() => {
      el.classList.remove('pulse');
    }, 4600);
  });
}

/**
 * The signature animation: when a place changes colour, the new colour
 * spreads outward from its centre like ink, instead of switching instantly.
 *
 * How: a copy of the shape, filled with the new colour, is laid on top and
 * clipped to a circle whose radius grows from 0 to the shape's half-diagonal.
 * When the circle covers everything, the real shape gets its new class and
 * the copy is removed. The real shape's own CSS fill transition is switched
 * off for that one frame — otherwise it would fade from the old colour
 * again after the copy disappears, causing a visible flicker.
 *
 * @param {string} key - the place that just changed status (state already updated)
 */
export function animateFill(key) {
  const el = placeEl(key);
  if (!el) return;
  const st = getStatus(key);
  if (!st || prefersReducedMotion()) {
    paintPlace(el);
    return;
  }

  const bb = el.getBBox();
  const cx = bb.x + bb.width / 2,
    cy = bb.y + bb.height / 2;
  const maxR = Math.sqrt(bb.width * bb.width + bb.height * bb.height) / 2 + 2;
  const NS = 'http://www.w3.org/2000/svg';
  const clipId = `fill-${Math.random().toString(36).slice(2, 9)}`;
  const clip = document.createElementNS(NS, 'clipPath');
  clip.id = clipId;
  const circle = document.createElementNS(NS, 'circle');
  circle.setAttribute('cx', cx);
  circle.setAttribute('cy', cy);
  circle.setAttribute('r', 0);
  clip.appendChild(circle);
  $('mapDefs').appendChild(clip);

  const overlay = el.cloneNode(false);
  overlay.setAttribute('class', `place place-overlay${el.classList.contains('micro') ? ' micro' : ''}`);
  overlay.style.fill = st === 'visited' ? 'var(--visited)' : 'var(--wishlist)';
  overlay.setAttribute('clip-path', `url(#${clipId})`);
  el.parentNode.insertBefore(overlay, el.nextSibling);

  let start = null;
  const duration = 700;
  // One frame of the fill: the circle's radius grows with an ease-out curve.
  function tick(ts) {
    if (start === null) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    circle.setAttribute('r', maxR * (1 - (1 - p) ** 3));
    if (p < 1) {
      requestAnimationFrame(tick);
      return;
    }
    el.style.transition = 'none';
    paintPlace(el);
    void el.getBBox(); // force the new fill to apply before removing the copy
    overlay.remove();
    clip.remove();
    requestAnimationFrame(() => {
      el.style.transition = '';
    });
  }
  requestAnimationFrame(tick);
}
