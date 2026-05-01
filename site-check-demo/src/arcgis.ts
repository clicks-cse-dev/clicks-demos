export interface ParcelFeature {
  fid: number
  gush: number | null
  helka: number | null
  zoningText: string
  areaSqm: number
  polygon: [number, number][][]
}

export interface ParcelOutlineFeature {
  fid: number
  gush: number | null
  helka: number | null
  areaSqm: number
  polygon: [number, number][][]
}

const LEGACY_ZONING_URL =
  'https://services1.arcgis.com/yAQXemoDSgzdfV2A/arcgis/rest/services/%D7%99%D7%99%D7%A2%D7%95%D7%93%D7%99_%D7%A7%D7%A8%D7%A7%D7%A2/FeatureServer/0/query'
const FOREST_ZONING_URL =
  'https://services2.arcgis.com/utNNrmXb4IZOLXXs/arcgis/rest/services/KKLOpenDataPlanDesignations/FeatureServer/11/query'
const GOVMAP_WFS_URL = 'https://open.govmap.gov.il/geoserver/opendata/wfs'
const GOVMAP_PROPERTY_NAME = 'OBJECTID,PARCEL_ID,GUSH_NUM,PARCEL,LEGAL_AREA,SHAPE_AREA,the_geom'

const zoningCache = new Map<string, { zoningText: string; areaSqm: number }>()
const parcelByKeyCache = new Map<string, ParcelFeature>()
const parcelByPointCache = new Map<string, ParcelFeature | null>()

interface ArcGisFeature {
  attributes: {
    FID?: number
    Gush?: number
    Helka?: number
    Ystr?: string
    Planning_Zoning?: string
    Shape__Area?: number
  }
  geometry?: {
    rings?: number[][][]
  }
}

interface ArcGisQueryResponse {
  error?: { message?: string }
  features?: ArcGisFeature[]
}

interface GovMapWfsFeature {
  id?: string
  geometry?: {
    type?: 'Polygon' | 'MultiPolygon'
    coordinates?: number[][][] | number[][][][]
  }
  properties?: {
    OBJECTID?: number
    PARCEL_ID?: number
    GUSH_NUM?: number
    PARCEL?: number
    LEGAL_AREA?: number
    SHAPE_AREA?: number
  }
}

interface GovMapWfsResponse {
  features?: GovMapWfsFeature[]
}

async function queryArcgis(baseUrl: string, params: URLSearchParams): Promise<ArcGisQueryResponse> {
  const response = await fetch(`${baseUrl}?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`ArcGIS request failed (${response.status})`)
  }

  const payload = (await response.json()) as ArcGisQueryResponse
  if (payload.error) {
    throw new Error(payload.error.message ?? 'ArcGIS query error')
  }

  return payload
}

async function queryGovMapWfs(params: URLSearchParams): Promise<GovMapWfsResponse> {
  const response = await fetch(`${GOVMAP_WFS_URL}?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`GovMap WFS request failed (${response.status})`)
  }

  return (await response.json()) as GovMapWfsResponse
}

function roundCoord(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function parseGovMapGeometry(feature: GovMapWfsFeature): [number, number][][] | null {
  const type = feature.geometry?.type
  const coordinates = feature.geometry?.coordinates
  if (!type || !coordinates) return null

  if (type === 'Polygon') {
    return (coordinates as number[][][]).map((ring) =>
      ring.map(([lng, lat]) => [lat, lng] as [number, number]),
    )
  }

  if (type === 'MultiPolygon') {
    const firstPolygon = (coordinates as number[][][][])[0]
    if (!firstPolygon) return null
    return firstPolygon.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]))
  }

  return null
}

function parseGovMapOutline(feature: GovMapWfsFeature): ParcelOutlineFeature | null {
  const polygon = parseGovMapGeometry(feature)
  if (!polygon) return null

  return {
    fid: feature.properties?.OBJECTID ?? feature.properties?.PARCEL_ID ?? 0,
    gush: feature.properties?.GUSH_NUM ?? null,
    helka: feature.properties?.PARCEL ?? null,
    areaSqm: feature.properties?.LEGAL_AREA ?? feature.properties?.SHAPE_AREA ?? 0,
    polygon,
  }
}

function sqr(n: number): number {
  return n * n
}

function ringCenter(ring: [number, number][]): [number, number] {
  const total = ring.reduce(
    (acc, point) => {
      acc.lat += point[0]
      acc.lng += point[1]
      return acc
    },
    { lat: 0, lng: 0 },
  )
  return [total.lat / ring.length, total.lng / ring.length]
}

function nearestToPoint(features: ParcelFeature[], lat: number, lng: number): ParcelFeature | null {
  if (!features.length) return null

  let best: ParcelFeature | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const feature of features) {
    const firstRing = feature.polygon[0]
    if (!firstRing?.length) continue
    const center = ringCenter(firstRing)
    const distance = sqr(center[0] - lat) + sqr(center[1] - lng)
    if (distance < bestDistance) {
      bestDistance = distance
      best = feature
    }
  }

  return best
}

function toParcelFeature(outline: ParcelOutlineFeature, zoningText: string, areaSqm: number): ParcelFeature {
  return {
    fid: outline.fid,
    gush: outline.gush,
    helka: outline.helka,
    zoningText,
    areaSqm: areaSqm > 0 ? areaSqm : outline.areaSqm,
    polygon: outline.polygon,
  }
}

