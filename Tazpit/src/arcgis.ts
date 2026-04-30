import { queryFeatures } from '@esri/arcgis-rest-feature-service';
import { NORTH_VISITS_2025 } from './visits2025';

export interface WeightedPoint {
  lat: number;
  lng: number;
  weight: number;
  source: 'hotel' | 'ratag' | 'attraction' | 'visit';
  isNature?: boolean;
  annualVisits?: number;
}

export interface PlaceRecord {
  id: string;
  name: string;
  normalizedName: string;
  lat: number;
  lng: number;
  layer: 'hotel' | 'ratag' | 'attraction';
  isNature: boolean;
  rooms?: number;
  annualVisits?: number;
}

export interface TourismDataset {
  heatPoints: WeightedPoint[];
  hotels: PlaceRecord[];
  ratag: PlaceRecord[];
  attractions: PlaceRecord[];
}

interface GeoJsonFeature {
  type: 'Feature';
  geometry?: {
    type: string;
    coordinates?: number[];
  };
  properties?: Record<string, unknown>;
}

interface GeoJsonCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

const HOTELS_LAYER_URL =
  'https://services7.arcgis.com/TqAIBBIELxtowFsr/arcgis/rest/services/%D7%9E%D7%9C%D7%95%D7%A0%D7%95%D7%AA/FeatureServer/0';
const RATAG_LAYER_URL =
  'https://services2.arcgis.com/Ts12cdrN7SBP9bEa/arcgis/rest/services/%D7%90%D7%AA%D7%A8%D7%99%D7%9D_%D7%A7%D7%95%D7%9C%D7%98%D7%99_%D7%A7%D7%94%D7%9C_%D7%A8%D7%98%D7%92/FeatureServer/0';
const ATTRACTIONS_LAYER_URL =
  'https://services.arcgis.com/b6zSqPB0TQc3mBgU/arcgis/rest/services/%D7%90%D7%98%D7%A8%D7%A7%D7%A6%D7%99%D7%95%D7%AA/FeatureServer/0';

