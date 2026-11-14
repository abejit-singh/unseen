/**
 * Data tables and constants: continents, the countries on the map, the
 * territories, the small states drawn as dots, alternative names, limits.
 */

/** Human-readable continent names, keyed by the short ids used everywhere else. */
export const CONTINENT_LABELS = {
  africa: 'Africa',
  europe: 'Europe',
  asia: 'Asia',
  namerica: 'North America',
  samerica: 'South America',
  oceania: 'Oceania',
  antarctica: 'Antarctica'
};

/** Display order for continent pills and progress bars. */
export const CONTINENT_ORDER = ['europe', 'asia', 'africa', 'namerica', 'samerica', 'oceania', 'antarctica'];

/**
 * Rough geographic window for each continent, as [[west, south], [east, north]]
 * in degrees. Used to zoom the map when a continent filter is chosen. These
 * are hand-tuned boxes rather than the bounds of the countries themselves,
 * because real bounds are misleading: France includes French Guiana (so
 * "Europe" would stretch to South America) and Russia spans to the Pacific.
 */
// prettier-ignore
export const CONTINENT_VIEWS = {
  europe: [[-25, 34], [45, 71]], asia: [[25, -11], [150, 56]], africa: [[-20, -36], [55, 38]],
  namerica: [[-170, 7], [-50, 75]], samerica: [[-85, -56], [-33, 13]], oceania: [[110, -48], [180, 2]],
  antarctica: [[-180, -90], [180, -58]]
};

/**
 * Every shape in the world-atlas 1:110m file: [atlas name, continent, ISO 3166-1 alpha-2].
 * The atlas name is used as the storage key, so it must match the data file
 * exactly (see NAME_ALIASES for alternative spellings). The ISO code is only
 * used to build a flag emoji; an empty code falls back to a globe.
 */