async function getZoningByPoint(lat: number, lng: number): Promise<{ zoningText: string; areaSqm: number }> {
  const cacheKey = `${roundCoord(lat, 5)},${roundCoord(lng, 5)}`
  const cached = zoningCache.get(cacheKey)
  if (cached) return cached

  const primaryParams = new URLSearchParams({
    where: '1=1',
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'Planning_Zoning,Shape__Area',
    returnGeometry: 'false',
    outSR: '4326',
    resultRecordCount: '1',
    f: 'pjson',
  })

  try {
    const payload = await queryArcgis(FOREST_ZONING_URL, primaryParams)
    const first = payload.features?.[0]
    if (first?.attributes.Planning_Zoning) {
      const result = {
        zoningText: String(first.attributes.Planning_Zoning),
        areaSqm: first.attributes.Shape__Area ?? 0,
      }
      zoningCache.set(cacheKey, result)
      return result
    }
  } catch {
    // Fallback below keeps the demo usable even if this source fails temporarily.
  }

  const fallbackParams = new URLSearchParams({
    where: '1=1',
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'Ystr,Shape__Area',
    returnGeometry: 'false',
    outSR: '4326',
    resultRecordCount: '1',
    f: 'pjson',
  })

  const fallbackPayload = await queryArcgis(LEGACY_ZONING_URL, fallbackParams)
  const fallback = fallbackPayload.features?.[0]
  const result = {
    zoningText: fallback?.attributes.Ystr ?? 'לא ידוע',
    areaSqm: fallback?.attributes.Shape__Area ?? 0,
  }
  zoningCache.set(cacheKey, result)
  return result
}

export async function getParcelByPoint(lat: number, lng: number): Promise<ParcelFeature | null> {
  const pointCacheKey = `${roundCoord(lat, 5)},${roundCoord(lng, 5)}`
  const pointCached = parcelByPointCache.get(pointCacheKey)
  if (pointCached !== undefined) return pointCached

  const intersectParams = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'opendata:PARCEL_ALL',
    srsName: 'EPSG:4326',
    cql_filter: `INTERSECTS(the_geom,POINT(${lng} ${lat}))`,
    propertyName: GOVMAP_PROPERTY_NAME,
    outputFormat: 'application/json',
    count: '8',
  })

  const intersectPayload = await queryGovMapWfs(intersectParams)
  let candidates = (intersectPayload.features ?? [])
    .map(parseGovMapOutline)
    .filter((feature): feature is ParcelOutlineFeature => Boolean(feature))

  if (!candidates.length) {
    const delta = 0.0006
    const bboxParams = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeNames: 'opendata:PARCEL_ALL',
      srsName: 'EPSG:4326',
      bbox: `${lng - delta},${lat - delta},${lng + delta},${lat + delta},EPSG:4326`,
      propertyName: GOVMAP_PROPERTY_NAME,
      outputFormat: 'application/json',
      count: '16',
    })
    const bboxPayload = await queryGovMapWfs(bboxParams)
    candidates = (bboxPayload.features ?? [])
      .map(parseGovMapOutline)
      .filter((feature): feature is ParcelOutlineFeature => Boolean(feature))
  }

  if (!candidates.length) {
    parcelByPointCache.set(pointCacheKey, null)
    return null
  }

  const nearby = candidates.map((outline) => toParcelFeature(outline, 'לא ידוע', outline.areaSqm))
  const selected = nearestToPoint(nearby, lat, lng)
  if (!selected) {
    parcelByPointCache.set(pointCacheKey, null)
    return null
  }

  const firstRing = selected.polygon[0]
  const center = firstRing?.length ? ringCenter(firstRing) : [lat, lng]
  const zoning = await getZoningByPoint(center[0], center[1])
  const area = selected.areaSqm > 0 ? selected.areaSqm : zoning.areaSqm
  const result = { ...selected, zoningText: zoning.zoningText, areaSqm: area }
  const parcelKey = `${result.gush ?? ''}/${result.helka ?? ''}`
  if (result.gush !== null && result.helka !== null) {
    parcelByKeyCache.set(parcelKey, result)
  }
  parcelByPointCache.set(pointCacheKey, result)
  return result
}

export async function getParcelByGushHelka(gush: number, helka: number): Promise<ParcelFeature | null> {
  const cacheKey = `${gush}/${helka}`
  const cached = parcelByKeyCache.get(cacheKey)
  if (cached) return cached

  const parcelParams = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'opendata:PARCEL_ALL',
    srsName: 'EPSG:4326',
    propertyName: GOVMAP_PROPERTY_NAME,
    outputFormat: 'application/json',
    cql_filter: `GUSH_NUM=${gush} AND PARCEL=${helka}`,
    count: '1',
  })

  const parcelPayload = await queryGovMapWfs(parcelParams)
  const outline = parcelPayload.features?.map(parseGovMapOutline).find((f): f is ParcelOutlineFeature => Boolean(f))
  if (!outline) return null

  const firstPoint = outline.polygon[0]?.[0]
  const zoning = firstPoint ? await getZoningByPoint(firstPoint[0], firstPoint[1]) : { zoningText: 'לא ידוע', areaSqm: 0 }
  const area = (parcelPayload.features?.[0]?.properties?.LEGAL_AREA ?? parcelPayload.features?.[0]?.properties?.SHAPE_AREA ?? zoning.areaSqm ?? 0)

  const result = toParcelFeature(outline, zoning.zoningText, area)
  parcelByKeyCache.set(cacheKey, result)
  return result
}

export async function getParcelLayerByBbox(bounds: {
  west: number
  south: number
  east: number
  north: number
}): Promise<ParcelOutlineFeature[]> {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'opendata:PARCEL_ALL',
    srsName: 'EPSG:4326',
    bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north},EPSG:4326`,
    outputFormat: 'application/json',
    count: '300',
  })

  const payload = await queryGovMapWfs(params)
  return (payload.features ?? [])
    .map(parseGovMapOutline)
    .filter((feature): feature is ParcelOutlineFeature => Boolean(feature))
}
