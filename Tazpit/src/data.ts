export type ServiceKey = 'all' | 'hotels' | 'zimmer' | 'attractions' | 'dining';
export type PeriodKey = 'annual' | 'summer' | 'winter' | 'holidays';
export type MetricKey = 'potential' | 'gap' | 'visitors' | 'revenue';
export type SiteType = 'nature' | 'heritage' | 'recreation';

export interface AttractionSite {
  id: string;
  name: string;
  latlng: [number, number];
  type: SiteType;
  israelis: number;
  tourists: number;
  // Monthly visitor totals — Hebrew month names from the Excel source
  monthly: Record<string, number>;
}

export interface Settlement {
  name: string;
  latlng: [number, number];
  major?: boolean;
}

// ─── Geographic region polygon ────────────────────────────────────────────────
// Clockwise [lat, lng].
// Northern cap corrected to stay inside Israel — Lebanon border runs at
// ~33.270°N near 35.53°E and ~33.282°N near Metula (35.58°E).
export const GALILEE_POLYGON: [number, number][] = [
  [33.258, 35.532],  // NW — near Manara/Kfar Giladi, south of Lebanon border
  [33.276, 35.578],  // N — just inside Israel, south of Metula border (~33.282°N)
  [33.268, 35.718],  // NE — Israeli-controlled Golan (Banias/Nimrod area)
  [33.220, 35.722],
  [33.175, 35.650],
  [33.046, 35.625],
  [32.918, 35.652],  // SE — חד נס
  [32.908, 35.520],
  [32.905, 35.432],  // SW — אמירים
  [32.975, 35.418],
  [33.022, 35.385],  // W — west of צבעון
  [33.078, 35.408],
  [33.128, 35.405],
  [33.248, 35.520],  // מנרה area
  [33.258, 35.532],
];

