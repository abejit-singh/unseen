/**
 * Small helpers used everywhere: text, dates, flags, distances, element
 * lookup. None of them reads or changes the app's data.
 */

/** Shorthand for document.getElementById. */
export function $(id) {
  return document.getElementById(id);
}

/**
 * Escapes text for safe insertion into HTML — both element content and
 * attribute values (quotes are escaped too). Every piece of user-provided
 * text passes through here before it touches innerHTML, which is what stops
 * a city named `<img onerror=…>` from ever running as code.
 * @param {*} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Turns an ISO 3166 alpha-2 code into a flag emoji. Flags are pairs of
 * "regional indicator" characters: 'A' maps to U+1F1E6, and so on, so the
 * offset 127397 (0x1F1E6 − 65) converts each letter. Places without a code
 * get a globe. (Windows shows the two letters instead of a flag — a platform
 * limitation, not an error.)
 * @param {string} iso2
 * @returns {string}
 */
export function flagEmoji(iso2) {
  if (!iso2 || iso2.length !== 2) return '🌍';
  return String.fromCodePoint(127397 + iso2.charCodeAt(0), 127397 + iso2.charCodeAt(1));
}

/** English plural helper: plural(1,'country','countries') → "1 country". */
export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Formats a stored 'YYYY-MM-DD' date as "May 2018". The parts are read
 * directly instead of via `new Date(string)`, which parses date-only strings
 * as UTC and can show the previous month in time zones west of Greenwich.
 * @param {string} iso
 * @returns {string}
 */
export function formatMonthYear(iso) {
  const parts = iso.split('-');
  const d = new Date(+parts[0], +parts[1] - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Today's date as 'YYYY-MM-DD' in the user's own time zone (the latest valid visit date). */
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** True when the user has asked their OS for reduced motion. */
export function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Picks `n` random items from an array without repeats. */
export function sample(arr, n) {
  const pool = arr.slice(),
    out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

/**
 * Great-circle distance between two points on Earth (haversine formula).
 * @param {number[]} a - [lon, lat] in degrees
 * @param {number[]} b - [lon, lat] in degrees
 * @returns {number} kilometres
 */
export function distanceKm(a, b) {
  const R = 6371,
    rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad,
    dLon = (b[0] - a[0]) * rad;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
