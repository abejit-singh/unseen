/**
 * Motion and light: counting numbers, the toast, sections revealed on
 * scroll and the pointer effects on cards and buttons.
 */

import { $, escapeHtml, prefersReducedMotion } from './utils.js';

/**
 * Animates a number from whatever it currently shows to `target`, so
 * counters tick 12 → 13 instead of restarting from zero on every change.
 * The last value is remembered on the element itself.
 * @param {HTMLElement} el
 * @param {number} target
 * @param {function(number):string} [format] - defaults to a rounded integer
 */
export function animateNumber(el, target, format) {
  format = format || ((v) => Math.round(v).toLocaleString('en-US'));
  const from = typeof el._value === 'number' ? el._value : 0;
  el._value = target;
  if (from === target || prefersReducedMotion()) {
    el.textContent = format(target);
    return;
  }
  let start = null;
  const duration = 700;
  // One frame: the eased value for the time elapsed, until the target is reached.
  function tick(ts) {
    if (start === null) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const eased = 1 - (1 - p) ** 3; // ease-out cubic
    el.textContent = format(from + (target - from) * eased);
    if (p < 1 && el._value === target) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

let toastTimer = null;

/**
 * Shows a short message at the bottom of the screen.
 * @param {string} title - small caps heading, e.g. "COUNTRY ADDED"
 * @param {string} body
 */
export function showToast(title, body) {
  const el = $('toast');
  el.innerHTML = `<strong>${escapeHtml(title)}</strong>${escapeHtml(body)}`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 2800);
}

/** Fades sections in as they scroll into view; shows everything at once on browsers without IntersectionObserver. */
export function setupReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => {
      el.classList.add('is-visible');
    });
    return;
  }
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          obs.unobserve(en.target);
        }
      });
    },
    { threshold: 0.08 }
  );
  els.forEach((el) => {
    obs.observe(el);
  });
}

// ---------- Pointer effects ----------
/** Surfaces that a light follows across (see "Surfaces and light" in the stylesheet). */
const LIGHT_SELECTOR = '.stat, .memory-card, .next-card, .surprise-card, .map-container, .unseen-section';

/** Cards that also lean towards the mouse in 3D. */
const TILT_SELECTOR = '.surprise-card';

/** Buttons that lean a few pixels towards the cursor. */
const MAGNET_SELECTOR = '.btn-primary, .btn-gold';

/**
 * Pointer effects, for mouse users only. One listener for the page writes the
 * pointer position into CSS variables on the element under it: --px / --py (the
 * light on a card), --rx / --ry (a slight tilt), --mx / --my (a button's pull).
 * Tilt and pull are skipped when reduced motion is on.
 */
export function setupPointerEffects() {
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const still = prefersReducedMotion();
  let last = null,
    queued = false,
    tilted = null,
    pulled = null;

  // Drops a pair of CSS variables, so the element eases back to rest.
  function clear(el, a, b) {
    if (el) {
      el.style.removeProperty(a);
      el.style.removeProperty(b);
    }
  }

  // Once per frame: light, tilt and pull for whatever is under the pointer now.
  function apply() {
    queued = false;
    const t = last.target && last.target.closest ? last.target : null;
    const x = last.clientX,
      y = last.clientY;
    const lit = t && t.closest(LIGHT_SELECTOR);
    if (lit) {
      const r = lit.getBoundingClientRect();
      lit.style.setProperty('--px', `${x - r.left}px`);
      lit.style.setProperty('--py', `${y - r.top}px`);
    }
    if (still) return;
    const tilt = t && t.closest(TILT_SELECTOR);
    if (tilted !== tilt) clear(tilted, '--rx', '--ry');
    tilted = tilt;
    if (tilt) {
      const b = tilt.getBoundingClientRect();
      tilt.style.setProperty('--rx', `${(((y - b.top) / b.height - 0.5) * -6).toFixed(2)}deg`);
      tilt.style.setProperty('--ry', `${(((x - b.left) / b.width - 0.5) * 7).toFixed(2)}deg`);
    }
    let btn = t && t.closest(MAGNET_SELECTOR);
    if (btn && btn.disabled) btn = null;
    if (pulled !== btn) clear(pulled, '--mx', '--my');
    pulled = btn;
    if (btn) {
      const c = btn.getBoundingClientRect();
      btn.style.setProperty('--mx', `${(((x - c.left) / c.width - 0.5) * 8).toFixed(1)}px`);
      btn.style.setProperty('--my', `${(((y - c.top) / c.height - 0.5) * 6).toFixed(1)}px`);
    }
  }

  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      last = e;
      if (!queued) {
        queued = true;
        requestAnimationFrame(apply);
      }
    },
    { passive: true }
  );
  // The pointer left the window: let everything settle back.
  document.documentElement.addEventListener('mouseleave', () => {
    clear(tilted, '--rx', '--ry');
    clear(pulled, '--mx', '--my');
    tilted = pulled = null;
  });
}
