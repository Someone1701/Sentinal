# Sentinel — VIT Vellore Campus Map & Flood Safety Engine

[![Build & Test](https://github.com/Someone1701/Sentinal/actions/workflows/ci.yml/badge.svg)](https://github.com/Someone1701/Sentinal/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![GSAP](https://img.shields.io/badge/Motion-GSAP_ScrollTrigger-88CE02?logo=greensock&logoColor=white)](https://greensock.com/)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-3D_Vector-396BFA)](https://maplibre.org/)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSomeone1701%2FSentinal)

An intelligent 3D campus navigation platform and autonomous flood safety engine for **VIT Vellore** (12.9692° N, 79.1559° E).

Sentinel unifies high-precision 3D campus mapping with real-time underpass water-level monitoring, flood-adaptive A* safe routing, student crowd-sourced geotagged hazard reporting, and a cinematic GSAP landing experience.

---

## Key Highlights

- **Cinematic GSAP Landing Experience (`landing.html`)**: Pinned fullscreen viewport with kinetic typography, glowing radar emblem, and a ScrollTrigger scrub zoom that seamlessly opens into the campus intelligence platform.
- **Tailwind CSS v3 Architecture**: Ultra-efficient styling with custom glassmorphism, responsive bento grids, and dark-mode tokens.
- **Flood Resilience & Underpass Monitoring**: Live water-level sensors for campus chokepoints (Katpadi Railway Underpass, TT-SJT Link, Green Tower Dip), dynamic hazard severity rings, and safety statuses.
- **Flood-Adaptive Safe Routing**: A* routing engine that dynamically closes submerged edges and penalizes flooded paths, guiding students to higher ground and covered skywalks.
- **Geotagged EXIF Hazard Reporting**: Students can upload live photos of flooding or fallen obstacles; Sentinel automatically extracts GPS metadata (EXIF) to pin verified hazards on the map.
- **Disaster Operations Dashboard**: Real-time water-level gauges, rainfall intensity telemetry, emergency SOS contact dispatch, and high-ground evacuation shelters.
- **Complete 3D Campus & PRP Model**: Extruded OSM buildings, clock tower, multi-level classroom highlight (`prp 327`, `g29`), trees, railway tracks, and active train simulations.
- **Unified Campus Search**: Sub-millisecond indexed search across 1,300+ entries (lecture halls, hostels, messes, 1,100+ faculty members, ATMs, and gates).

---

## Core Systems & Architecture

### 1. Flood Resilience & Underpass Monitoring (`src/disaster/`)
Campus chokepoints—notably the low-lying railway underpasses linking the main campus to academic and hostel blocks—are prone to rapid submersion during heavy monsoon rains.
- **Spatial Collision Detection**: Real-time point-in-polygon and distance decay algorithms identify any route segment intersecting flooded zones.
- **Simulation Modes**: Trigger simulated heavy downpours, flash floods, or clear conditions directly from the UI or telemetry dashboard.
- **Edge Weight Penalties**: Rather than failing navigation, the router computes alternate safe paths via pedestrian bridges and higher elevation roads.

### 2. Geotagged Hazard Reporting (`src/location/`)
- Student-reported hazard images are processed client-side via [src/location/exif.ts](src/location/exif.ts).
- Extracts EXIF GPS Latitude, Longitude, and timestamp directly from image headers, avoiding manual coordinate entry and eliminating fake reports outside campus bounds.

### 3. Pinned Kinetic Intro & Landing Page (`landing.html`, `src/landing-main.ts`)
- **Pinned Curtain**: An immersive 100vh viewport featuring a pulsing shield aura, telemetry pills, and dynamic coordinate readout.
- **ScrollTrigger Zoom Scrub**: Scrubbing down seamlessly zooms into the glowing emblem (`scale: 1 → 3.2`) with progressive Gaussian blur, smoothly fading into the landing page hero.
- **Interactive Commute Presets**: Instant one-click route links (`PRP to SJT`, `M-Block to TT`, `Foodys to Library`) that load pre-configured flood-safe paths directly into the 3D map engine.

### 4. Vector Basemap & 3D Extrusions (`src/map/`)
- **No Tile Server / Zero External Tile Budget**: Basemap is compiled directly from OpenStreetMap GeoJSON extracts (`data/raw/`).
- **PRP Complex Signage Accuracy**: Modelled after the official site sign on Jimmy Carter Road with roof color-coding (Blocks A–E), courtyard, and clock tower.
- **Active Railway**: Live animated trains passing between campus plots on the Chennai–Bengaluru mainline.

---

## Project Structure

```
├── diagrams/               # Architecture sequence flows & system design artifacts
├── data/
│   ├── raw/                # OpenStreetMap raw vector dumps (committed)
│   ├── live/               # Faculty directory & MessIT menu snapshots
│   └── curated/            # Hand-surveyed campus landmarks & PRP rooms
├── public/
│   ├── font/               # Noto Sans glyphs (zero external font requests)
│   └── data/               # Normalized runtime bundles (campus, geo, graph)
├── scripts/
│   ├── fetch-osm.mjs       # Overpass API downloader with mirror failover
│   ├── fetch-web.mjs       # Faculty directory & mess meal scraper
│   ├── build-data.mjs      # Compiles graph topology and POI spatial index
│   └── smoke.mjs           # Automated assertions (search, routing, 3D PRP, DOM)
├── src/
│   ├── disaster/           # Flood resilience engine, scenarios & spatial logic
│   ├── location/           # EXIF image extraction & coordinate validation
│   ├── map/                # MapLibre 3D campus models, train animation, styles
│   ├── route/              # A* router with dynamic flood penalties & binary heap
│   ├── search/             # Sub-millisecond inverted search index & fuzzy intents
│   ├── ui/                 # Telemetry dashboard, disaster panel, icons & palette
│   ├── landing-main.ts     # GSAP ScrollTrigger intro & landing logic
│   ├── landing.css         # Tailwind directives & landing glassmorphic design
│   ├── styles.css          # Main 3D map application styling
│   └── main.ts             # Map application entrypoint
├── index.html              # Landing page with cinematic GSAP scroll intro
├── map.html                # Core 3D interactive campus map application
├── tailwind.config.js      # Tailwind CSS v3 theme tokens & plugins
├── postcss.config.js       # PostCSS processor config
├── vercel.json             # Vercel deployment configuration
└── vite.config.ts          # Vite build pipeline (multi-page configuration)
```

---

## Getting Started

### Prerequisites
- Node.js 20+ / 22+ (`.nvmrc` provided)
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/Someone1701/Sentinal.git
cd Sentinal

# Install dependencies
npm install
```

### Data Pipeline

`data/raw` and `data/live` are committed to the repository, so the project works immediately after installation without network requests:

```bash
# Optional: Refetch latest OpenStreetMap and campus data
npm run fetch
node scripts/fetch-web.mjs

# Build runtime data files (public/data/{campus,geo,graph}.json)
npm run build:data
```

### Running Locally

```bash
# Start Vite development server
npm run dev
```

- **Cinematic Intro & Landing Page**: Open [http://localhost:5180/](http://localhost:5180/)
- **3D Interactive Map & Flood Engine**: Open [http://localhost:5180/map](http://localhost:5180/map)

---

## Deploying to Vercel

Sentinel is optimized for instant zero-configuration deployment on **Vercel** as a static Vite web application.

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub**:
   Ensure all changes are pushed to your remote repository on GitHub (`main` branch).
2. **Open Vercel**:
   Go to [vercel.com](https://vercel.com) and log in.
3. **Import Project**:
   Click **"Add New..."** → **"Project"**, then select the `Sentinal` repository from your GitHub account.
4. **Configure Project Settings**:
   Vercel will automatically detect Vite. Confirm the following settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build` *(runs `npm run build:data && vite build`)*
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. **Node.js Version**:
   In **Project Settings → General → Node.js Version**, ensure `20.x` or `22.x` is selected (matching `.nvmrc`).
6. **Click "Deploy"**:
   Vercel will compile the spatial graph data and bundle the multi-page app (`index.html` and `landing.html`) in ~20 seconds.

### Method 2: Deploy via Vercel CLI

You can also deploy directly from your local terminal using the official Vercel CLI:

```bash
# 1. Install Vercel CLI globally
npm i -g vercel

# 2. Log in to your Vercel account
vercel login

# 3. Deploy preview build (follow the interactive prompts, accept defaults)
vercel

# 4. Deploy directly to production
vercel --prod
```

### Vercel Routing & Clean URLs

The repository includes a [vercel.json](vercel.json) file:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "cleanUrls": true,
  "framework": "vite",
  "rewrites": [
    { "source": "/", "destination": "/landing.html" },
    { "source": "/map", "destination": "/index.html" },
    { "source": "/landing", "destination": "/landing.html" }
  ]
}
```
- `/` serves the Cinematic GSAP Intro & Overview page (`landing.html`).
- `/map` serves the 3D Interactive Map Engine & Campus Dashboard (`index.html`).
- Deep-links like `/map?route=...`, `/map?focus=...`, and `/map?hazard=...` are handled seamlessly.

---

## Testing & Quality Assurance

Sentinel features a strict automated test suite covering TypeScript compilation, graph build invariants, search latency, flood routing, and DOM element contracts:

```bash
# Run complete test suite (TypeScript check + build data + smoke tests)
npm test

# Run production build
npm run build
```

### Test Assertions
- **Search Engine**: >1,300 indexed entities, exact & fuzzy intent ranking, <2.5ms latency.
- **A* Router**: 966 graph nodes, 1,096 edges, flood penalty verification, 0.1ms compute time.
- **3D PRP Geometry**: Validates all 11 PRP blocks, 271 modeled components, and clock tower height.
- **DOM Stability**: Headless smoke assertions verifying all 35 interactive IDs across pages.

---

## Data Sources & Attributions

| Data Type | Provider / Authority | Notes |
|---|---|---|
| Campus Boundary, Buildings, Roads & Underpasses | [OpenStreetMap relation 15931944](https://www.openstreetmap.org/relation/15931944) | ODbL License (~180 POIs, ~150 building polygons) |
| PRP Architecture & Room Mapping | Curated student surveys (`data/curated/prp.json`) | Modeled after Jimmy Carter Rd site signage |
| Hostel Mess Menus | [MessIT](https://messit.vinnovateit.com) (VinnovateIT) | Daily breakfast, lunch, snacks & dinner menus |
| Faculty Directory | [vit.ac.in/faculty](https://vit.ac.in/faculty) | 1,140+ faculty members across 43 departments |
| Underpass Telemetry & Flood Zones | Sentinel Disaster Intelligence Engine | Curated hydrological elevations & simulated sensors |

---

## Contributing

1. **Map Updates**: Missing buildings, gates, ATMs, and pathways should be contributed directly to [OpenStreetMap — VIT Vellore](https://www.openstreetmap.org/relation/15931944). They will automatically be pulled during the next data refresh.
2. **Curated Coordinates**: For items not accepted by OSM, submit a pull request modifying `data/curated/places.json`. Coordinates must be verified on-site.

---

## License

- Code: [MIT](LICENSE)
- Map Data: [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL)
- Fonts: Noto Sans (SIL Open Font License 1.1)