// ─── Real visitor data from רשות הטבע והגנים 2025 ────────────────────────────
// Source: ביקורים-באתרי-רשות-הטבע-והגנים-2025.xlsx, Northern District
// Coordinates verified via latitude.to, Israel Parks Authority, Wikipedia (April 2026)
export const ATTRACTION_SITES: AttractionSite[] = [
  {
    // Verified: latitude.to → 33.2422, 35.6825
    id: 'banias', name: 'בניאס', latlng: [33.242, 35.683], type: 'nature',
    israelis: 278121, tourists: 23119,
    monthly: { ינואר: 23903, פברואר: 18198, מרץ: 25137, אפריל: 43468, מאי: 41945, יוני: 16183, יולי: 17538, אוגוסט: 18481, ספטמבר: 14019, אוקטובר: 34519, נובמבר: 27123, דצמבר: 20312 },
  },
  {
    // Verified: 33°14'43"N 35°39'5"E → 33.2485, 35.6514
    id: 'tel-dan', name: 'תל דן', latlng: [33.248, 35.651], type: 'nature',
    israelis: 171462, tourists: 11637,
    monthly: { ינואר: 6452, פברואר: 3737, מרץ: 11087, אפריל: 26217, מאי: 26201, יוני: 11754, יולי: 17498, אוגוסט: 28237, ספטמבר: 11077, אוקטובר: 21343, נובמבר: 11221, דצמבר: 7087 },
  },
  {
    // Hermon Stream / Snir — near Hagoshrim, Hula Valley
    id: 'snir', name: 'נחל שניר', latlng: [33.236, 35.621], type: 'nature',
    israelis: 187202, tourists: 50,
    monthly: { ינואר: 2736, פברואר: 1411, מרץ: 5754, אפריל: 17124, מאי: 25481, יוני: 14758, יולי: 33723, אוגוסט: 45606, ספטמבר: 11070, אוקטובר: 19843, נובמבר: 7668, דצמבר: 2082 },
  },
  {
    // Verified: 33°13'8"N 35°37'27"E → 33.2189, 35.6243
    id: 'horshat-tal', name: 'חורשת טל', latlng: [33.219, 35.624], type: 'recreation',
    israelis: 165038, tourists: 143,
    monthly: { ינואר: 437, פברואר: 1722, מרץ: 2905, אפריל: 12866, מאי: 16874, יוני: 18060, יולי: 33346, אוגוסט: 47562, ספטמבר: 12047, אוקטובר: 15342, נובמבר: 3736, דצמבר: 378 },
  },
  {
    // Verified: latitude.to → 33.2517, 35.7088
    id: 'nimrod', name: 'מבצר נמרוד', latlng: [33.252, 35.709], type: 'heritage',
    israelis: 45449, tourists: 883,
    monthly: { ינואר: 3413, פברואר: 4127, מרץ: 4644, אפריל: 6622, מאי: 4603, יוני: 1484, יולי: 1934, אוגוסט: 4165, ספטמבר: 2196, אוקטובר: 5800, נובמבר: 3354, דצמבר: 3986 },
  },
  {
    // Iyon / Ayoun Stream — south entrance on Rte 90 near Metula, safely inside Israel
    id: 'nahal-ayoun', name: 'נחל עיון', latlng: [33.252, 35.568], type: 'nature',
    israelis: 50891, tourists: 52,
    monthly: { ינואר: 2738, פברואר: 3343, מרץ: 3214, אפריל: 9392, מאי: 3777, יוני: 1743, יולי: 2642, אוגוסט: 6618, ספטמבר: 2580, אוקטובר: 6833, נובמבר: 3171, דצמבר: 4892 },
  },
  {
    // Agmon HaHula bird reserve, Hula Valley
    id: 'hula', name: 'אגמון החולה', latlng: [33.100, 35.612], type: 'nature',
    israelis: 81343, tourists: 622,
    monthly: { ינואר: 6490, פברואר: 3971, מרץ: 8166, אפריל: 11509, מאי: 5608, יוני: 1225, יולי: 1664, אוגוסט: 3738, ספטמבר: 2897, אוקטובר: 12810, נובמבר: 16113, דצמבר: 7874 },
  },
  {
    // Bar'am National Park — Upper Galilee, ~3km from Lebanon border
    id: 'baram', name: 'ברעם', latlng: [33.076, 35.434], type: 'heritage',
    israelis: 20050, tourists: 144,
    monthly: { ינואר: 863, פברואר: 672, מרץ: 1639, אפריל: 3650, מאי: 2537, יוני: 788, יולי: 1013, אוגוסט: 1688, ספטמבר: 1426, אוקטובר: 2354, נובמבר: 2208, דצמבר: 1356 },
  },
  {
    // Tel Hazor UNESCO site, Hula Valley
    id: 'tel-hazor', name: 'תל חצור', latlng: [33.018, 35.569], type: 'heritage',
    israelis: 11855, tourists: 1497,
    monthly: { ינואר: 1018, פברואר: 775, מרץ: 1208, אפריל: 2002, מאי: 974, יוני: 440, יולי: 635, אוגוסט: 1579, ספטמבר: 720, אוקטובר: 1585, נובמבר: 1411, דצמבר: 1005 },
  },
  {
    // Nahal Amud gorge — between Mount Meron and Sea of Galilee
    id: 'nahal-amud', name: 'נחל עמוד', latlng: [32.973, 35.462], type: 'nature',
    israelis: 119869, tourists: 669,
    monthly: { ינואר: 4116, פברואר: 3253, מרץ: 10469, אפריל: 15713, מאי: 19365, יוני: 6379, יולי: 13167, אוגוסט: 8970, ספטמבר: 11211, אוקטובר: 14228, נובמבר: 11082, דצמבר: 2162 },
  },
  {
    // Gamla — central Golan Heights, ~20km S of Katzrin
    id: 'gamla', name: 'גמלא', latlng: [32.902, 35.749], type: 'nature',
    israelis: 80850, tourists: 1847,
    monthly: { ינואר: 9008, פברואר: 7910, מרץ: 10515, אפריל: 14587, מאי: 6690, יוני: 2564, יולי: 1451, אוגוסט: 3033, ספטמבר: 1891, אוקטובר: 7824, נובמבר: 6610, דצמבר: 10406 },
  },
  {
    // Yehudiya Forest, Golan Heights
    id: 'yehudiya', name: 'יהודיה', latlng: [32.938, 35.704], type: 'nature',
    israelis: 87644, tourists: 341,
    monthly: { ינואר: 1819, פברואר: 1205, מרץ: 4838, אפריל: 14664, מאי: 9629, יוני: 4422, יולי: 12040, אוגוסט: 13712, ספטמבר: 6039, אוקטובר: 14483, נובמבר: 3660, דצמבר: 1303 },
  },
  {
    // Meshushim / Hexagon Pool — Yehudiya Reserve, Golan
    id: 'meshushim', name: 'משושים', latlng: [32.915, 35.790], type: 'nature',
    israelis: 22582, tourists: 73,
    monthly: { ינואר: 1258, פברואר: 1095, מרץ: 2278, אפריל: 4615, מאי: 2090, יוני: 731, יולי: 1684, אוגוסט: 2948, ספטמבר: 1229, אוקטובר: 2787, נובמבר: 989, דצמבר: 951 },
  },
  {
    // Betiha (הבטיחה) — Jordan River estuary into northern Sea of Galilee, Golan
    id: 'habt-iha', name: 'הבטיחה', latlng: [32.907, 35.637], type: 'recreation',
    israelis: 130386, tourists: 2014,
    monthly: { ינואר: 1134, פברואר: 573, מרץ: 5082, אפריל: 17064, מאי: 34606, יוני: 5626, יולי: 30592, אוגוסט: 27099, ספטמבר: 2695, אוקטובר: 4912, נובמבר: 1902, דצמבר: 889 },
  },
  {
    // Verified: Sussita/Hippos on plateau above eastern Sea of Galilee → 32.7790, 35.6597
    id: 'sussita', name: 'סוסיתא', latlng: [32.779, 35.660], type: 'heritage',
    israelis: 28395, tourists: 1662,
    monthly: { ינואר: 3072, פברואר: 3102, מרץ: 4007, אפריל: 4950, מאי: 2421, יוני: 724, יולי: 640, אוגוסט: 535, ספטמבר: 1094, אוקטובר: 4105, נובמבר: 2472, דצמבר: 2349 },
  },
  {
    // Kursi Byzantine monastery, eastern Sea of Galilee shore
    id: 'kursi', name: 'כורסי', latlng: [32.826, 35.650], type: 'heritage',
    israelis: 8045, tourists: 6683,
    monthly: { ינואר: 1082, פברואר: 1294, מרץ: 1658, אפריל: 1753, מאי: 1618, יוני: 552, יולי: 364, אוגוסט: 371, ספטמבר: 1012, אוקטובר: 1749, נובמבר: 1923, דצמבר: 1352 },
  },
  {
    // Korazim — north of Sea of Galilee, ancient Jewish town ruins
    id: 'korazim', name: 'כורזים', latlng: [32.912, 35.565], type: 'heritage',
    israelis: 16696, tourists: 6880,
    monthly: { ינואר: 1295, פברואר: 1573, מרץ: 2575, אפריל: 3820, מאי: 2148, יוני: 898, יולי: 757, אוגוסט: 1162, ספטמבר: 1452, אוקטובר: 2626, נובמבר: 3134, דצמבר: 2018 },
  },
];

