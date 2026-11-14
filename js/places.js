/**
 * The places: one list of everything that can be marked (countries and
 * territories), built once from the tables in config.js.
 */

import { DISPLAY_NAMES, MAP_PLACES, MICROSTATES, TERRITORIES } from './config.js';
import { escapeHtml, flagEmoji } from './utils.js';

/**
 * @typedef {object} Place
 * @property {string} key        storage key (atlas name, or the name for microstates)
 * @property {string} label      name shown to the user
 * @property {string} continent  continent id
 * @property {string} iso2       ISO code, used for the flag emoji
 * @property {boolean} isCountry true for the 195 countries, false for territories
 * @property {number[]|null} lonLat  fixed coordinates (microstates only)
 */

const TERRITORY_SET = {};

TERRITORIES.forEach((n) => {
  TERRITORY_SET[n] = true;
});

/** @type {Place[]} */
export const PLACES = MAP_PLACES.map((r) => ({
  key: r[0],
  label: DISPLAY_NAMES[r[0]] || r[0],
  continent: r[1],
  iso2: r[2],
  isCountry: !TERRITORY_SET[r[0]],
  lonLat: null
})).concat(
  MICROSTATES.map((r) => ({
    key: r[0],
    label: r[0],
    continent: r[1],
    iso2: r[2],
    isCountry: true,
    lonLat: [r[3], r[4]]
  }))
);

/** @type {Object<string,Place>} lookup by storage key */
export const PLACE_BY_KEY = {};

PLACES.forEach((p) => {
  PLACE_BY_KEY[p.key] = p;
});

/** All 195 countries (the denominator of every "of the world" figure). */
export const COUNTRIES = PLACES.filter((p) => p.isCountry);

export const TOTAL_COUNTRIES = COUNTRIES.length; // 195: 166 shapes + 29 microstates

/** @returns {string} "🇮🇹 Italy" — escaped and ready for HTML */
export function placeTitle(p) {
  return `${flagEmoji(p.iso2)} ${escapeHtml(p.label)}`;
}
