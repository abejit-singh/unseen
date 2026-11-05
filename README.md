# UNSEEN.

**How much of the world is still waiting for you?**

UNSEEN is an interactive world map for tracking where you've been. It is not a checklist: the map fills in as you mark countries visited, and every place keeps its own record of dates, cities, a rating, a memory and a photo.

No backend, no build step, no accounts. Everything runs client-side and saves to your browser's `localStorage`.

## Live features

- **A real geographic map.** Actual country borders (Natural Earth data via D3 and topojson), not a static image. Every country can be clicked, hovered, zoomed and panned.
- **All 195 countries.** The 193 UN members plus the two observer states. The 29 countries too small to have a shape at this scale (Malta, Singapore, San Marino, Vatican City and others) are drawn as dots at their real location. Dots that sit inside another country become clickable once you zoom in, so they never steal a tap meant for Italy or France.
- **Territories, handled honestly.** Greenland, Puerto Rico, Antarctica and a few other areas appear on the map and can be marked, but they don't count toward the 195. The headline number means what it says.
- **Three states per place.** Unseen, visited or wishlist. Each change spreads its new colour outward from the country's centre.
- **Country details.** First visited date, cities, a 1–10 rating, a short memory, number of trips and an optional photo, all editable from a side panel (a bottom sheet on phones).
- **Find a country.** A search field that also gives keyboard and screen-reader users a way to reach any country.
- **Continent filters.** Dim and zoom the map to one continent, with live stats for how much of it you've explored.
- **My World.** Totals for countries, continents and cities visited, your best-rated place, and a progress bar per continent.
- **Your Memories.** The notes, ratings and photos you've attached to visited places.
- **Travel Timeline.** Generated automatically from the dates you enter.
- **What's Next.** Suggestions based on real distances from the map data:
  - the closest unseen countries to anywhere you've been;
  - the most distant ones on continents you haven't visited yet;
  - your wishlist;
  - a random pick.
- **World Score.** An internal index of your progress, clearly labelled as such.

All numbers are computed live from what you enter. Nothing is hardcoded or simulated.

## Using the map

- **Desktop:** drag to pan. Zoom with Ctrl/⌘ + scroll, a trackpad pinch, or the + / − buttons. Plain scrolling keeps scrolling the page.
- **Phone or tablet:** pinch to zoom, tap a country. At full view, one finger scrolls the page; once you've zoomed in, it pans the map.

## Running it locally

No installation required.

1. Download `index.html`.
2. Open it in any modern browser (double-click, or drag it into a browser window).

The first load needs an internet connection for the map (country shapes, D3 and topojson) and Google Fonts. Installed as an app (below), it keeps working offline after that.

## Installing as an app (PWA)

UNSEEN is a Progressive Web App. Once it's hosted over HTTPS (for example on GitHub Pages), you can install it like a native app, with its own icon. After the first visit it works fully offline, map included.

- **On mobile:** open the site, then use your browser's "Add to Home Screen" option (Safari: Share → Add to Home Screen; Chrome: menu → Install app).
- **On desktop:** Chrome and Edge show an install icon in the address bar.

The install prompt and offline caching only activate when the site is served over HTTPS. Opening `index.html` directly from disk (`file://`) works for everything except installability and offline mode, because browsers require a secure context for service workers.

## Privacy

UNSEEN collects nothing and sends nothing to any server it controls. There is no backend at all.

- **What's stored:** the places you mark, your wishlist, and the visit dates, cities, ratings, memories, trip counts and photos you add. It is saved only in your browser's `localStorage`, under the key `unseen_state_v1`. Photos are resized on your device to a small JPEG before being stored.
- **Where it goes:** nowhere. None of your data ever leaves your device. There's no analytics, tracking, cookies or logging of any kind.
- **The outside requests that do happen:** the page downloads public, static files it needs to work:
  - the D3 and topojson libraries (cdnjs.cloudflare.com);
  - the world map data (cdn.jsdelivr.net, with unpkg.com as a fallback);
  - the typefaces (Google Fonts).

  Like any file download on any website, these requests expose your IP address and browser type to those providers as a normal side effect. UNSEEN itself never sends them, or anyone, any of your data.
- **Security:** a Content Security Policy restricts the page to loading code and data only from the sources above. All text you enter is escaped before it is displayed, and saved data is validated every time it loads.
- **Clearing your data:** use the reset button (top-right of the site) at any time.

## Tech

Vanilla HTML, CSS and JavaScript in a single, fully commented file. The map is built with [D3.js](https://d3js.org) 7.9.0 and topojson-client 3.0.2, loaded from cdnjs.cloudflare.com. Country shapes come from [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth 1:110m data, public domain). No frameworks and no build tools.

| File | Purpose |
| --- | --- |
| `index.html` | The whole app: markup, styles and script |
| `manifest.json` | App name, colours and icons for installation |
| `service-worker.js` | Offline support (caches the app and the map files) |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon-32.png` | App icons |

## Disclaimer

The World Score and continent statistics are an internal, illustrative index based on the places you've marked, not an official or scientific measure of anything. The country and territory classification follows the 193 UN member states plus the two UN observer states, and implies no position on any disputed status.

## Copyright

© 2026 Abejit. All rights reserved.

This project is shared publicly on GitHub for portfolio purposes. No license is granted to copy, modify, redistribute or reuse this code or design. Please don't recreate this project. If you'd like to use any part of it, get in touch first.
