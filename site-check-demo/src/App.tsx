import { useMemo, useState } from 'react'
import { MapContainer, Marker, Polygon, TileLayer, useMapEvents, WMSTileLayer } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import clusterLogo from './assets/cluster-logo.png'
import {
  getParcelByGushHelka,
  getParcelByPoint,
  type ParcelFeature,
} from './arcgis'
import {
  classifyZoningCategory,
  decisionExplanation,
  decisionTitle,
  evaluateDecision,
  projectLabel,
  type DecisionColor,
  type ProjectType,
} from './decision'

const MAP_CENTER: LatLngExpression = [32.799, 34.989]

function Picker({
  onPick,
  disabled,
}: {
  onPick: (lat: number, lng: number) => void
  disabled: boolean
}) {
  const map = useMapEvents({
    click(event) {
      if (!disabled) onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  void map

  return null
}

function colorClass(color: DecisionColor): string {
  if (color === 'green') return 'result-green'
  if (color === 'yellow') return 'result-yellow'
  return 'result-red'
}

export default function App() {
  const [projectType, setProjectType] = useState<ProjectType>('zimmer')
  const [requiredAreaSqm, setRequiredAreaSqm] = useState(800)
  const [gush, setGush] = useState('')
  const [helka, setHelka] = useState('')
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [parcel, setParcel] = useState<ParcelFeature | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const result = useMemo(() => {
    if (!parcel) return null

    const rawZoning = parcel.zoningText.trim()
    const hasKnownZoning = rawZoning.length > 0 && rawZoning !== 'לא ידוע'

    if (!hasKnownZoning) {
      if (requiredAreaSqm > parcel.areaSqm) {
        return {
          color: 'red' as DecisionColor,
          title: 'לא מתאים (אדום)',
          text: `לא אותר ייעוד קרקע זמין לחלקה זו כרגע. בנוסף, השטח הנדרש (${Math.round(requiredAreaSqm).toLocaleString('he-IL')} מ"ר) גדול משטח החלקה (${Math.round(parcel.areaSqm).toLocaleString('he-IL')} מ"ר), ולכן המיזם אינו אפשרי בשלב זה.`,
        }
      }

      return {
        color: 'yellow' as DecisionColor,
        title: 'מידע ייעוד חסר (צהוב)',
        text: 'לא אותר ייעוד קרקע זמין לחלקה זו כרגע, ולכן אי אפשר לקבוע התאמה תכנונית מלאה. מומלץ לבצע בדיקה ידנית במערכת התכנון לפני החלטה.',
      }
    }

    const zoning = classifyZoningCategory(parcel.zoningText)
    const color = evaluateDecision({
      projectType,
      zoningCategory: zoning,
      requiredAreaSqm,
      parcelAreaSqm: parcel.areaSqm,
    })

    return {
      color,
      title: decisionTitle(color),
      text: decisionExplanation({ color, zoning, rawZoningText: parcel.zoningText, projectType }),
    }
  }, [parcel, projectType, requiredAreaSqm])

  async function loadParcelByPoint(lat: number, lng: number) {
    setLoading(true)
    setError(null)
    setSelectedPoint({ lat, lng })
    try {
      const feature = await getParcelByPoint(lat, lng)
      if (!feature) {
        setParcel(null)
        setError('לא נמצאה חלקה בנקודה שנבחרה.')
        return
      }
      setParcel(feature)
      setGush(feature.gush?.toString() ?? '')
      setHelka(feature.helka?.toString() ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים.')
      setParcel(null)
    } finally {
      setLoading(false)
    }
  }

  async function loadParcelByNumbers(gushNum: number, helkaNum: number) {
    if (!Number.isFinite(gushNum) || !Number.isFinite(helkaNum)) {
      setError('יש להזין גוש וחלקה תקינים.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const feature = await getParcelByGushHelka(gushNum, helkaNum)
      if (!feature) {
        setParcel(null)
        setError('לא נמצאה חלקה תואמת לגוש/חלקה שהוזנו.')
        return
      }
      setParcel(feature)
      if (feature.polygon[0]?.[0]) {
        setSelectedPoint({ lat: feature.polygon[0][0][0], lng: feature.polygon[0][0][1] })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים.')
      setParcel(null)
    } finally {
      setLoading(false)
    }
  }

  async function loadParcelByGushHelka() {
    await loadParcelByNumbers(Number(gush), Number(helka))
  }

  return (
    <div className="app" dir="rtl">
      <header className="panel">
        <div className="title-row">
          <div className="title-main">
            <img src={clusterLogo} alt="אשכול גליל מזרחי" className="app-logo" />
            <div>
              <h1>מערכת בדיקת התאמת קרקע למיזם תיירותי</h1>
              <p>בדיקה מהירה: מיקום, סוג מיזם, שטח נדרש ותשובת התאמה תכנונית.</p>
            </div>
          </div>
          <div className="logic-chip" title="ההחלטה מבוססת מטריצת התאמה + בדיקת שטח.">
            לוגיקה פעילה
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel map-panel">
          <MapContainer center={MAP_CENTER} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <WMSTileLayer
              url="https://open.govmap.gov.il/geoserver/opendata/wms"
              params={{
                layers: 'opendata:PARCEL_ALL',
                format: 'image/png',
                transparent: true,
                version: '1.1.1',
              }}
              opacity={0.65}
            />
            <Picker
              onPick={(lat, lng) => void loadParcelByPoint(lat, lng)}
              disabled={loading}
            />
            {parcel?.polygon.map((ring, index) => (
              <Polygon
                key={index}
                positions={ring}
                pathOptions={{ color: '#2563eb', weight: 2, fillColor: '#93c5fd', fillOpacity: 0.18 }}
              />
            ))}
            {selectedPoint && <Marker position={[selectedPoint.lat, selectedPoint.lng]} />}
          </MapContainer>
          <div className="layer-status">שכבת גוש/חלקה מוצגת ב־WMS | שאילתות בחירה מותאמות למהירות</div>
        </section>

        <section className="panel form">
          <h2>קלט יזם</h2>

          <label>
            סוג מיזם
            <select value={projectType} onChange={(e) => setProjectType(e.target.value as ProjectType)}>
              <option value="zimmer">צימרים</option>
              <option value="hotel">מלון</option>
              <option value="attraction">אטרקציה</option>
              <option value="restaurant">מסעדה</option>
            </select>
          </label>

          <label>
            שטח נדרש (מ"ר)
            <input
              type="number"
              min={1}
              value={requiredAreaSqm}
              onChange={(e) => setRequiredAreaSqm(Number(e.target.value))}
            />
          </label>

          <div className="inline-inputs">
            <label>
              גוש
              <input value={gush} onChange={(e) => setGush(e.target.value)} />
            </label>
            <label>
              חלקה
              <input value={helka} onChange={(e) => setHelka(e.target.value)} />
            </label>
          </div>

          <button type="button" className="primary-btn" onClick={loadParcelByGushHelka} disabled={loading}>
            בדוק לפי גוש/חלקה
          </button>

          <p className="help-text">אפשר גם ללחוץ על המפה כדי לבחור מיקום.</p>

          <details className="logic-box">
            <summary>איך המערכת מחליטה כרגע?</summary>
            <ul>
              <li>נלקח ייעוד מקורי מהשכבה ללא נירמול בתצוגה.</li>
              <li>תוצאת בסיס נקבעת לפי מטריצת התאמה של סוג מיזם מול ייעוד.</li>
              <li>אם שטח נדרש גדול משטח חלקה - אדום.</li>
              <li>אם שטח נדרש מעל 70% מהחלקה - ירוק יורד לצהוב.</li>
              <li>אם לא נמצא ייעוד - צהוב מידע חסר (או אדום רק אם השטח לא מספיק).</li>
            </ul>
          </details>
        </section>
      </main>

      <section className="panel">
        <h2>תוצאה</h2>
        {loading && <p>טוען מידע מחלקה...</p>}
        {!loading && error && <p className="error">{error}</p>}

        {!loading && !error && parcel && result && (
          <div className={`result ${colorClass(result.color)}`}>
            <h3>{result.title}</h3>
            <p>{result.text}</p>
            <ul>
              <li>
                גוש/חלקה: {parcel.gush ?? 'לא זוהה'} / {parcel.helka ?? 'לא זוהה'}
              </li>
              <li>ייעוד מקורי מהשכבה: {parcel.zoningText}</li>
              <li>מיזם: {projectLabel(projectType)}</li>
              <li>שטח חלקה: {Math.round(parcel.areaSqm).toLocaleString('he-IL')} מ"ר</li>
              <li>שטח נדרש: {Math.round(requiredAreaSqm).toLocaleString('he-IL')} מ"ר</li>
            </ul>
          </div>
        )}

        {!loading && !error && !parcel && <p>בחר מיקום על המפה או הזן גוש/חלקה כדי לקבל תשובה.</p>}
      </section>
    </div>
  )
}
