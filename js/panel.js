/**
 * The country panel: state, first visit, cities, rating, memory, photo.
 */

import { CONTINENT_LABELS, LIMITS } from './config.js';
import { $, escapeHtml, plural, todayIso } from './utils.js';
import { PLACE_BY_KEY, placeTitle } from './places.js';
import { ensureEntry, getStatus, sanitizeEntry, saveState, state, wishlistPlaces } from './state.js';
import { showToast } from './effects.js';
import { renderAll, renderMemories, renderMyWorld, renderScore, renderTimeline } from './sections.js';
import { animateFill } from './map.js';

let panelKey = null; // place currently shown in the panel

let panelReturnFocus = null; // element to give focus back to when the panel closes

let memorySaveTimer = null;

/**
 * Renders the panel for a place and opens it.
 * @param {string} key
 * @param {object} [opts]
 * @param {string} [opts.focus] - id of the element to focus after rendering
 */
export function openPanel(key, opts) {
  const p = PLACE_BY_KEY[key];
  if (!p) return;
  opts = opts || {};
  // 1. Remember where focus was, so closing the panel can give it back.
  if (!$('panel').classList.contains('open')) panelReturnFocus = document.activeElement;
  panelKey = key;
  const c = state.countries[key] || {};
  const status = c.status;

  // 2. Header: close button, state, name, continent (and a note for territories).
  let html =
    `<div class="panel-inner">` +
    `<button class="panel-close" id="panelClose" type="button" aria-label="Close">×</button>` +
    `<div class="panel-badge ${status || 'unseen'}">${status ? status.toUpperCase() : 'UNSEEN'}</div>` +
    `<h2 class="panel-name" id="panelTitle">${placeTitle(p)}</h2>` +
    `<div class="panel-continent">${CONTINENT_LABELS[p.continent]}${p.isCountry ? '' : ' · Territory'}</div>` +
    (p.isCountry
      ? ''
      : '<p class="panel-note">Tracked on your map, but not counted among the 195 countries.</p>');

  // 3. The body depends on the state: details if visited, a short note for the wishlist, two buttons otherwise.
  if (status === 'visited') {
    const cities = c.cities || [];
    html +=
      `<div class="field">` +
      `<label for="fFirstVisited">First visited</label>` +
      `<input type="date" id="fFirstVisited" max="${todayIso()}" value="${escapeHtml(c.firstVisited || '')}"></div>` +
      `<div class="field">` +
      `<span class="label" id="citiesLbl">Cities</span>` +
      `<div class="city-chips" id="cityChips">` +
      cities
        .map(
          (city, i) =>
            `<span class="chip">${escapeHtml(city)}<button type="button" data-i="${i}" aria-label="Remove ${escapeHtml(city)}">×</button></span>`
        )
        .join('') +
      `</div>` +
      `<div class="city-add">` +
      `<input type="text" id="fCityInput" placeholder="Add a city" maxlength="${LIMITS.cityLength}" aria-labelledby="citiesLbl" enterkeyhint="done">` +
      `<button class="btn btn-ghost btn-sm" id="fCityAdd" type="button">Add</button></div></div>` +
      `<div class="field">` +
      `<label for="fRating">Rating</label>` +
      `<div class="rating-row">` +
      `<input type="range" id="fRating" min="1" max="10" step="1" value="${c.rating || 5}">` +
      `<span class="rating-val${c.rating ? '' : ' unset'}" id="fRatingVal">${c.rating ? `${c.rating} / 10` : 'Not rated'}</span></div></div>` +
      `<div class="field">` +
      `<label for="fMemory">Memory</label>` +
      `<textarea id="fMemory" maxlength="${LIMITS.memory}" placeholder="A moment worth keeping…">${escapeHtml(c.memory || '')}</textarea></div>` +
      `<div class="field">` +
      `<label for="fTrips">Number of trips</label>` +
      `<input type="number" id="fTrips" min="1" max="${LIMITS.trips}" inputmode="numeric" value="${c.trips || 1}"></div>` +
      `<div class="field">` +
      `<span class="label">Photo (optional)</span>` +
      (c.photo
        ? `<img class="photo-preview" src="${escapeHtml(c.photo)}" alt="Your photo from ${escapeHtml(p.label)}">` +
          `<button class="link-btn" id="fPhotoRemove" type="button">Remove photo</button>`
        : '<label class="btn btn-ghost btn-sm file-btn">Add a photo<input type="file" id="fPhoto" accept="image/*"></label>') +
      `</div>` +
      `<div class="panel-footer-actions">` +
      `<button class="link-btn" id="fMarkUnseen" type="button">Mark as unseen again</button></div>`;
  } else if (status === 'wishlist') {
    html +=
      `<p class="panel-msg">${escapeHtml(p.label)} is on your wishlist.</p>` +
      `<div class="panel-actions">` +
      `<button class="btn btn-primary" id="fMarkVisited" type="button">✓ I’ve been here</button>` +
      `<button class="btn btn-ghost" id="fRemoveWishlist" type="button">Remove from wishlist</button></div>`;
  } else {
    html +=
      '<p class="panel-msg">You haven’t been here yet.</p>' +
      '<div class="panel-actions"><button class="btn btn-primary" id="fMarkVisited" type="button">+ I’ve been here</button>' +
      '<button class="btn btn-gold" id="fAddWishlist" type="button">+ Add to wishlist</button></div>';
  }
  html += '</div>';

  // 4. Show it without losing the scroll position, and move focus into it.
  const panel = $('panel');
  const scroll = panel.scrollTop;
  panel.innerHTML = html;
  panel.scrollTop = scroll; // re-rendering shouldn't jump back to the top
  panel.classList.add('open');
  $('panelScrim').classList.add('open');
  const target = $(opts.focus || 'panelClose');
  if (target) target.focus({ preventScroll: true });
}

