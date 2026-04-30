import { useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L, { type LatLngBoundsExpression } from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import { loadTourismPotentialPoints, type PlaceRecord, type TourismDataset, type WeightedPoint } from './arcgis';

type HeatLayerFactory = {
  heatLayer: (points: L.HeatLatLngTuple[], options?: L.HeatMapOptions) => L.Layer;
};

const DEFAULT_CENTER: [number, number] = [32.98, 35.47];
const DEFAULT_BOUNDS: LatLngBoundsExpression = [
  [32.6, 34.9],
  [33.35, 35.9],
];

function HeatLayer({ points }: { points: WeightedPoint[] }) {
  const map = useMap();

  useEffect(() => {
    const plugin = L as typeof L & HeatLayerFactory;
    const tuples: L.HeatLatLngTuple[] = points.map((p) => [p.lat, p.lng, p.weight]);
    const layer = plugin.heatLayer(tuples, {
      radius: 28,
      blur: 22,
      maxZoom: 14,
      minOpacity: 0.25,
      gradient: {
        0.1: '#dc2626',
        0.35: '#f97316',
        0.6: '#f59e0b',
        0.85: '#22c55e',
        1.0: '#16a34a',
      },
    });

    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}

function FitToData({ points }: { points: WeightedPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      map.fitBounds(DEFAULT_BOUNDS, { padding: [18, 18] });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [25, 25] });
  }, [map, points]);

  return null;
}

interface ViewState {
  bounds: L.LatLngBounds | null;
  zoom: number;
}

interface Selection {
  lat: number;
  lng: number;
}

interface CoordinateResult {
  lat: number;
  lng: number;
}

interface AreaStats {
  hotels: number;
  attractions: number;
  nature: number;
  yearlyVisits: number;
}

function distanceMeters(a: [number, number], b: [number, number]): number {
  return L.latLng(a[0], a[1]).distanceTo(L.latLng(b[0], b[1]));
}

function computeStats(hotels: PlaceRecord[], ratag: PlaceRecord[], attractions: PlaceRecord[]): AreaStats {
  const visitedBySite = new Map<string, number>();
  for (const place of [...ratag, ...attractions]) {
    if (place.annualVisits !== undefined && !visitedBySite.has(place.normalizedName)) {
      visitedBySite.set(place.normalizedName, place.annualVisits);
    }
  }

  return {
    hotels: hotels.length,
    attractions: ratag.length + attractions.length,
    nature: [...ratag, ...attractions].filter((p) => p.isNature).length,
    yearlyVisits: [...visitedBySite.values()].reduce((sum, value) => sum + value, 0),
  };
}

function MapTracker({
  onViewChange,
  onMapClick,
}: {
  onViewChange: (view: ViewState) => void;
  onMapClick: (selection: Selection) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      onViewChange({ bounds: map.getBounds(), zoom: map.getZoom() });
    },
    zoomend: () => {
      onViewChange({ bounds: map.getBounds(), zoom: map.getZoom() });
    },
    click: (event) => {
      onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng });
      onViewChange({ bounds: map.getBounds(), zoom: map.getZoom() });
    },
  });

  useEffect(() => {
    onViewChange({ bounds: map.getBounds(), zoom: map.getZoom() });
  }, [map, onViewChange]);

  return null;
}

function parseCoordinateQuery(query: string): CoordinateResult | null {
  const match = query.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function FlyToSelection({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 13), { duration: 0.8 });
  }, [map, target]);

  return null;
}