const PAGE_SIZE = 2000;
const ISRAEL_BOUNDS = {
  minLat: 29.3,
  maxLat: 33.5,
  minLng: 34.2,
  maxLng: 35.95,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toNumber(value: unknown): number | null {
  if (isFiniteNumber(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function inIsraelBounds(lat: number, lng: number): boolean {
  return (
    lat >= ISRAEL_BOUNDS.minLat &&
    lat <= ISRAEL_BOUNDS.maxLat &&
    lng >= ISRAEL_BOUNDS.minLng &&
    lng <= ISRAEL_BOUNDS.maxLng
  );
}

function readLatLng(feature: GeoJsonFeature): [number, number] | null {
  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const lng = toNumber(coords[0]);
  const lat = toNumber(coords[1]);
  if (lat === null || lng === null) return null;
  if (!inIsraelBounds(lat, lng)) return null;
  return [lat, lng];
}

async function queryAllFeatures(url: string): Promise<GeoJsonFeature[]> {
  const all: GeoJsonFeature[] = [];
  let offset = 0;

  while (true) {
    const page = (await queryFeatures({
      url,
      where: '1=1',
      outFields: ['*'],
      returnGeometry: true,
      outSR: '4326',
      resultOffset: offset,
      resultRecordCount: PAGE_SIZE,
      f: 'geojson',
    })) as unknown as GeoJsonCollection;

    const features = page.features ?? [];
    all.push(...features);

    if (features.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

function hotelWeight(properties: Record<string, unknown> | undefined): number {
  const rooms = toNumber(properties?.['מספר_חדרים']) ?? 0;
  return 1 + Math.log10(rooms + 1);
}

function isNatureSite(properties: Record<string, unknown> | undefined): boolean {
  const fullName =
    `${String(properties?.RES_GAN_NA ?? '')} ${String(properties?.ATAR_NAME ?? '')} ${String(properties?.Name ?? '')}`.toLowerCase();
  return (
    fullName.includes('שמורת טבע') ||
    fullName.includes('נחל') ||
    fullName.includes('אגמון') ||
    fullName.includes('מעיין') ||
    fullName.includes('גן לאומי') ||
    fullName.includes('טבע')
  );
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/["'`׳״]/g, '')
    .replace(/[()\-_/]/g, ' ')
    .replace(/\b(גן לאומי|שמורת טבע|אתר לאומי|פארק|מגרסה)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueNames(values: string[]): string[] {
  const set = new Set<string>();
  for (const value of values) {
    const normalized = normalizeName(value);
    if (normalized) set.add(normalized);
  }
  return [...set];
}

function geoNameCandidates(properties: Record<string, unknown> | undefined): string[] {
  return uniqueNames([
    String(properties?.ATAR_NAME ?? ''),
    String(properties?.RES_GAN_NA ?? ''),
    String(properties?.Name ?? ''),
    String(properties?.Near_To ?? ''),
    String(properties?.City ?? ''),
  ]);
}

function resolveVisitCount(siteNames: string[], visitMap: Map<string, number>): number | undefined {
  for (const siteName of siteNames) {
    const target = normalizeName(siteName);
    if (!target) continue;
    const exact = visitMap.get(target);
    if (exact !== undefined) return exact;
  }

  for (const siteName of siteNames) {
    const target = normalizeName(siteName);
    if (!target) continue;
    for (const [visitName, total] of visitMap) {
      if (visitName.includes(target) || target.includes(visitName)) {
        return total;
      }
    }
  }

  return undefined;
}

export async function loadTourismPotentialPoints(): Promise<TourismDataset> {
  const [hotels, ratag, attractionsLayer] = await Promise.all([
    queryAllFeatures(HOTELS_LAYER_URL),
    queryAllFeatures(RATAG_LAYER_URL),
    queryAllFeatures(ATTRACTIONS_LAYER_URL),
  ]);

  const heatRaw: WeightedPoint[] = [];
  const hotelRecords: PlaceRecord[] = [];
  const ratagRecords: PlaceRecord[] = [];
  const attractionsRecords: PlaceRecord[] = [];
  const visitMap = new Map(NORTH_VISITS_2025.map((v) => [normalizeName(v.site), v.totalEntries]));
  const maxEntries = Math.max(...NORTH_VISITS_2025.map((v) => v.totalEntries), 1);

  for (const feature of hotels) {
    const latlng = readLatLng(feature);
    if (!latlng) continue;

    const name = String(feature.properties?.['שם_המלון'] ?? 'Hotel');
    const rooms = toNumber(feature.properties?.['מספר_חדרים']) ?? undefined;
    const normalizedName = normalizeName(name);
    const weight = hotelWeight(feature.properties);

    hotelRecords.push({
      id: `hotel-${hotelRecords.length + 1}`,
      name,
      normalizedName,
      lat: latlng[0],
      lng: latlng[1],
      layer: 'hotel',
      isNature: false,
      rooms,
    });

    heatRaw.push({ lat: latlng[0], lng: latlng[1], weight, source: 'hotel' });
  }

  for (const feature of ratag) {
    const latlng = readLatLng(feature);
    if (!latlng) continue;

    const natureSite = isNatureSite(feature.properties);
    const names = geoNameCandidates(feature.properties);
    const annualVisits = resolveVisitCount(names, visitMap);
    const primaryName = String(feature.properties?.ATAR_NAME ?? feature.properties?.RES_GAN_NA ?? 'RATAG site');
    const normalizedName = normalizeName(primaryName);

    ratagRecords.push({
      id: `ratag-${ratagRecords.length + 1}`,
      name: primaryName,
      normalizedName,
      lat: latlng[0],
      lng: latlng[1],
      layer: 'ratag',
      isNature: natureSite,
      annualVisits,
    });

    heatRaw.push({
      lat: latlng[0],
      lng: latlng[1],
      weight: natureSite ? 1.6 : 0.9,
      source: 'ratag',
      isNature: natureSite,
    });

    if (annualVisits !== undefined) {
      const normalizedEntries = Math.log10(annualVisits + 1) / Math.log10(maxEntries + 1);
      heatRaw.push({
        lat: latlng[0],
        lng: latlng[1],
        weight: 1.2 + 2.4 * normalizedEntries,
        source: 'visit',
        annualVisits,
      });
    }
  }

  for (const feature of attractionsLayer) {
    const latlng = readLatLng(feature);
    if (!latlng) continue;
    const region = String(feature.properties?.Region ?? '');
    if (region && region !== 'צפון') continue;

    const natureSite = isNatureSite(feature.properties);
    const names = geoNameCandidates(feature.properties);
    const annualVisits = resolveVisitCount(names, visitMap);
    const primaryName = String(feature.properties?.Name ?? 'Attraction');
    const normalizedName = normalizeName(primaryName);

    attractionsRecords.push({
      id: `attraction-${attractionsRecords.length + 1}`,
      name: primaryName,
      normalizedName,
      lat: latlng[0],
      lng: latlng[1],
      layer: 'attraction',
      isNature: natureSite,
      annualVisits,
    });

    heatRaw.push({
      lat: latlng[0],
      lng: latlng[1],
      weight: natureSite ? 1.1 : 0.7,
      source: 'attraction',
      isNature: natureSite,
    });

    if (annualVisits !== undefined) {
      const normalizedEntries = Math.log10(annualVisits + 1) / Math.log10(maxEntries + 1);
      heatRaw.push({
        lat: latlng[0],
        lng: latlng[1],
        weight: 1.2 + 2.4 * normalizedEntries,
        source: 'visit',
        annualVisits,
      });
    }
  }

  const maxWeight = Math.max(...heatRaw.map((p) => p.weight), 1);
  const heatPoints = heatRaw.map((p) => ({
    ...p,
    weight: Math.max(0.05, p.weight / maxWeight),
  }));

  return {
    heatPoints,
    hotels: hotelRecords,
    ratag: ratagRecords,
    attractions: attractionsRecords,
  };
}