/** Closes the panel and returns keyboard focus to where it was. */
export function closePanel() {
  if (!$('panel').classList.contains('open')) return;
  flushMemory();
  $('panel').classList.remove('open');
  $('panelScrim').classList.remove('open');
  panelKey = null;
  if (panelReturnFocus && panelReturnFocus.focus) panelReturnFocus.focus({ preventScroll: true });
}

/**
 * Changes a place's status, then updates the map (with the fill animation),
 * every section, the panel, and shows the matching message.
 * @param {string} key
 * @param {'visited'|'wishlist'|null} status - null makes it unseen again (and deletes its details)
 */
export function setStatus(key, status) {
  const p = PLACE_BY_KEY[key];
  const before = getStatus(key);
  if (status) {
    ensureEntry(key).status = status;
    state.countries[key] = sanitizeEntry(state.countries[key]);
  } else delete state.countries[key];
  saveState();
  animateFill(key);
  renderAll();
  if (status === 'visited' && before !== 'visited') {
    showToast(p.isCountry ? 'COUNTRY ADDED' : 'PLACE ADDED', `${p.label} is no longer unseen.`);
  } else if (status === 'wishlist') {
    showToast('WISHLIST', `${plural(wishlistPlaces().length, 'country', 'countries')} waiting for you.`);
  }
}

/** Saves the memory field immediately (used when the panel closes mid-typing). */
function flushMemory() {
  if (!memorySaveTimer) return;
  clearTimeout(memorySaveTimer);
  memorySaveTimer = null;
  saveState();
  renderMemories();
  renderScore();
}

/**
 * One delegated set of listeners on the panel element handles every control
 * in it. This is set up once at start-up; because the panel's contents are
 * rebuilt on every change, delegation avoids re-attaching listeners each time.
 */