// prettier-ignore
export const MAP_PLACES = [
  ['Fiji', 'oceania', 'FJ'], ['Tanzania', 'africa', 'TZ'], ['W. Sahara', 'africa', 'EH'],
  ['Canada', 'namerica', 'CA'], ['United States of America', 'namerica', 'US'],
  ['Kazakhstan', 'asia', 'KZ'], ['Uzbekistan', 'asia', 'UZ'], ['Papua New Guinea', 'oceania', 'PG'],
  ['Indonesia', 'asia', 'ID'], ['Argentina', 'samerica', 'AR'], ['Chile', 'samerica', 'CL'],
  ['Dem. Rep. Congo', 'africa', 'CD'], ['Somalia', 'africa', 'SO'], ['Kenya', 'africa', 'KE'],
  ['Sudan', 'africa', 'SD'], ['Chad', 'africa', 'TD'], ['Haiti', 'namerica', 'HT'],
  ['Dominican Rep.', 'namerica', 'DO'], ['Russia', 'europe', 'RU'], ['Bahamas', 'namerica', 'BS'],
  ['Falkland Is.', 'samerica', 'FK'], ['Norway', 'europe', 'NO'], ['Greenland', 'namerica', 'GL'],
  ['Fr. S. Antarctic Lands', 'antarctica', 'TF'], ['Timor-Leste', 'asia', 'TL'],
  ['South Africa', 'africa', 'ZA'], ['Lesotho', 'africa', 'LS'], ['Mexico', 'namerica', 'MX'],
  ['Uruguay', 'samerica', 'UY'], ['Brazil', 'samerica', 'BR'], ['Bolivia', 'samerica', 'BO'],
  ['Peru', 'samerica', 'PE'], ['Colombia', 'samerica', 'CO'], ['Panama', 'namerica', 'PA'],
  ['Costa Rica', 'namerica', 'CR'], ['Nicaragua', 'namerica', 'NI'], ['Honduras', 'namerica', 'HN'],
  ['El Salvador', 'namerica', 'SV'], ['Guatemala', 'namerica', 'GT'], ['Belize', 'namerica', 'BZ'],
  ['Venezuela', 'samerica', 'VE'], ['Guyana', 'samerica', 'GY'], ['Suriname', 'samerica', 'SR'],
  ['France', 'europe', 'FR'], ['Ecuador', 'samerica', 'EC'], ['Puerto Rico', 'namerica', 'PR'],
  ['Jamaica', 'namerica', 'JM'], ['Cuba', 'namerica', 'CU'], ['Zimbabwe', 'africa', 'ZW'],
  ['Botswana', 'africa', 'BW'], ['Namibia', 'africa', 'NA'], ['Senegal', 'africa', 'SN'],
  ['Mali', 'africa', 'ML'], ['Mauritania', 'africa', 'MR'], ['Benin', 'africa', 'BJ'],
  ['Niger', 'africa', 'NE'], ['Nigeria', 'africa', 'NG'], ['Cameroon', 'africa', 'CM'],
  ['Togo', 'africa', 'TG'], ['Ghana', 'africa', 'GH'], ["Côte d'Ivoire", 'africa', 'CI'],
  ['Guinea', 'africa', 'GN'], ['Guinea-Bissau', 'africa', 'GW'], ['Liberia', 'africa', 'LR'],
  ['Sierra Leone', 'africa', 'SL'], ['Burkina Faso', 'africa', 'BF'],
  ['Central African Rep.', 'africa', 'CF'], ['Congo', 'africa', 'CG'], ['Gabon', 'africa', 'GA'],
  ['Eq. Guinea', 'africa', 'GQ'], ['Zambia', 'africa', 'ZM'], ['Malawi', 'africa', 'MW'],
  ['Mozambique', 'africa', 'MZ'], ['eSwatini', 'africa', 'SZ'], ['Angola', 'africa', 'AO'],
  ['Burundi', 'africa', 'BI'], ['Israel', 'asia', 'IL'], ['Lebanon', 'asia', 'LB'],
  ['Madagascar', 'africa', 'MG'], ['Palestine', 'asia', 'PS'], ['Gambia', 'africa', 'GM'],
  ['Tunisia', 'africa', 'TN'], ['Algeria', 'africa', 'DZ'], ['Jordan', 'asia', 'JO'],
  ['United Arab Emirates', 'asia', 'AE'], ['Qatar', 'asia', 'QA'], ['Kuwait', 'asia', 'KW'],
  ['Iraq', 'asia', 'IQ'], ['Oman', 'asia', 'OM'], ['Vanuatu', 'oceania', 'VU'], ['Cambodia', 'asia', 'KH'],
  ['Thailand', 'asia', 'TH'], ['Laos', 'asia', 'LA'], ['Myanmar', 'asia', 'MM'], ['Vietnam', 'asia', 'VN'],
  ['North Korea', 'asia', 'KP'], ['South Korea', 'asia', 'KR'], ['Mongolia', 'asia', 'MN'],
  ['India', 'asia', 'IN'], ['Bangladesh', 'asia', 'BD'], ['Bhutan', 'asia', 'BT'], ['Nepal', 'asia', 'NP'],
  ['Pakistan', 'asia', 'PK'], ['Afghanistan', 'asia', 'AF'], ['Tajikistan', 'asia', 'TJ'],
  ['Kyrgyzstan', 'asia', 'KG'], ['Turkmenistan', 'asia', 'TM'], ['Iran', 'asia', 'IR'],
  ['Syria', 'asia', 'SY'], ['Armenia', 'asia', 'AM'], ['Sweden', 'europe', 'SE'],
  ['Belarus', 'europe', 'BY'], ['Ukraine', 'europe', 'UA'], ['Poland', 'europe', 'PL'],
  ['Austria', 'europe', 'AT'], ['Hungary', 'europe', 'HU'], ['Moldova', 'europe', 'MD'],
  ['Romania', 'europe', 'RO'], ['Lithuania', 'europe', 'LT'], ['Latvia', 'europe', 'LV'],
  ['Estonia', 'europe', 'EE'], ['Germany', 'europe', 'DE'], ['Bulgaria', 'europe', 'BG'],
  ['Greece', 'europe', 'GR'], ['Turkey', 'asia', 'TR'], ['Albania', 'europe', 'AL'],
  ['Croatia', 'europe', 'HR'], ['Switzerland', 'europe', 'CH'], ['Luxembourg', 'europe', 'LU'],
  ['Belgium', 'europe', 'BE'], ['Netherlands', 'europe', 'NL'], ['Portugal', 'europe', 'PT'],
  ['Spain', 'europe', 'ES'], ['Ireland', 'europe', 'IE'], ['New Caledonia', 'oceania', 'NC'],
  ['Solomon Is.', 'oceania', 'SB'], ['New Zealand', 'oceania', 'NZ'], ['Australia', 'oceania', 'AU'],
  ['Sri Lanka', 'asia', 'LK'], ['China', 'asia', 'CN'], ['Taiwan', 'asia', 'TW'], ['Italy', 'europe', 'IT'],
  ['Denmark', 'europe', 'DK'], ['United Kingdom', 'europe', 'GB'], ['Iceland', 'europe', 'IS'],
  ['Azerbaijan', 'asia', 'AZ'], ['Georgia', 'asia', 'GE'], ['Philippines', 'asia', 'PH'],
  ['Malaysia', 'asia', 'MY'], ['Brunei', 'asia', 'BN'], ['Slovenia', 'europe', 'SI'],
  ['Finland', 'europe', 'FI'], ['Slovakia', 'europe', 'SK'], ['Czechia', 'europe', 'CZ'],
  ['Eritrea', 'africa', 'ER'], ['Japan', 'asia', 'JP'], ['Paraguay', 'samerica', 'PY'],
  ['Yemen', 'asia', 'YE'], ['Saudi Arabia', 'asia', 'SA'], ['Antarctica', 'antarctica', 'AQ'],
  ['N. Cyprus', 'europe', ''], ['Cyprus', 'europe', 'CY'], ['Morocco', 'africa', 'MA'],
  ['Egypt', 'africa', 'EG'], ['Libya', 'africa', 'LY'], ['Ethiopia', 'africa', 'ET'],
  ['Djibouti', 'africa', 'DJ'], ['Somaliland', 'africa', ''], ['Uganda', 'africa', 'UG'],
  ['Rwanda', 'africa', 'RW'], ['Bosnia and Herz.', 'europe', 'BA'], ['Macedonia', 'europe', 'MK'],
  ['Serbia', 'europe', 'RS'], ['Montenegro', 'europe', 'ME'], ['Kosovo', 'europe', 'XK'],
  ['Trinidad and Tobago', 'namerica', 'TT'], ['S. Sudan', 'africa', 'SS']
];

