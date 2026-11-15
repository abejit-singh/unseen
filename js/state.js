/**
 * The app's data: loaded from localStorage and checked entry by entry, saved
 * after every change, and the questions asked of it (visited, wishlist…).
 */

import { LIMITS, NAME_ALIASES, STORAGE_KEY } from './config.js';
import { COUNTRIES, PLACES, PLACE_BY_KEY } from './places.js';

/**
 * Shape of the saved state:
 *   { countries: { [placeKey]: { status:'visited'|'wishlist', firstVisited?:'YYYY-MM-DD',
 *                                cities?:string[], rating?:1-10, memory?:string,
 *                                trips?:number, photo?:dataURL } } }
 * A place with no entry is "unseen". The key is still called `countries`
 * (although territories are stored there too) so data saved by earlier
 * versions of the app loads unchanged.
 */
export const state = loadState();

/**
 * Cleans one saved entry: keeps only known fields with valid values and
 * drops everything else. Run on every load, so hand-edited, corrupted or
 * outdated localStorage data can never crash the app or inject markup
 * (photos, for instance, must be real image data URLs).
 * @param {object} raw - one entry as read from storage
 * @returns {object|null} a clean entry, or null if it should be discarded
 */
export function sanitizeEntry(raw) {
  if (!raw || (raw.status !== 'visited' && raw.status !== 'wishlist')) return null;
  const out = { status: raw.status };
  if (raw.status !== 'visited') return out; // wishlist entries carry no details
  if (typeof raw.firstVisited === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.firstVisited))
    out.firstVisited = raw.firstVisited;
  if (Array.isArray(raw.cities)) {
    out.cities = raw.cities
      .filter((c) => typeof c === 'string' && c.trim())
      .map((c) => c.trim().slice(0, LIMITS.cityLength))
      .slice(0, LIMITS.cities);
  }
  const rating = parseInt(raw.rating, 10);
  if (rating >= 1 && rating <= 10) out.rating = rating;
  if (typeof raw.memory === 'string' && raw.memory.trim()) out.memory = raw.memory.slice(0, LIMITS.memory);
  const trips = parseInt(raw.trips, 10);
  if (trips >= 1) out.trips = Math.min(trips, LIMITS.trips);
  if (typeof raw.photo === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(raw.photo))
    out.photo = raw.photo;
  return out;
}

/**
 * Reads the saved state, sanitizing every entry and mapping old/alternative
 * place names onto current keys. If storage is unavailable (private mode in
 * some browsers) or the JSON is unreadable, the app simply starts empty.
 * @returns {{countries:Object<string,object>}}
 */
function loadState() {
  const fresh = { countries: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw);
    const saved = parsed && typeof parsed.countries === 'object' ? parsed.countries : {};
    Object.keys(saved).forEach((name) => {
      const key = NAME_ALIASES[name] || name;
      const clean = PLACE_BY_KEY[key] && sanitizeEntry(saved[name]);
      if (clean) fresh.countries[key] = clean;
    });
  } catch {
    /* unreadable data: start fresh rather than crash */
  }
  return fresh;
}

/**
 * Writes the state to localStorage.
 * @returns {boolean} false if the write failed — almost always because the
 *   browser's storage quota (≈5 MB) is full of photos. Callers that add
 *   large data check this and undo the change, so the screen never shows
 *   something that wasn't actually saved.
 */
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the entry for a place, creating an empty one if needed.
 * @param {string} key
 * @returns {object}
 */
export function ensureEntry(key) {
  if (!state.countries[key]) state.countries[key] = {};
  return state.countries[key];
}

/** @returns {string|undefined} 'visited', 'wishlist', or undefined for unseen */
export function getStatus(key) {
  const c = state.countries[key];
  return c ? c.status : undefined;
}

/** @returns {Place[]} every visited place, countries and territories alike */
export function visitedPlaces() {
  return PLACES.filter((p) => getStatus(p.key) === 'visited');
}

/** @returns {Place[]} visited countries only (what the headline numbers count) */
export function visitedCountries() {
  return COUNTRIES.filter((p) => getStatus(p.key) === 'visited');
}

/** @returns {Place[]} every place on the wishlist */
export function wishlistPlaces() {
  return PLACES.filter((p) => getStatus(p.key) === 'wishlist');
}

/** @returns {Place[]} every place not yet visited (wishlist included — it's still unseen) */
export function unseenPlaces() {
  return PLACES.filter((p) => getStatus(p.key) !== 'visited');
}