// ─── 30 settlements (user-supplied geographic data) ───────────────────────────
export const SETTLEMENTS: Settlement[] = [
  { name: 'קריית שמונה',   latlng: [33.207, 35.572], major: true  },
  { name: 'מטולה',         latlng: [33.281, 35.575], major: true  },
  { name: 'יסוד המעלה',   latlng: [33.049, 35.607], major: true  },
  { name: 'ראש פינה',     latlng: [32.968, 35.542], major: true  },
  { name: 'חצור הגלילית', latlng: [32.979, 35.549], major: true  },
  { name: 'כפר בלום',     latlng: [33.167, 35.605], major: true  },
  { name: 'כפר גלעדי',    latlng: [33.234, 35.576], major: true  },
  { name: 'מנרה',          latlng: [33.240, 35.538], major: true  },
  { name: 'שדה נחמיה',    latlng: [33.189, 35.607] },
  { name: 'עמיר',          latlng: [33.181, 35.617] },
  { name: 'דפנה',          latlng: [33.196, 35.618] },
  { name: 'דן',            latlng: [33.249, 35.652] },
  { name: 'שניר',          latlng: [33.244, 35.661] },
  { name: 'הגושרים',       latlng: [33.223, 35.622] },
  { name: 'יראון',         latlng: [33.076, 35.435] },
  { name: 'מלכיה',         latlng: [33.104, 35.424] },
  { name: 'יפתח',          latlng: [33.102, 35.478] },
  { name: 'משגב עם',       latlng: [33.285, 35.544] },
  { name: 'כפר יובל',     latlng: [33.213, 35.598] },
  { name: 'רמות נפתלי',   latlng: [33.084, 35.489] },
  { name: 'צבעון',         latlng: [33.028, 35.408] },
  { name: 'ברעם',          latlng: [33.080, 35.433] },
  { name: 'עלמה',          latlng: [33.036, 35.468] },
  { name: 'דלתון',         latlng: [33.024, 35.487] },
  { name: 'כרם בן זמרה',  latlng: [33.038, 35.485] },
  { name: 'מירון',         latlng: [32.990, 35.440] },
  { name: 'ספסופה',        latlng: [32.997, 35.457] },
  { name: 'אמירים',        latlng: [32.940, 35.451] },
  { name: 'חד נס',         latlng: [32.932, 35.636] },
  { name: 'אליפלט',        latlng: [32.955, 35.571] },
];

