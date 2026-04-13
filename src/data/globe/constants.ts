// Continental boundaries based on geographic regions
export const CONTINENT_BOUNDS = {
  northAmerica: { minLat: 7, maxLat: 84, minLng: -180, maxLng: -30 },
  southAmerica: { minLat: -60, maxLat: 15, minLng: -85, maxLng: -30 },
  europe: { minLat: 35, maxLat: 75, minLng: -25, maxLng: 45 },
  africa: { minLat: -40, maxLat: 40, minLng: -20, maxLng: 55 },
  asia: { minLat: -15, maxLat: 80, minLng: 25, maxLng: 180 },
  oceania: { minLat: -50, maxLat: -5, minLng: 110, maxLng: 180 }
}

// Continent colors - inspired by Horizon Tech logo (orange to purple gradient)
export const CONTINENT_COLORS = {
  northAmerica: '#ff6b35', // vibrant orange
  southAmerica: '#f97316', // deep orange
  europe: '#ec4899', // hot pink
  africa: '#f59e0b', // amber
  asia: '#a855f7', // purple
  oceania: '#8b5cf6' // violet
}

// ISO 3166-1 numeric country code → continent mapping
// Used by fills to correctly classify countries (bounding boxes can't handle overlaps)
export const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // ─── North America ───
  '124': 'northAmerica', // Canada
  '840': 'northAmerica', // United States
  '484': 'northAmerica', // Mexico
  '192': 'northAmerica', // Cuba
  '332': 'northAmerica', // Haiti
  '214': 'northAmerica', // Dominican Republic
  '388': 'northAmerica', // Jamaica
  '044': 'northAmerica', // Bahamas
  '340': 'northAmerica', // Honduras
  '320': 'northAmerica', // Guatemala
  '222': 'northAmerica', // El Salvador
  '558': 'northAmerica', // Nicaragua
  '188': 'northAmerica', // Costa Rica
  '591': 'northAmerica', // Panama
  '780': 'northAmerica', // Trinidad and Tobago
  '084': 'northAmerica', // Belize
  '304': 'northAmerica', // Greenland
  '630': 'northAmerica', // Puerto Rico
  // ─── South America ───
  '076': 'southAmerica', // Brazil
  '032': 'southAmerica', // Argentina
  '152': 'southAmerica', // Chile
  '170': 'southAmerica', // Colombia
  '604': 'southAmerica', // Peru
  '862': 'southAmerica', // Venezuela
  '218': 'southAmerica', // Ecuador
  '068': 'southAmerica', // Bolivia
  '600': 'southAmerica', // Paraguay
  '858': 'southAmerica', // Uruguay
  '328': 'southAmerica', // Guyana
  '740': 'southAmerica', // Suriname
  '254': 'southAmerica', // French Guiana
  '238': 'southAmerica', // Falkland Islands
  // ─── Europe ───
  '826': 'europe', // United Kingdom
  '250': 'europe', // France
  '276': 'europe', // Germany
  '380': 'europe', // Italy
  '724': 'europe', // Spain
  '620': 'europe', // Portugal
  '528': 'europe', // Netherlands
  '056': 'europe', // Belgium
  '756': 'europe', // Switzerland
  '040': 'europe', // Austria
  '616': 'europe', // Poland
  '203': 'europe', // Czech Republic
  '703': 'europe', // Slovakia
  '348': 'europe', // Hungary
  '642': 'europe', // Romania
  '100': 'europe', // Bulgaria
  '300': 'europe', // Greece
  '752': 'europe', // Sweden
  '578': 'europe', // Norway
  '246': 'europe', // Finland
  '208': 'europe', // Denmark
  '352': 'europe', // Iceland
  '372': 'europe', // Ireland
  '440': 'europe', // Lithuania
  '428': 'europe', // Latvia
  '233': 'europe', // Estonia
  '804': 'europe', // Ukraine
  '112': 'europe', // Belarus
  '498': 'europe', // Moldova
  '688': 'europe', // Serbia
  '191': 'europe', // Croatia
  '070': 'europe', // Bosnia
  '499': 'europe', // Montenegro
  '807': 'europe', // North Macedonia
  '008': 'europe', // Albania
  '470': 'europe', // Malta
  '442': 'europe', // Luxembourg
  '196': 'europe', // Cyprus
  '643': 'europe', // Russia → Europe (visually looks better)
  // ─── Africa ───
  '012': 'africa', // Algeria
  '024': 'africa', // Angola
  '204': 'africa', // Benin
  '072': 'africa', // Botswana
  '854': 'africa', // Burkina Faso
  '108': 'africa', // Burundi
  '120': 'africa', // Cameroon
  '132': 'africa', // Cape Verde
  '140': 'africa', // Central African Republic
  '148': 'africa', // Chad
  '174': 'africa', // Comoros
  '178': 'africa', // Congo
  '180': 'africa', // DR Congo
  '384': 'africa', // Côte d'Ivoire
  '262': 'africa', // Djibouti
  '818': 'africa', // Egypt
  '226': 'africa', // Equatorial Guinea
  '232': 'africa', // Eritrea
  '748': 'africa', // Eswatini
  '231': 'africa', // Ethiopia
  '266': 'africa', // Gabon
  '270': 'africa', // Gambia
  '288': 'africa', // Ghana
  '324': 'africa', // Guinea
  '624': 'africa', // Guinea-Bissau
  '404': 'africa', // Kenya
  '426': 'africa', // Lesotho
  '430': 'africa', // Liberia
  '434': 'africa', // Libya
  '450': 'africa', // Madagascar
  '454': 'africa', // Malawi
  '466': 'africa', // Mali
  '478': 'africa', // Mauritania
  '480': 'africa', // Mauritius
  '504': 'africa', // Morocco
  '508': 'africa', // Mozambique
  '516': 'africa', // Namibia
  '562': 'africa', // Niger
  '566': 'africa', // Nigeria
  '646': 'africa', // Rwanda
  '678': 'africa', // São Tomé
  '686': 'africa', // Senegal
  '694': 'africa', // Sierra Leone
  '706': 'africa', // Somalia
  '710': 'africa', // South Africa
  '728': 'africa', // South Sudan
  '729': 'africa', // Sudan
  '834': 'africa', // Tanzania
  '768': 'africa', // Togo
  '788': 'africa', // Tunisia
  '800': 'africa', // Uganda
  '732': 'africa', // Western Sahara
  '894': 'africa', // Zambia
  '716': 'africa', // Zimbabwe
  // ─── Asia ───
  '004': 'asia', // Afghanistan
  '051': 'asia', // Armenia
  '031': 'asia', // Azerbaijan
  '048': 'asia', // Bahrain
  '050': 'asia', // Bangladesh
  '064': 'asia', // Bhutan
  '096': 'asia', // Brunei
  '104': 'asia', // Myanmar
  '116': 'asia', // Cambodia
  '156': 'asia', // China
  '268': 'asia', // Georgia
  '356': 'asia', // India
  '360': 'asia', // Indonesia
  '364': 'asia', // Iran
  '368': 'asia', // Iraq
  '376': 'asia', // Israel
  '392': 'asia', // Japan
  '400': 'asia', // Jordan
  '398': 'asia', // Kazakhstan
  '414': 'asia', // Kuwait
  '417': 'asia', // Kyrgyzstan
  '418': 'asia', // Laos
  '422': 'asia', // Lebanon
  '458': 'asia', // Malaysia
  '496': 'asia', // Mongolia
  '524': 'asia', // Nepal
  '408': 'asia', // North Korea
  '512': 'asia', // Oman
  '586': 'asia', // Pakistan
  '275': 'asia', // Palestine
  '608': 'asia', // Philippines
  '634': 'asia', // Qatar
  '682': 'asia', // Saudi Arabia
  '702': 'asia', // Singapore
  '410': 'asia', // South Korea
  '144': 'asia', // Sri Lanka
  '760': 'asia', // Syria
  '158': 'asia', // Taiwan
  '762': 'asia', // Tajikistan
  '764': 'asia', // Thailand
  '626': 'asia', // Timor-Leste
  '792': 'asia', // Turkey
  '795': 'asia', // Turkmenistan
  '784': 'asia', // UAE
  '860': 'asia', // Uzbekistan
  '704': 'asia', // Vietnam
  '887': 'asia', // Yemen
  // ─── Oceania ───
  '036': 'oceania', // Australia
  '554': 'oceania', // New Zealand
  '598': 'oceania', // Papua New Guinea
  '242': 'oceania', // Fiji
  '090': 'oceania', // Solomon Islands
  '548': 'oceania', // Vanuatu
  '540': 'oceania', // New Caledonia
}

// Default globe rendering radii
export const GLOBE_RADII = {
  base: 2,
  coastlines: 2.005,
  fills: 2.008,
  borders: 2.012,
  markers: 2.015,
  connections: 2.02
} as const
