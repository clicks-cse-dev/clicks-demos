# מודל מאקרו — מפת פוטנציאל תיירותי

An interactive tourism potential heatmap demo for the Eastern Galilee region in Israel. Built as a visual mockup for the "Macro Model" product that analyzes business/economic potential for tourism development.

> **IMPORTANT: All data displayed is entirely fabricated and intended for demonstration purposes only. Do not use for decision-making.**

## How to run

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## What it is

A single-page dashboard showing:
- A stylized SVG heatmap of 10 sub-regions in Eastern Galilee
- 3 filter dropdowns (service type, period, metric) that reactively update colors and stats
- 4 summary stat cards (high-potential zones, supply gaps, visitors, revenue)
- Hover tooltips on each heat zone

## Tech stack

- React + TypeScript (Vite)
- Tailwind CSS v4
- No backend — all data hardcoded in `src/data.ts`
- RTL Hebrew layout

## Project structure

- `src/App.tsx` — dashboard shell, filters, stat cards
- `src/Heatmap.tsx` — SVG map component with heat zones, tooltips, legends
- `src/data.ts` — zone data, calculation logic, color mapping