export function bindPanel() {
  const panel = $('panel');

  // Buttons, by id: close, change the state, add a city, remove the photo or a city.
  panel.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t || !panelKey) return;
    const key = panelKey,
      c = state.countries[key];
    switch (t.id) {
      case 'panelClose':
        closePanel();
        break;
      case 'fMarkVisited':
        setStatus(key, 'visited');
        openPanel(key);
        break;
      case 'fAddWishlist':
        setStatus(key, 'wishlist');
        openPanel(key);
        break;
      case 'fRemoveWishlist':
        setStatus(key, null);
        closePanel();
        break;
      case 'fMarkUnseen':
        if (confirm(`Mark ${PLACE_BY_KEY[key].label} as unseen and delete its details?`)) {
          setStatus(key, null);
          closePanel();
        }
        break;
      case 'fCityAdd':
        addCity();
        break;
      case 'fPhotoRemove':
        delete c.photo;
        saveState();
        renderMemories();
        openPanel(key);
        break;
      default:
        if (t.closest('#cityChips')) {
          // a city chip's × button
          c.cities.splice(parseInt(t.dataset.i, 10), 1);
          saveState();
          renderMyWorld();
          renderMemories();
          openPanel(key, { focus: 'fCityInput' });
        }
    }
  });

  // Enter in the city field adds the city.
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'fCityInput') {
      e.preventDefault();
      addCity();
    }
  });

  // 'input' fires on every keystroke/drag; 'change' when the user commits.
  panel.addEventListener('input', (e) => {
    if (!panelKey) return;
    const c = ensureEntry(panelKey);
    if (e.target.id === 'fRating') {
      c.rating = parseInt(e.target.value, 10);
      const lbl = $('fRatingVal');
      lbl.textContent = `${c.rating} / 10`;
      lbl.classList.remove('unset');
      saveState();
    } else if (e.target.id === 'fMemory') {
      // Saved shortly after typing pauses — and immediately if the panel closes.
      c.memory = e.target.value.slice(0, LIMITS.memory);
      if (!c.memory.trim()) delete c.memory;
      clearTimeout(memorySaveTimer);
      memorySaveTimer = setTimeout(flushMemory, 400);
    }
  });

  panel.addEventListener('change', (e) => {
    if (!panelKey) return;
    const c = ensureEntry(panelKey);
    switch (e.target.id) {
      case 'fFirstVisited': {
        const v = e.target.value;
        if (v && v <= todayIso()) c.firstVisited = v;
        else {
          delete c.firstVisited;
          e.target.value = '';
        }
        saveState();
        renderTimeline();
        renderMemories();
        break;
      }
      case 'fRating':
        renderMyWorld();
        renderMemories();
        renderScore();
        break;
      case 'fMemory':
        flushMemory();
        break;
      case 'fTrips': {
        const n = parseInt(e.target.value, 10);
        c.trips = Math.min(Math.max(n || 1, 1), LIMITS.trips);
        e.target.value = c.trips;
        saveState();
        renderMemories();
        break;
      }
      case 'fPhoto':
        if (e.target.files[0]) addPhoto(panelKey, e.target.files[0]);
        break;
    }
  });
}

/** Adds the city typed in the panel (ignoring empty input and duplicates). */
function addCity() {
  const input = $('fCityInput');
  const v = input.value.trim().slice(0, LIMITS.cityLength);
  if (!v) return;
  const c = ensureEntry(panelKey);
  c.cities = c.cities || [];
  const dup = c.cities.some((x) => x.toLowerCase() === v.toLowerCase());
  if (!dup && c.cities.length < LIMITS.cities) {
    c.cities.push(v);
    saveState();
    renderMyWorld();
    renderMemories();
  }
  openPanel(panelKey, { focus: 'fCityInput' });
}

/**
 * Resizes a chosen photo to at most 480 px on its long side and stores it as
 * a JPEG data URL. Photos live in localStorage like everything else, so
 * they are kept small on purpose (typically 30–60 KB). If storage is full,
 * the photo is removed again and the user is told — nothing pretends to be
 * saved when it isn't.
 * @param {string} key
 * @param {File} file
 */
function addPhoto(key, file) {
  if (!/^image\//.test(file.type)) {
    showToast('PHOTO', 'That file isn’t an image.');
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    const scale = Math.min(1, LIMITS.photoMaxPx / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const c = ensureEntry(key);
    c.photo = canvas.toDataURL('image/jpeg', LIMITS.photoQuality);
    if (!saveState()) {
      delete c.photo;
      saveState();
      showToast('STORAGE FULL', 'There’s no room left on this device for another photo.');
    }
    renderMemories();
    if (panelKey === key) openPanel(key);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    showToast('PHOTO', 'This image format can’t be read by your browser.');
  };
  img.src = url;
}