/**
 * Shapes on the map that are not among the 195 countries: dependent
 * territories, Antarctica, and areas whose status is disputed. They can be
 * marked visited like anything else, but are left out of the headline count.
 * The wording shown to users is deliberately neutral.
 */
export const TERRITORIES = [
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
// prettier-ignore
export const MICROSTATES = [
  ['Andorra', 'europe', 'AD', 1.52, 42.51], ['Liechtenstein', 'europe', 'LI', 9.55, 47.16],
  ['Malta', 'europe', 'MT', 14.38, 35.94], ['Monaco', 'europe', 'MC', 7.42, 43.74],
  ['San Marino', 'europe', 'SM', 12.46, 43.94], ['Vatican City', 'europe', 'VA', 12.45, 41.9],
  ['Bahrain', 'asia', 'BH', 50.55, 26.07], ['Maldives', 'asia', 'MV', 73.51, 4.17],
  ['Singapore', 'asia', 'SG', 103.82, 1.35], ['Cabo Verde', 'africa', 'CV', -23.51, 14.93],
  ['Comoros', 'africa', 'KM', 43.26, -11.7], ['Mauritius', 'africa', 'MU', 57.55, -20.35],
  ['São Tomé and Príncipe', 'africa', 'ST', 6.61, 0.19], ['Seychelles', 'africa', 'SC', 55.49, -4.68],
  ['Antigua and Barbuda', 'namerica', 'AG', -61.85, 17.12], ['Barbados', 'namerica', 'BB', -59.54, 13.19],
  ['Dominica', 'namerica', 'DM', -61.37, 15.41], ['Grenada', 'namerica', 'GD', -61.68, 12.11],
  ['Saint Kitts and Nevis', 'namerica', 'KN', -62.72, 17.3],
  ['Saint Lucia', 'namerica', 'LC', -60.98, 13.91],
  ['Saint Vincent and the Grenadines', 'namerica', 'VC', -61.2, 13.25],
  ['Kiribati', 'oceania', 'KI', 172.98, 1.45], ['Marshall Islands', 'oceania', 'MH', 171.18, 7.11],
  ['Micronesia', 'oceania', 'FM', 158.18, 6.92], ['Nauru', 'oceania', 'NR', 166.93, -0.52],
  ['Palau', 'oceania', 'PW', 134.58, 7.51], ['Samoa', 'oceania', 'WS', -171.76, -13.83],
  ['Tonga', 'oceania', 'TO', -175.2, -21.14], ['Tuvalu', 'oceania', 'TV', 179.2, -8.52]
];

/**
 * Friendlier display names for the atlas's abbreviated ones. The atlas name
 * stays the internal key (so saved data keeps working); only the label changes.
 */
export const DISPLAY_NAMES = {
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
export const NAME_ALIASES = {
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

/** The world shapes: world-atlas 2.0.2 (Natural Earth, 1:110m), kept with the site. */
export const WORLD_ATLAS_URL = 'data/countries-110m.json';

export const QUIPS_UNSEEN = [
  'Maybe this is your next destination.',
  'Still waiting for you.',
  "Nobody's stamped this passport page yet.",
  'An open page on the map.'
];

/** Limits applied when saving user input, so one runaway field can't fill localStorage. */
export const LIMITS = {
  cityLength: 80,
  cities: 50,
  memory: 1000,
  trips: 999,
  photoMaxPx: 480,
  photoQuality: 0.72
};

export const STORAGE_KEY = 'unseen_state_v1';