export default function Heatmap() {
  const [points, setPoints] = useState<WeightedPoint[]>([]);
  const [dataset, setDataset] = useState<TourismDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ bounds: null, zoom: 9 });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<{ lat: number; lng: number } | null>(null);
  const [coordinateTarget, setCoordinateTarget] = useState<CoordinateResult | null>(null);

  useEffect(() => {
    setShowDetails(false);
  }, [selection?.lat, selection?.lng]);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    loadTourismPotentialPoints()
      .then((result) => {
        if (cancelled) return;
        setDataset(result);
        setPoints(result.heatPoints);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed loading ArcGIS layers';
        setError(message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectionRadiusMeters = useMemo(() => {
    const radius = 14000 / Math.pow(2, Math.max(0, view.zoom - 8));
    return Math.max(1800, Math.min(12000, radius));
  }, [view.zoom]);

  const searchablePlaces = useMemo(() => {
    if (!dataset) return [];
    return [...dataset.hotels, ...dataset.ratag, ...dataset.attractions];
  }, [dataset]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return searchablePlaces.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 8);
  }, [searchQuery, searchablePlaces]);

  const coordinateQuery = useMemo(() => parseCoordinateQuery(searchQuery), [searchQuery]);

  const visibleStats = useMemo(() => {
    if (!dataset || !view.bounds) return null;
    const hotels = dataset.hotels.filter((p) => view.bounds?.contains([p.lat, p.lng]));
    const ratag = dataset.ratag.filter((p) => view.bounds?.contains([p.lat, p.lng]));
    const attractions = dataset.attractions.filter((p) => view.bounds?.contains([p.lat, p.lng]));
    return computeStats(hotels, ratag, attractions);
  }, [dataset, view.bounds]);

  const selectedStats = useMemo(() => {
    if (!dataset || !selection) return null;
    const hotels = dataset.hotels.filter(
      (p) => distanceMeters([p.lat, p.lng], [selection.lat, selection.lng]) <= selectionRadiusMeters,
    );
    const ratag = dataset.ratag.filter(
      (p) => distanceMeters([p.lat, p.lng], [selection.lat, selection.lng]) <= selectionRadiusMeters,
    );
    const attractions = dataset.attractions.filter(
      (p) => distanceMeters([p.lat, p.lng], [selection.lat, selection.lng]) <= selectionRadiusMeters,
    );
    return {
      stats: computeStats(hotels, ratag, attractions),
      hotels,
      ratag,
      attractions,
    };
  }, [dataset, selection, selectionRadiusMeters]);

  return (
    <div className="relative" style={{ height: 540 }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={9}
        style={{ height: '100%', width: '100%', borderRadius: '10px' }}
        zoomControl
        attributionControl={false}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO &copy; OpenStreetMap'
          maxZoom={19}
        />
        <HeatLayer points={points} />
        <FitToData points={points} />
        <MapTracker onViewChange={setView} onMapClick={setSelection} />
        <FlyToSelection target={selectedPlace ?? coordinateTarget} />
        {selection && (
          <Circle
            center={[selection.lat, selection.lng]}
            radius={selectionRadiusMeters}
            pathOptions={{
              color: '#2563eb',
              weight: 1.5,
              fillColor: '#60a5fa',
              fillOpacity: 0.08,
            }}
          />
        )}
      </MapContainer>

      <div
        className="absolute top-4 right-4 z-[1000] w-80 bg-white/95 border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm text-xs text-slate-600 backdrop-blur"
        style={{ direction: 'rtl' }}
      >
        <div className="font-medium mb-1">חיפוש מיקום</div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="חיפוש לפי שם או קואורדינטות (lat, lng)"
          className="w-full border border-slate-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        {searchResults.length > 0 && (
          <div className="mt-1 max-h-36 overflow-auto">
            {searchResults.map((place) => (
              <button
                key={place.id}
                type="button"
                className="w-full text-right px-1 py-1 hover:bg-slate-100 rounded"
                onClick={() => {
                  setSelectedPlace({ lat: place.lat, lng: place.lng });
                  setCoordinateTarget(null);
                  setSelection({ lat: place.lat, lng: place.lng });
                  setSearchQuery(place.name);
                }}
              >
                {place.name}
              </button>
            ))}
          </div>
        )}
        {coordinateQuery && (
          <button
            type="button"
            className="mt-1 w-full text-right px-1 py-1 bg-blue-50 hover:bg-blue-100 rounded text-blue-700"
            onClick={() => {
              setCoordinateTarget(coordinateQuery);
              setSelection({ lat: coordinateQuery.lat, lng: coordinateQuery.lng });
              setSelectedPlace(null);
            }}
          >
            קפיצה לקואורדינטות: {coordinateQuery.lat.toFixed(6)}, {coordinateQuery.lng.toFixed(6)}
          </button>
        )}
      </div>

      <div
        className="absolute bottom-8 left-4 z-[1000] bg-white/95 border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm backdrop-blur"
        style={{ direction: 'rtl' }}
      >
        <div className="text-xs text-slate-600 mb-1 font-semibold">עוצמת פוטנציאל תיירותי</div>
        <div className="text-[11px] text-slate-500">ירוק = פוטנציאל גבוה | אדום = פוטנציאל נמוך</div>
      </div>

      <div
        className="absolute bottom-8 right-4 z-[1000] bg-white/95 border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm text-xs text-slate-500 backdrop-blur max-w-[42rem]"
        style={{ direction: 'rtl' }}
      >
        {!visibleStats ? (
          <div>טוען נתונים מ־ArcGIS...</div>
        ) : (
          <div>
            תצוגה נוכחית: מלונות {visibleStats.hotels} | אטרקציות {visibleStats.attractions} | אתרי טבע{' '}
            {visibleStats.nature} | סך ביקורים שנתיים {visibleStats.yearlyVisits.toLocaleString('he-IL')}
          </div>
        )}
        {selectedStats && (
          <div className="mt-1 border-t border-slate-200 pt-1">
            <button
              type="button"
              className="text-right w-full hover:text-slate-700 underline underline-offset-2"
              onClick={() => setShowDetails((v) => !v)}
            >
              אזור נבחר: מלונות {selectedStats.stats.hotels} | אטרקציות {selectedStats.stats.attractions} | אתרי
              טבע {selectedStats.stats.nature} | סך ביקורים שנתי {selectedStats.stats.yearlyVisits.toLocaleString('he-IL')}{' '}
              {showDetails ? '(הסתר פירוט)' : '(הצג פירוט)'}
            </button>
            {showDetails && (
              <div className="mt-1 max-h-44 overflow-auto text-[11px] leading-5">
                <div className="font-semibold text-slate-700">מלונות</div>
                {selectedStats.hotels.length === 0 ? (
                  <div>- אין</div>
                ) : (
                  selectedStats.hotels.map((h) => (
                    <div key={h.id}>- {h.name}{h.rooms ? ` (${h.rooms} חדרים)` : ''}</div>
                  ))
                )}
                <div className="font-semibold text-slate-700 mt-1">אתרי רט״ג (ביקורים שנתיים)</div>
                {selectedStats.ratag.length === 0 ? (
                  <div>- אין</div>
                ) : (
                  selectedStats.ratag.map((p) => (
                    <div key={p.id}>
                      - {p.name}: {(p.annualVisits ?? 0).toLocaleString('he-IL')}
                    </div>
                  ))
                )}
                <div className="font-semibold text-slate-700 mt-1">אטרקציות (ביקורים שנתיים)</div>
                {selectedStats.attractions.length === 0 ? (
                  <div>- אין</div>
                ) : (
                  selectedStats.attractions.map((p) => (
                    <div key={p.id}>
                      - {p.name}: {(p.annualVisits ?? 0).toLocaleString('he-IL')}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        {error && <div className="text-red-600 mt-1">שגיאה בטעינת הנתונים: {error}</div>}
      </div>
    </div>
  );
}
