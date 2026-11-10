/**
 * UNSEEN — an interactive map of everywhere you've been, and everywhere you haven't.
 *
 * Architecture
 * ------------
 * - Three plain files: index.html (markup), style.css and this script.
 *   No build step, no framework, no backend. D3 draws the map,
 *   topojson-client decodes the compact world-atlas file into shapes.
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
 * - Sections of the code, in order: data tables, state & persistence,
 *   helpers, place model, data-only renderers (work before the map loads),
 *   the map itself, the country panel, the interactive sections, init.
 * - Modern JavaScript that every current browser runs natively (const/let,
 *   arrow functions, template literals), so there is nothing to transpile.
 */
(() => {
  'use strict';

  /* ============================================================================
     DATA TABLES
     ============================================================================ */

  /** Human-readable continent names, keyed by the short ids used everywhere else. */
  const CONTINENT_LABELS = {
    africa: 'Africa',
    europe: 'Europe',
    asia: 'Asia',
    namerica: 'North America',
    samerica: 'South America',
    oceania: 'Oceania',
    antarctica: 'Antarctica'
  };
  /** Display order for continent pills and progress bars. */
  const CONTINENT_ORDER = ['europe', 'asia', 'africa', 'namerica', 'samerica', 'oceania', 'antarctica'];

  /**
   * Rough geographic window for each continent, as [[west, south], [east, north]]
   * in degrees. Used to zoom the map when a continent filter is chosen. These
   * are hand-tuned boxes rather than the bounds of the countries themselves,
   * because real bounds are misleading: France includes French Guiana (so
   * "Europe" would stretch to South America) and Russia spans to the Pacific.
   */
  const CONTINENT_VIEWS = {
    europe: [
      [-25, 34],
      [45, 71]
    ],
    asia: [
      [25, -11],
      [150, 56]
    ],
    africa: [
      [-20, -36],
      [55, 38]
    ],
    namerica: [
      [-170, 7],
      [-50, 75]
    ],
    samerica: [
      [-85, -56],
      [-33, 13]
    ],
    oceania: [
      [110, -48],
      [180, 2]
    ],
    antarctica: [
      [-180, -90],
      [180, -58]
    ]
  };

  /**
   * Every shape in the world-atlas 1:110m file: [atlas name, continent, ISO 3166-1 alpha-2].
   * The atlas name is used as the storage key, so it must match the data file
   * exactly (see NAME_ALIASES for alternative spellings). The ISO code is only
   * used to build a flag emoji; an empty code falls back to a globe.
   */
  const MAP_PLACES = [
    ['Fiji', 'oceania', 'FJ'],
    ['Tanzania', 'africa', 'TZ'],
    ['W. Sahara', 'africa', 'EH'],
    ['Canada', 'namerica', 'CA'],
    ['United States of America', 'namerica', 'US'],
    ['Kazakhstan', 'asia', 'KZ'],
    ['Uzbekistan', 'asia', 'UZ'],
    ['Papua New Guinea', 'oceania', 'PG'],
    ['Indonesia', 'asia', 'ID'],
    ['Argentina', 'samerica', 'AR'],
    ['Chile', 'samerica', 'CL'],
    ['Dem. Rep. Congo', 'africa', 'CD'],
    ['Somalia', 'africa', 'SO'],
    ['Kenya', 'africa', 'KE'],
    ['Sudan', 'africa', 'SD'],
    ['Chad', 'africa', 'TD'],
    ['Haiti', 'namerica', 'HT'],
    ['Dominican Rep.', 'namerica', 'DO'],
    ['Russia', 'europe', 'RU'],
    ['Bahamas', 'namerica', 'BS'],
    ['Falkland Is.', 'samerica', 'FK'],
    ['Norway', 'europe', 'NO'],
    ['Greenland', 'namerica', 'GL'],
    ['Fr. S. Antarctic Lands', 'antarctica', 'TF'],
    ['Timor-Leste', 'asia', 'TL'],
    ['South Africa', 'africa', 'ZA'],
    ['Lesotho', 'africa', 'LS'],
    ['Mexico', 'namerica', 'MX'],
    ['Uruguay', 'samerica', 'UY'],
    ['Brazil', 'samerica', 'BR'],
    ['Bolivia', 'samerica', 'BO'],
    ['Peru', 'samerica', 'PE'],
    ['Colombia', 'samerica', 'CO'],
    ['Panama', 'namerica', 'PA'],
    ['Costa Rica', 'namerica', 'CR'],
    ['Nicaragua', 'namerica', 'NI'],
    ['Honduras', 'namerica', 'HN'],
    ['El Salvador', 'namerica', 'SV'],
    ['Guatemala', 'namerica', 'GT'],
    ['Belize', 'namerica', 'BZ'],
    ['Venezuela', 'samerica', 'VE'],
    ['Guyana', 'samerica', 'GY'],
    ['Suriname', 'samerica', 'SR'],
    ['France', 'europe', 'FR'],
    ['Ecuador', 'samerica', 'EC'],
    ['Puerto Rico', 'namerica', 'PR'],
    ['Jamaica', 'namerica', 'JM'],
    ['Cuba', 'namerica', 'CU'],
    ['Zimbabwe', 'africa', 'ZW'],
    ['Botswana', 'africa', 'BW'],
    ['Namibia', 'africa', 'NA'],
    ['Senegal', 'africa', 'SN'],
    ['Mali', 'africa', 'ML'],
    ['Mauritania', 'africa', 'MR'],
    ['Benin', 'africa', 'BJ'],
    ['Niger', 'africa', 'NE'],
    ['Nigeria', 'africa', 'NG'],
    ['Cameroon', 'africa', 'CM'],
    ['Togo', 'africa', 'TG'],
    ['Ghana', 'africa', 'GH'],
    ["Côte d'Ivoire", 'africa', 'CI'],
    ['Guinea', 'africa', 'GN'],
    ['Guinea-Bissau', 'africa', 'GW'],
    ['Liberia', 'africa', 'LR'],
    ['Sierra Leone', 'africa', 'SL'],
    ['Burkina Faso', 'africa', 'BF'],
    ['Central African Rep.', 'africa', 'CF'],
    ['Congo', 'africa', 'CG'],
    ['Gabon', 'africa', 'GA'],
    ['Eq. Guinea', 'africa', 'GQ'],
    ['Zambia', 'africa', 'ZM'],
    ['Malawi', 'africa', 'MW'],
    ['Mozambique', 'africa', 'MZ'],
    ['eSwatini', 'africa', 'SZ'],
    ['Angola', 'africa', 'AO'],
    ['Burundi', 'africa', 'BI'],
    ['Israel', 'asia', 'IL'],
    ['Lebanon', 'asia', 'LB'],
    ['Madagascar', 'africa', 'MG'],
    ['Palestine', 'asia', 'PS'],
    ['Gambia', 'africa', 'GM'],
    ['Tunisia', 'africa', 'TN'],
    ['Algeria', 'africa', 'DZ'],
    ['Jordan', 'asia', 'JO'],
    ['United Arab Emirates', 'asia', 'AE'],
    ['Qatar', 'asia', 'QA'],
    ['Kuwait', 'asia', 'KW'],
    ['Iraq', 'asia', 'IQ'],
    ['Oman', 'asia', 'OM'],
    ['Vanuatu', 'oceania', 'VU'],
    ['Cambodia', 'asia', 'KH'],
    ['Thailand', 'asia', 'TH'],
    ['Laos', 'asia', 'LA'],
    ['Myanmar', 'asia', 'MM'],
    ['Vietnam', 'asia', 'VN'],
    ['North Korea', 'asia', 'KP'],
    ['South Korea', 'asia', 'KR'],
    ['Mongolia', 'asia', 'MN'],
    ['India', 'asia', 'IN'],
    ['Bangladesh', 'asia', 'BD'],
    ['Bhutan', 'asia', 'BT'],
    ['Nepal', 'asia', 'NP'],
    ['Pakistan', 'asia', 'PK'],
    ['Afghanistan', 'asia', 'AF'],
    ['Tajikistan', 'asia', 'TJ'],
    ['Kyrgyzstan', 'asia', 'KG'],
    ['Turkmenistan', 'asia', 'TM'],
    ['Iran', 'asia', 'IR'],
    ['Syria', 'asia', 'SY'],
    ['Armenia', 'asia', 'AM'],
    ['Sweden', 'europe', 'SE'],
    ['Belarus', 'europe', 'BY'],
    ['Ukraine', 'europe', 'UA'],
    ['Poland', 'europe', 'PL'],
    ['Austria', 'europe', 'AT'],
    ['Hungary', 'europe', 'HU'],
    ['Moldova', 'europe', 'MD'],
    ['Romania', 'europe', 'RO'],
    ['Lithuania', 'europe', 'LT'],
    ['Latvia', 'europe', 'LV'],
    ['Estonia', 'europe', 'EE'],
    ['Germany', 'europe', 'DE'],
    ['Bulgaria', 'europe', 'BG'],
    ['Greece', 'europe', 'GR'],
    ['Turkey', 'asia', 'TR'],
    ['Albania', 'europe', 'AL'],
    ['Croatia', 'europe', 'HR'],
    ['Switzerland', 'europe', 'CH'],
    ['Luxembourg', 'europe', 'LU'],
    ['Belgium', 'europe', 'BE'],
    ['Netherlands', 'europe', 'NL'],
    ['Portugal', 'europe', 'PT'],
    ['Spain', 'europe', 'ES'],
    ['Ireland', 'europe', 'IE'],
    ['New Caledonia', 'oceania', 'NC'],
    ['Solomon Is.', 'oceania', 'SB'],
    ['New Zealand', 'oceania', 'NZ'],
    ['Australia', 'oceania', 'AU'],
    ['Sri Lanka', 'asia', 'LK'],
    ['China', 'asia', 'CN'],
    ['Taiwan', 'asia', 'TW'],
    ['Italy', 'europe', 'IT'],
    ['Denmark', 'europe', 'DK'],
    ['United Kingdom', 'europe', 'GB'],
    ['Iceland', 'europe', 'IS'],
    ['Azerbaijan', 'asia', 'AZ'],
    ['Georgia', 'asia', 'GE'],
    ['Philippines', 'asia', 'PH'],
    ['Malaysia', 'asia', 'MY'],
    ['Brunei', 'asia', 'BN'],
    ['Slovenia', 'europe', 'SI'],
    ['Finland', 'europe', 'FI'],
    ['Slovakia', 'europe', 'SK'],
    ['Czechia', 'europe', 'CZ'],
    ['Eritrea', 'africa', 'ER'],
    ['Japan', 'asia', 'JP'],
    ['Paraguay', 'samerica', 'PY'],
    ['Yemen', 'asia', 'YE'],
    ['Saudi Arabia', 'asia', 'SA'],
    ['Antarctica', 'antarctica', 'AQ'],
    ['N. Cyprus', 'europe', ''],
    ['Cyprus', 'europe', 'CY'],
    ['Morocco', 'africa', 'MA'],
    ['Egypt', 'africa', 'EG'],
    ['Libya', 'africa', 'LY'],
    ['Ethiopia', 'africa', 'ET'],
    ['Djibouti', 'africa', 'DJ'],
    ['Somaliland', 'africa', ''],
    ['Uganda', 'africa', 'UG'],
    ['Rwanda', 'africa', 'RW'],
    ['Bosnia and Herz.', 'europe', 'BA'],
    ['Macedonia', 'europe', 'MK'],
    ['Serbia', 'europe', 'RS'],
    ['Montenegro', 'europe', 'ME'],
    ['Kosovo', 'europe', 'XK'],
    ['Trinidad and Tobago', 'namerica', 'TT'],
    ['S. Sudan', 'africa', 'SS']
  ];

  /**
   * Shapes on the map that are not among the 195 countries: dependent
   * territories, Antarctica, and areas whose status is disputed. They can be
   * marked visited like anything else, but are left out of the headline count.
   * The wording shown to users is deliberately neutral.
   */
  const TERRITORIES = [
    'W. Sahara',
    'Puerto Rico',
    'Falkland Is.',
    'Greenland',
    'Fr. S. Antarctic Lands',
    'New Caledonia',
    'Antarctica',
    'N. Cyprus',
    'Somaliland',
    'Taiwan',
    'Kosovo'
  ];

  /**
   * The 29 countries too small to appear as shapes at 1:110m:
   * [name, continent, ISO code, longitude, latitude] — coordinates are each
   * country's capital (or main island), where its dot is drawn.
   */
  const MICROSTATES = [
    ['Andorra', 'europe', 'AD', 1.52, 42.51],
    ['Liechtenstein', 'europe', 'LI', 9.55, 47.16],
    ['Malta', 'europe', 'MT', 14.38, 35.94],
    ['Monaco', 'europe', 'MC', 7.42, 43.74],
    ['San Marino', 'europe', 'SM', 12.46, 43.94],
    ['Vatican City', 'europe', 'VA', 12.45, 41.9],
    ['Bahrain', 'asia', 'BH', 50.55, 26.07],
    ['Maldives', 'asia', 'MV', 73.51, 4.17],
    ['Singapore', 'asia', 'SG', 103.82, 1.35],
    ['Cabo Verde', 'africa', 'CV', -23.51, 14.93],
    ['Comoros', 'africa', 'KM', 43.26, -11.7],
    ['Mauritius', 'africa', 'MU', 57.55, -20.35],
    ['São Tomé and Príncipe', 'africa', 'ST', 6.61, 0.19],
    ['Seychelles', 'africa', 'SC', 55.49, -4.68],
    ['Antigua and Barbuda', 'namerica', 'AG', -61.85, 17.12],
    ['Barbados', 'namerica', 'BB', -59.54, 13.19],
    ['Dominica', 'namerica', 'DM', -61.37, 15.41],
    ['Grenada', 'namerica', 'GD', -61.68, 12.11],
    ['Saint Kitts and Nevis', 'namerica', 'KN', -62.72, 17.3],
    ['Saint Lucia', 'namerica', 'LC', -60.98, 13.91],
    ['Saint Vincent and the Grenadines', 'namerica', 'VC', -61.2, 13.25],
    ['Kiribati', 'oceania', 'KI', 172.98, 1.45],
    ['Marshall Islands', 'oceania', 'MH', 171.18, 7.11],
    ['Micronesia', 'oceania', 'FM', 158.18, 6.92],
    ['Nauru', 'oceania', 'NR', 166.93, -0.52],
    ['Palau', 'oceania', 'PW', 134.58, 7.51],
    ['Samoa', 'oceania', 'WS', -171.76, -13.83],
    ['Tonga', 'oceania', 'TO', -175.2, -21.14],
    ['Tuvalu', 'oceania', 'TV', 179.2, -8.52]
  ];

  /**
   * Friendlier display names for the atlas's abbreviated ones. The atlas name
   * stays the internal key (so saved data keeps working); only the label changes.
   */
  const DISPLAY_NAMES = {
    'United States of America': 'United States',
    'Dem. Rep. Congo': 'DR Congo',
    'Central African Rep.': 'Central African Republic',
    'Dominican Rep.': 'Dominican Republic',
    'Eq. Guinea': 'Equatorial Guinea',
    'S. Sudan': 'South Sudan',
    'Bosnia and Herz.': 'Bosnia and Herzegovina',
    'Solomon Is.': 'Solomon Islands',
    'Falkland Is.': 'Falkland Islands',
    'Fr. S. Antarctic Lands': 'French Southern Lands',
    'W. Sahara': 'Western Sahara',
    'N. Cyprus': 'Northern Cyprus',
    Macedonia: 'North Macedonia',
    eSwatini: 'Eswatini'
  };

  /**
   * Alternative spellings that different releases of the Natural Earth data
   * (on which world-atlas is built) have used for the same shape. Any of these
   * found in the downloaded file — or in old saved data — is mapped to our key,
   * so a renamed country never silently becomes unclickable.
   */
  const NAME_ALIASES = {
    Swaziland: 'eSwatini',
    Eswatini: 'eSwatini',
    'North Macedonia': 'Macedonia',
    'Czech Rep.': 'Czechia',
    'Czech Republic': 'Czechia',
    'Ivory Coast': "Côte d'Ivoire",
    'East Timor': 'Timor-Leste',
    'Republic of Serbia': 'Serbia',
    'Dem. Rep. Korea': 'North Korea',
    Korea: 'South Korea',
    'Lao PDR': 'Laos'
  };

  /** Where to download the world shapes from: tried in order, so one CDN outage doesn't break the map. */
  const WORLD_ATLAS_URLS = [
    'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
    'https://unpkg.com/world-atlas@2/countries-110m.json'
  ];

  const QUIPS_UNSEEN = [
    'Maybe this is your next destination.',
    'Still waiting for you.',
    "Nobody's stamped this passport page yet.",
    'An open page on the map.'
  ];

  /** Limits applied when saving user input, so one runaway field can't fill localStorage. */
  const LIMITS = {
    cityLength: 80,
    cities: 50,
    memory: 1000,
    trips: 999,
    photoMaxPx: 480,
    photoQuality: 0.72
  };

  /* ============================================================================
     STATE & PERSISTENCE
     ============================================================================ */

  const STORAGE_KEY = 'unseen_state_v1';

  /**
   * Shape of the saved state:
   *   { countries: { [placeKey]: { status:'visited'|'wishlist', firstVisited?:'YYYY-MM-DD',
   *                                cities?:string[], rating?:1-10, memory?:string,
   *                                trips?:number, photo?:dataURL } } }
   * A place with no entry is "unseen". The key is still called `countries`
   * (although territories are stored there too) so data saved by earlier
   * versions of the app loads unchanged.
   */
  let state = { countries: {} };

  /** Shorthand for document.getElementById. */
  function $(id) {
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
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Cleans one saved entry: keeps only known fields with valid values and
   * drops everything else. Run on every load, so hand-edited, corrupted or
   * outdated localStorage data can never crash the app or inject markup
   * (photos, for instance, must be real image data URLs).
   * @param {object} raw - one entry as read from storage
   * @returns {object|null} a clean entry, or null if it should be discarded
   */
  function sanitizeEntry(raw) {
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
    if (
      typeof raw.photo === 'string' &&
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(raw.photo)
    )
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
    } catch (e) {
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
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Returns the entry for a place, creating an empty one if needed.
   * @param {string} key
   * @returns {object}
   */
  function ensureEntry(key) {
    if (!state.countries[key]) state.countries[key] = {};
    return state.countries[key];
  }

  /* ============================================================================
     PLACE MODEL
     One list of everything markable, built once from the tables above.
     ============================================================================ */

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
  const PLACES = MAP_PLACES.map((r) => ({
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
  const PLACE_BY_KEY = {};
  PLACES.forEach((p) => {
    PLACE_BY_KEY[p.key] = p;
  });

  /** All 195 countries (the denominator of every "of the world" figure). */
  const COUNTRIES = PLACES.filter((p) => p.isCountry);
  const TOTAL_COUNTRIES = COUNTRIES.length; // 195: 166 shapes + 29 microstates

  /** @returns {string|undefined} 'visited', 'wishlist', or undefined for unseen */
  function getStatus(key) {
    const c = state.countries[key];
    return c ? c.status : undefined;
  }
  /** @returns {Place[]} every visited place, countries and territories alike */
  function visitedPlaces() {
    return PLACES.filter((p) => getStatus(p.key) === 'visited');
  }
  /** @returns {Place[]} visited countries only (what the headline numbers count) */
  function visitedCountries() {
    return COUNTRIES.filter((p) => getStatus(p.key) === 'visited');
  }
  /** @returns {Place[]} every place on the wishlist */
  function wishlistPlaces() {
    return PLACES.filter((p) => getStatus(p.key) === 'wishlist');
  }
  /** @returns {Place[]} every place not yet visited (wishlist included — it's still unseen) */
  function unseenPlaces() {
    return PLACES.filter((p) => getStatus(p.key) !== 'visited');
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
  function flagEmoji(iso2) {
    if (!iso2 || iso2.length !== 2) return '🌍';
    return String.fromCodePoint(127397 + iso2.charCodeAt(0), 127397 + iso2.charCodeAt(1));
  }

  /** @returns {string} "🇮🇹 Italy" — escaped and ready for HTML */
  function placeTitle(p) {
    return `${flagEmoji(p.iso2)} ${escapeHtml(p.label)}`;
  }

  /** English plural helper: plural(1,'country','countries') → "1 country". */
  function plural(n, one, many) {
    return `${n} ${n === 1 ? one : many}`;
  }

  /**
   * Formats a stored 'YYYY-MM-DD' date as "May 2018". The parts are read
   * directly instead of via `new Date(string)`, which parses date-only strings
   * as UTC and can show the previous month in time zones west of Greenwich.
   * @param {string} iso
   * @returns {string}
   */
  function formatMonthYear(iso) {
    const parts = iso.split('-');
    const d = new Date(+parts[0], +parts[1] - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  /** Today's date as 'YYYY-MM-DD' in the user's own time zone (the latest valid visit date). */
  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** True when the user has asked their OS for reduced motion. */
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Animates a number from whatever it currently shows to `target`, so
   * counters tick 12 → 13 instead of restarting from zero on every change.
   * The last value is remembered on the element itself.
   * @param {HTMLElement} el
   * @param {number} target
   * @param {function(number):string} [format] - defaults to a rounded integer
   */
  function animateNumber(el, target, format) {
    format = format || ((v) => Math.round(v).toLocaleString('en-US'));
    const from = typeof el._value === 'number' ? el._value : 0;
    el._value = target;
    if (from === target || prefersReducedMotion()) {
      el.textContent = format(target);
      return;
    }
    let start = null;
    const duration = 700;
    function tick(ts) {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
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
  function showToast(title, body) {
    const el = $('toast');
    el.innerHTML = `<strong>${escapeHtml(title)}</strong>${escapeHtml(body)}`;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
    }, 2800);
  }

  /* ============================================================================
     DATA-ONLY RENDERERS
     Everything below the map. They need no geography, so they work even
     while the map is loading or if it fails to load at all.
     ============================================================================ */

  let activeContinent = 'all';

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
  function renderContinentPills() {
    let html = '<button class="pill" type="button" data-c="all" aria-pressed="true">ALL</button>';
    CONTINENT_ORDER.forEach((c) => {
      html += `<button class="pill" type="button" data-c="${c}" aria-pressed="false">${CONTINENT_LABELS[c].toUpperCase()}</button>`;
    });
    $('continentPills').innerHTML = html;
  }

  /** The "EUROPE — 18 / 45 · 40.0% explored" line shown while a continent is selected. */
  function renderContinentReadout() {
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
  function renderMyWorld() {
    const visited = visitedPlaces();
    const countries = visitedCountries();
    const territories = visited.length - countries.length;
    const continents = {};
    let cities = 0;
    let best = null;
    visited.forEach((p) => {
      const c = state.countries[p.key];
      continents[p.continent] = true;
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
    $('myWorldGrid').innerHTML =
      `${
        cell(
          countries.length,
          'Countries visited',
          territories ? `+ ${plural(territories, 'territory', 'territories')}` : ''
        ) +
        cell(Object.keys(continents).length, 'Continents visited') +
        cell(cities, 'Cities visited') +
        cell(wishlistPlaces().length, 'Wishlist')
      }` +
      `<div class="stat">` +
      `<div class="num small">${best ? `${placeTitle(best.place)} — ${best.rating}/10` : '—'}</div>` +
      `<div class="lbl">Best rated</div></div>`;

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
    const list = $('continentList');
    // Keep the bars' current widths so they animate from old to new value.
    const oldWidths = Array.prototype.map.call(
      list.querySelectorAll('.continent-bar-fill'),
      (f) => f.style.width
    );
    list.innerHTML = rows.join('');
    const fills = list.querySelectorAll('.continent-bar-fill');
    Array.prototype.forEach.call(fills, (f, i) => {
      f.style.width = oldWidths[i] || '0%';
    });
    requestAnimationFrame(() => {
      Array.prototype.forEach.call(fills, (f) => {
        f.style.width = `${f.dataset.w}%`;
      });
    });
  }

  /** Memory cards for visited places that have a memory, rating or photo — newest first. */
  function renderMemories() {
    const grid = $('memoryGrid');
    const items = visitedPlaces()
      .filter((p) => {
        const c = state.countries[p.key];
        return c.memory || c.rating || c.photo;
      })
      .sort((a, b) =>
        (state.countries[b.key].firstVisited || '').localeCompare(state.countries[a.key].firstVisited || '')
      );
    if (items.length === 0) {
      grid.innerHTML =
        '<p class="empty-state">No memories yet. Mark a country as visited and add a note to see it here.</p>';
      return;
    }
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
  function renderTimeline() {
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
  function renderScore() {
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
  function renderAll() {
    renderStats();
    renderContinentReadout();
    renderMyWorld();
    renderMemories();
    renderTimeline();
    renderScore();
  }

  /* ============================================================================
     THE MAP
     ============================================================================ */

  const MAP_W = 960,
    MAP_H = 500; // SVG coordinate space; CSS scales it to fit
  const MICRO_RADIUS = 3.2; // dot radius at 1× zoom, in SVG units
  const ENCLAVE_MIN_ZOOM = 3; // zoom level at which dots inside other countries become clickable
  let map = null; // set once the map is built: { svg, layer, zoom, path, projection }
  const geo = {}; // per place key: { centroid:[lon,lat], feature? } for distance maths

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
  function initMap() {
    if (typeof d3 === 'undefined' || typeof topojson === 'undefined') {
      showMapError('The map library couldn’t load. Check your connection, then retry.');
      return;
    }
    loadWorldData(0);
  }

  /**
   * Downloads the world-atlas file, trying each URL in WORLD_ATLAS_URLS in
   * turn. On success the shapes are decoded and the map is built.
   * @param {number} i - index of the URL to try
   */
  function loadWorldData(i) {
    if (i >= WORLD_ATLAS_URLS.length) {
      showMapError('The world map data couldn’t be reached. Check your internet connection, then retry.');
      return;
    }
    fetch(WORLD_ATLAS_URLS[i])
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((topology) => {
        buildMap(topojson.feature(topology, topology.objects.countries));
      })
      .catch(() => {
        loadWorldData(i + 1);
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
      f.__key = PLACE_BY_KEY[n]
        ? n
        : NAME_ALIASES[n] && PLACE_BY_KEY[NAME_ALIASES[n]]
          ? NAME_ALIASES[n]
          : null;
    });
    const shapes = fc.features.filter((f) => f.__key);

    const projection = d3.geoNaturalEarth1().fitSize([MAP_W - 8, MAP_H - 8], fc);
    const path = d3.geoPath(projection);

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

    const micro = PLACES.filter((p) => p.lonLat);
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
        const lonLat = p.lonLat;
        if (shapes.some((f) => d3.geoContains(f, lonLat))) this.classList.add('enclave', 'locked');
        paintPlace(this);
      });

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
  function zoomToPlace(key) {
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
  function resetView() {
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
  function applyContinentFilter(zoom) {
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
  function pulse(keys) {
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
  function animateFill(key) {
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
    function tick(ts) {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      circle.setAttribute('r', maxR * (1 - Math.pow(1 - p, 3)));
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

  /* ============================================================================
     COUNTRY PANEL
     Opens when a place is clicked. Its content depends on the place's status:
     unseen → two actions; wishlist → mark visited / remove; visited → details.
     ============================================================================ */

  let panelKey = null; // place currently shown in the panel
  let panelReturnFocus = null; // element to give focus back to when the panel closes
  let memorySaveTimer = null;

  /**
   * Renders the panel for a place and opens it.
   * @param {string} key
   * @param {object} [opts]
   * @param {string} [opts.focus] - id of the element to focus after rendering
   */
  function openPanel(key, opts) {
    const p = PLACE_BY_KEY[key];
    if (!p) return;
    opts = opts || {};
    if (!$('panel').classList.contains('open')) panelReturnFocus = document.activeElement;
    panelKey = key;
    const c = state.countries[key] || {};
    const status = c.status;

    let html =
      `<div class="panel-inner">` +
      `<button class="panel-close" id="panelClose" type="button" aria-label="Close">×</button>` +
      `<div class="panel-badge ${status || 'unseen'}">${status ? status.toUpperCase() : 'UNSEEN'}</div>` +
      `<h2 class="panel-name" id="panelTitle">${placeTitle(p)}</h2>` +
      `<div class="panel-continent">${CONTINENT_LABELS[p.continent]}${p.isCountry ? '' : ' · Territory'}</div>` +
      (p.isCountry
        ? ''
        : '<p class="panel-note">Tracked on your map, but not counted among the 195 countries.</p>');

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
  function closePanel() {
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
  function setStatus(key, status) {
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
  function bindPanel() {
    const panel = $('panel');

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

  /* ============================================================================
     INTERACTIVE SECTIONS
     ============================================================================ */

  /** Continent pill clicks: update the filter, the readout and the map view. */
  function bindContinentPills() {
    $('continentPills').addEventListener('click', function (e) {
      const btn = e.target.closest('.pill');
      if (!btn) return;
      activeContinent = btn.dataset.c;
      Array.prototype.forEach.call(this.querySelectorAll('.pill'), (p) => {
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
  function bindSearch() {
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

  /** Picks `n` random items from an array without repeats. */
  function sample(arr, n) {
    const pool = arr.slice(),
      out = [];
    while (out.length < n && pool.length)
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  }

  /** "Explore the unseen" buttons: back to the full view and highlight six unseen places. */
  function bindExplore() {
    ['ctaExplore', 'ctaExplore2'].forEach((id) => {
      $(id).addEventListener('click', () => {
        $('mapContainer').scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'center'
        });
        const pool = unseenPlaces().filter(
          (p) => activeContinent === 'all' || p.continent === activeContinent
        );
        setTimeout(() => {
          resetView();
          pulse(sample(pool, 6).map((p) => p.key));
        }, 350);
      });
    });
  }

  /** "Surprise me": a random unseen place in a card, with wishlist and explore actions. */
  function bindSurprise() {
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
   * Great-circle distance between two points on Earth (haversine formula).
   * @param {number[]} a - [lon, lat] in degrees
   * @param {number[]} b - [lon, lat] in degrees
   * @returns {number} kilometres
   */
  function distanceKm(a, b) {
    const R = 6371,
      rad = Math.PI / 180;
    const dLat = (b[1] - a[1]) * rad,
      dLon = (b[0] - a[0]) * rad;
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
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
    if (!map) return { empty: 'The map is still loading — try again in a moment.' };
    const visited = visitedPlaces().filter((p) => geo[p.key]);
    if (visited.length === 0)
      return { empty: 'Mark a country as visited first, so there’s somewhere to measure from.' };
    const scored = unseen
      .filter((p) => geo[p.key])
      .map((p) => {
        const n = nearestVisited(p, visited);
        return { place: p, km: n.km, from: n.place };
      });
    if (mode === 'closest') {
      return { items: scored.sort((a, b) => a.km - b.km).slice(0, 3) };
    }
    const touched = {};
    visited.forEach((p) => {
      touched[p.continent] = true;
    });
    const fresh = scored.filter((s) => !touched[s.place.continent]);
    const farthest = (list) => list.sort((a, b) => b.km - a.km);
    if (fresh.length) {
      const perContinent = {};
      farthest(fresh).forEach((s) => {
        if (!perContinent[s.place.continent]) perContinent[s.place.continent] = s;
      });
      return { items: farthest(Object.keys(perContinent).map((k) => perContinent[k])).slice(0, 3) };
    }
    return { items: farthest(scored).slice(0, 3) };
  }

  /** What's Next: mode buttons and clickable result cards. */
  function bindNext() {
    const wrap = $('nextResults');
    const buttons = document.querySelectorAll('.next-buttons button');
    Array.prototype.forEach.call(buttons, (btn) => {
      btn.addEventListener('click', () => {
        Array.prototype.forEach.call(buttons, (b) => {
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
  function bindReset() {
    $('resetBtn').addEventListener('click', () => {
      if (!confirm('Erase all your UNSEEN data? This can’t be undone.')) return;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        /* storage unavailable: nothing to erase */
      }
      location.reload();
    });
  }

  /** Fades sections in as they scroll into view; shows everything at once on browsers without IntersectionObserver. */
  function setupReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(els, (el) => {
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
    Array.prototype.forEach.call(els, (el) => {
      obs.observe(el);
    });
  }

  /* ============================================================================
     POINTER EFFECTS
     ============================================================================ */

  /** Surfaces that a light follows across (see "Surfaces and light" in the stylesheet). */
  const LIGHT_SELECTOR = '.stat, .memory-card, .next-card, .surprise-card, .map-container, .unseen-section';
  /** Cards that also lean towards the mouse in 3D. */
  const TILT_SELECTOR = '.surprise-card';
  /** Buttons that lean a few pixels towards the cursor. */
  const MAGNET_SELECTOR = '.btn-primary, .btn-gold';

  /**
   * Pointer effects, for mouse users only: on touch screens there is no hover,
   * and the effects would only get in the way. A single listener for the whole
   * page; on each animation frame it finds the surface, tilting card and button
   * under the pointer and writes the pointer's position into their CSS
   * variables:
   *  - --px / --py: where the light is drawn;
   *  - --rx / --ry: the tilt, a few degrees at most;
   *  - --mx / --my: the pull on a button.
   * When the pointer leaves an element its variables are removed and CSS eases
   * it back. Tilt and pull are skipped with reduced motion.
   */
  function setupPointerEffects() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const still = prefersReducedMotion();
    let last = null,
      queued = false,
      tilted = null,
      pulled = null;

    function clear(el, a, b) {
      if (el) {
        el.style.removeProperty(a);
        el.style.removeProperty(b);
      }
    }

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

  /* ============================================================================
     INIT
     ============================================================================ */

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
    state = loadState();
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/*
   Service worker: makes the app installable and lets it open offline once it
   has been visited. Only registered over http(s) — browsers don't allow
   service workers on file:// pages, where the app still works normally.
*/
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      /* offline mode unavailable; the app still works online */
    });
  });
}
