Build a standalone interactive demo of a tourism potential heatmap for the Eastern Galilee region in Israel. This is a visual mockup for a product called "Macro Model" that analyzes business/economic potential for tourism development.

## Context
This demo will be shown to stakeholders (regional cluster management, economic development teams) to illustrate what the product's output will look like. The data is fabricated for demo purposes — clearly indicate this in a small disclaimer.

## Tech stack
- Single-page React app (Vite) with TypeScript
- Tailwind CSS for styling
- No backend — all data hardcoded as JSON
- RTL layout (Hebrew)
- Should run with `npm install && npm run dev`

## Layout
The page has three sections, top to bottom:

### 1. Header
- Title: "מודל מאקרו — מפת פוטנציאל תיירותי"
- Subtitle: "אשכול גליל מזרחי"
- Small disclaimer pill on the right: "נתוני דמו"

### 2. Filter bar (3 dropdowns side by side)
- **סוג שירות** (Service type): הכל / מלונאות / צימרים / אטרקציות / הסעדה
- **תקופה** (Period): שנתי / קיץ / חורף / חגים
- **מדד** (Metric): פוטנציאל פיתוח / פער היצע-ביקוש / תנועת מבקרים / פוטנציאל הכנסה

### 3. Main visualization area (white card with subtle border)
A custom SVG map of the Eastern Galilee showing:
- Rough outline of the region (a rounded organic shape, not a real geographic map — stylized)
- 10 circular "heat zones" at various positions, each representing a sub-region. Zone radius: 40-60px. Zones can overlap slightly with reduced opacity to create a heatmap effect.
- Black dots marking 6 settlements (with Hebrew labels next to them)
- Small triangle markers for 6 points of interest (POIs) with smaller gray labels
- A color legend at the bottom-left: 5 shades of blue from light to dark, labeled "נמוך" to "גבוה"
- A symbol legend at the bottom-right showing what dots/triangles mean
- Hover on any heat zone shows a tooltip with the zone name and the current metric percentage

### 4. Stat cards row (4 cards in a grid below the map)
- אזורים בפוטנציאל גבוה (count)
- פערי היצע מזוהים (count)
- מבקרים שנתי (אלפים)
- פוטנציאל הכנסה (₪M)

All stats update reactively when filters change.

## Data structure

```typescript
type Zone = {
  id: string;
  name: string; // Hebrew
  x: number; // SVG position
  y: number;
  r: number; // radius
  potential: {
    all: number;     // 0-1
    hotels: number;
    zimmer: number;
    attractions: number;
    dining: number;
  };
};
```

Use these 10 zones with realistic Eastern Galilee place names:
1. קריית שמונה — strong on hotels (0.92)
2. מטולה — strong on zimmer (0.95)
3. ראש פינה — overall strongest (0.92)
4. צפת — strong on attractions (0.96)
5. חצור הגלילית — overall weak (~0.45)
6. גליל עליון — medium
7. יער ביריה — strong on attractions, weak on hotels
8. כפר בלום — medium-strong
9. דרום הגליל — overall weakest (~0.38)
10. גבול הגולן — medium-strong

(Generate plausible numbers for the rest — no real data needed.)

## Calculation logic

Period multipliers:
- שנתי: 1.0
- קיץ: 1.15
- חורף: 0.75
- חגים: 1.35

For each zone:
- baseValue = zone.potential[selectedService]
- adjusted = min(baseValue * periodMultiplier, 1)
- If metric is "פער היצע-ביקוש" → invert: value = 1 - adjusted
- Color the zone based on the value:
  - < 0.35: lightest blue (#E6F1FB)
  - < 0.55: light blue (#B5D4F4)
  - < 0.70: medium blue (#85B7EB)
  - < 0.85: strong blue (#378ADD)
  - else: darkest blue (#185FA5)
- Opacity: 0.55 + value * 0.35

Stats:
- High-potential count: zones where value > 0.75
- Gaps count: zones where value < 0.45 (or > 0.55 in gap mode)
- Visitors: sum of round(value * 95 * periodMultiplier) — display with thousand separators
- Revenue: sum of round(value * 18 * periodMultiplier)

## Visual style
- Clean, flat, minimal — no gradients, no shadows except subtle ones on the map card
- Sans-serif Hebrew-friendly font (system fonts are fine)
- Soft borders (1px gray-200)
- Rounded corners (8-12px)
- The whole thing should feel like a polished SaaS dashboard, not a prototype
- Dark mode is not required for this demo
- Background: light gray (#fafafa or similar)

## Deliverables
- Working Vite project I can run locally
- README.md with: what this is, how to run it, and a clear note that the data is fabricated for demo purposes
- One single-file component for the map (`Heatmap.tsx`) and a separate one for the dashboard shell (`App.tsx`)
- Clean, commented code

## Out of scope
- No real geographic data / Mapbox / Leaflet — pure SVG
- No backend, no API
- No persistence
- No mobile optimization (desktop demo only)
- No tests

Start by setting up the Vite project, then build incrementally: shell → filters → map SVG → heat zones with interactivity → tooltip → stats. Show me the running result at each major step.