// ─── Period → relevant Hebrew months ─────────────────────────────────────────
export const PERIOD_MONTHS: Record<PeriodKey, string[]> = {
  annual:   [],  // use israelis + tourists total
  summer:   ['יוני', 'יולי', 'אוגוסט'],
  winter:   ['ינואר', 'פברואר', 'דצמבר'],
  holidays: ['מרץ', 'אפריל', 'ספטמבר', 'אוקטובר'], // Passover + Sukkot/Rosh Hashana
};

// How strongly each site type relates to each service type
const TYPE_SERVICE_MULT: Record<SiteType, Record<ServiceKey, number>> = {
  nature:    { all: 1.0, attractions: 1.0, zimmer: 0.85, dining: 0.45, hotels: 0.30 },
  heritage:  { all: 1.0, attractions: 0.90, zimmer: 0.45, dining: 0.35, hotels: 0.40 },
  recreation:{ all: 1.0, attractions: 0.80, zimmer: 0.95, dining: 0.70, hotels: 0.35 },
};

// ─── Visitor count for a given period ────────────────────────────────────────
export function getSiteVisitors(site: AttractionSite, period: PeriodKey): number {
  if (period === 'annual') return site.israelis + site.tourists;
  return PERIOD_MONTHS[period].reduce((sum, m) => sum + (site.monthly[m] ?? 0), 0);
}

function getPeriodMax(period: PeriodKey): number {
  return Math.max(...ATTRACTION_SITES.map(s => getSiteVisitors(s, period)));
}

// ─── Normalized 0–1 value for a site given all filters ───────────────────────
export function getSiteValue(
  site: AttractionSite, service: ServiceKey, period: PeriodKey, metric: MetricKey
): number {
  const visitors = getSiteVisitors(site, period);
  const max = getPeriodMax(period);
  const normalizedVisitors = visitors / max;
  const serviceMult = TYPE_SERVICE_MULT[site.type][service];
  let value = normalizedVisitors * serviceMult;

  if (metric === 'revenue') {
    // Sites with higher tourist share earn disproportionately more
    const touristRatio = site.tourists / (site.israelis + site.tourists + 1);
    value = Math.min(value * (1 + touristRatio), 1);
  } else if (metric === 'gap') {
    value = 1 - value;
  }

  return Math.max(0, Math.min(1, value));
}

// ─── IDW interpolation over the map ──────────────────────────────────────────
export function interpolateValue(
  lat: number, lng: number,
  service: ServiceKey, period: PeriodKey, metric: MetricKey
): number {
  let num = 0, den = 0;
  for (const site of ATTRACTION_SITES) {
    const dlat = lat - site.latlng[0];
    const dlng = lng - site.latlng[1];
    const dist2 = dlat * dlat + dlng * dlng;
    if (dist2 < 1e-10) return getSiteValue(site, service, period, metric);
    const w = 1 / (dist2 * dist2); // power-4 IDW for sharper zones
    num += w * getSiteValue(site, service, period, metric);
    den += w;
  }
  return num / den;
}

// ─── Red → Yellow → Green color ramp ─────────────────────────────────────────
export function valueToRgb(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  if (t < 0.5) {
    const s = t / 0.5;
    return [Math.round(220 + 35 * s), Math.round(50 + 165 * s), Math.round(50 - 30 * s)];
  } else {
    const s = (t - 0.5) / 0.5;
    return [Math.round(255 - 220 * s), Math.round(215 - 15 * s), Math.round(20 + 60 * s)];
  }
}
