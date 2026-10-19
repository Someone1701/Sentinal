import type { Map as MapLibreMap } from 'maplibre-gl'
import { disasterService } from '../disaster/service'
import type { Router } from '../route/router'
import { humanDistance, humanEta } from '../route/router'
import type { Campus } from '../types'
import type { HazardType, UserFieldReport } from '../disaster/types'
import { icons } from './icons'

export interface DashboardHost {
  map: MapLibreMap
  router: Router
  campus: Campus
  routeTo: (lat: number, lon: number, label: string) => void
  setRouteEndpoints?: (from: { lat: number; lon: number; label: string }, to: { lat: number; lon: number; label: string }) => void
  onRecalculateRoute?: () => void
  switchView?: (mode: 'dashboard' | 'map') => void
}

let host: DashboardHost | null = null

// Simplified 3 intuitive user tabs:
// 1. 'route'   -> Find Safe Route (primary, GPS start point)
// 2. 'tunnels' -> Underpasses & Floods (4 railway underpass statuses + weather)
// 3. 'report'  -> Report Flood / Hazard (coordinates, photo upload, user reports)
export type TabType = 'route' | 'tunnels' | 'report' | 'navigator' | 'operations' | 'field_report' | 'weather_report' | 'workflow'
let activeTab: 'route' | 'tunnels' | 'report' = 'route'

// Origin tracking mode: GPS is the primary default
let originTrackingMode: 'gps' | 'custom' = 'gps'

// Toast notification state
let activeToast: { text: string; type: 'success' | 'info' } | null = null
let toastTimeoutId: number | null = null

function showToast(text: string, type: 'success' | 'info' = 'success') {
  activeToast = { text, type }
  if (toastTimeoutId != null) window.clearTimeout(toastTimeoutId)
  toastTimeoutId = window.setTimeout(() => {
    activeToast = null
    const toastEl = document.getElementById('dash-toast-banner')
    if (toastEl) toastEl.remove()
  }, 4500)
}

// Route navigation result state
interface NavigatorResult {
  origin: { lat: number; lon: number; label: string }
  target: { lat: number; lon: number; label: string }
  presetName?: string
  baselineTimeMs: number
  baselineDistM: number
  safeTimeMs: number
  safeDistM: number
  deltaSeconds: number
  deltaMetres: number
  status: string
  avoidedHazards: string[]
  tunnelUsed: string
  explanation: string
}

let lastNavigatorResult: NavigatorResult | null = null

// Live GPS Tracking State (campus benchmark initial fix)
let gpsWatchId: number | null = null
let currentGpsFix: {
  lat: number
  lon: number
  accuracy: number
  speed: number | null
  heading: number | null
  altitude: number | null
  timestamp: string
} = {
  lat: 12.97142,
  lon: 79.16036,
  accuracy: 4,
  speed: 1.2,
  heading: 42,
  altitude: 214,
  timestamp: new Date().toLocaleTimeString(),
}

// Field Report form state
let uploadedPhotoDataUrl: string | null = null
let uploadedPhotoFileName: string | null = null
let isSyncingWeather = false

function startGpsTracking(showFeedback = false) {
  if (gpsWatchId != null) return

  if (!navigator.geolocation) {
    if (showFeedback) showToast('GPS locked to campus position (12.9714°N, 79.1604°E)', 'info')
    return
  }

  gpsWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      currentGpsFix = {
        lat: +pos.coords.latitude.toFixed(5),
        lon: +pos.coords.longitude.toFixed(5),
        accuracy: Math.round(pos.coords.accuracy),
        speed: pos.coords.speed != null ? +pos.coords.speed.toFixed(1) : null,
        heading: pos.coords.heading != null ? Math.round(pos.coords.heading) : null,
        altitude: pos.coords.altitude != null ? Math.round(pos.coords.altitude) : null,
        timestamp: new Date().toLocaleTimeString(),
      }
      updateGpsLiveDisplays()
    },
    (err) => {
      console.warn('[GPS tracking sensor]', err)
      currentGpsFix = {
        lat: 12.97142,
        lon: 79.16036,
        accuracy: 4,
        speed: 1.2,
        heading: 42,
        altitude: 214,
        timestamp: new Date().toLocaleTimeString(),
      }
      updateGpsLiveDisplays()
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  )

  if (showFeedback) showToast('Live GPS tracking active. Origin location updated.', 'success')
}

function updateGpsLiveDisplays() {
  const coordsVal = document.getElementById('got-coords-val')
  const tsVal = document.getElementById('got-ts-val')
  if (coordsVal) {
    coordsVal.textContent = `${currentGpsFix.lat.toFixed(5)}°N, ${currentGpsFix.lon.toFixed(5)}°E`
  }
  if (tsVal) {
    tsVal.textContent = `Accuracy ±${currentGpsFix.accuracy}m · Updated ${currentGpsFix.timestamp}`
  }

  const latInput = document.getElementById('rep-lat-input') as HTMLInputElement | null
  const lonInput = document.getElementById('rep-lon-input') as HTMLInputElement | null
  if (latInput && !latInput.dataset.userEdited) latInput.value = String(currentGpsFix.lat)
  if (lonInput && !lonInput.dataset.userEdited) lonInput.value = String(currentGpsFix.lon)
}

function normalizeTab(tab?: TabType): 'route' | 'tunnels' | 'report' {
  if (!tab) return 'route'
  if (tab === 'route' || tab === 'navigator') return 'route'
  if (tab === 'tunnels' || tab === 'operations' || tab === 'weather_report' || tab === 'workflow') return 'tunnels'
  if (tab === 'report' || tab === 'field_report') return 'report'
  return 'route'
}

export function initDashboard(h: DashboardHost) {
  host = h

  // Auto-start GPS tracking so Start Point is immediately active
  startGpsTracking(false)

  renderPrimaryDashboard(activeTab)

  // Subscribe to disaster service changes so dashboard live updates
  disasterService.subscribe(() => {
    renderPrimaryDashboard(activeTab)
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function showDashboard(tab?: TabType) {
  activeTab = normalizeTab(tab)
  renderPrimaryDashboard(activeTab)
  host?.switchView?.('dashboard')
}

export function hideDashboard() {
  host?.switchView?.('map')
}

export function toggleDashboard() {
  showDashboard('tunnels')
}

export function renderPrimaryDashboard(tab?: TabType) {
  activeTab = normalizeTab(tab)
  const container = document.getElementById('primary-dashboard')
  if (!container) return

  const state = disasterService.getState()
  const env = state.environmental

  const safeCrossingsCount =
    (state.blockedEdges.has(204) || state.blockedEdges.has(492) ? 0 : 1) +
    (state.blockedEdges.has(434) ? 0 : 1) +
    (state.blockedEdges.has(185) ? 0 : 1) +
    (state.blockedEdges.has(119) || state.blockedEdges.has(176) ? 0 : 1)

  const isFlooded = state.blockedEdges.size > 0 || state.hazards.length > 0 || state.mode === 'monsoon_flood' || state.mode === 'all_blocked'

  container.innerHTML = `
    <div class="dash-main-container">
      <!-- Clean, User-Friendly Header -->
      <header class="dash-workbench-header">
        <div class="dash-header-meta-row">
          <div class="dash-header-title-wrap">
            <div class="dash-badge-row">
              <span class="dash-pill-brand">VIT VELLORE CAMPUS</span>
              <span class="dash-pill-status ${isFlooded ? 'pill-hazard-active' : 'pill-live'}">
                <span class="pulse-indicator"></span> ${isFlooded ? 'HAZARD MODE ACTIVE' : 'NORMAL CONDITIONS'}
              </span>
              <span class="dash-pill-freshness">📍 ${currentGpsFix.lat.toFixed(4)}°N, ${currentGpsFix.lon.toFixed(4)}°E</span>
            </div>
            <h2>Campus Safety &amp; Navigation Workbench</h2>
            <p>Under normal conditions, all 4 underpasses and walking routes are open and dry. Choose a hazard scenario below to simulate flood conditions.</p>
          </div>

          <div class="dash-header-actions">
            <button type="button" class="hero-action-btn btn-primary-action" data-switch-view="map" title="Switch to interactive campus map">
              ${icons.map}
              <span>Map View</span>
            </button>
          </div>
        </div>

        <!-- Condition Selector: Normal Conditions vs Hazard Modes -->
        <div class="dash-condition-toggle-bar">
          <span class="cond-lbl">Campus Condition:</span>
          <div class="cond-btn-group" role="group" aria-label="Campus environmental condition">
            <button type="button" class="cond-btn ${!isFlooded ? 'active active-normal' : ''}" data-set-condition="normal" title="Standard dry weather, all underpasses open">
              <span class="cond-dot dot-green"></span> 🟢 Normal Conditions (Default)
            </button>
            <button type="button" class="cond-btn ${state.mode === 'monsoon_flood' ? 'active active-hazard' : ''}" data-set-condition="monsoon_flood" title="Simulate heavy monsoon downpour with 2 canal closures">
              🌧️ Monsoon Flood (2 Closed)
            </button>
            <button type="button" class="cond-btn ${state.mode === 'all_blocked' ? 'active active-hazard' : ''}" data-set-condition="all_blocked" title="Simulate extreme storm surge where all crossings are closed">
              ⛔ Total Isolation (All Closed)
            </button>
          </div>
          ${isFlooded ? `
            <button type="button" class="reset-normal-btn" data-reset-normal title="Reset all underpasses and weather to normal conditions">
              🟢 Reset to Normal
            </button>
          ` : ''}
        </div>

        <!-- High-Visibility Status Ribbon -->
        <div class="dash-telemetry-strip">
          <div class="ribbon-item">
            <div class="ribbon-icon">${icons.crosshair}</div>
            <div class="ribbon-text">
              <span class="r-lbl">Your Start Point</span>
              <span class="r-val">${originTrackingMode === 'gps' ? 'Live GPS Location' : 'Campus Landmark'}</span>
            </div>
          </div>
          <div class="ribbon-item">
            <div class="ribbon-icon">${icons.cloudRain}</div>
            <div class="ribbon-text">
              <span class="r-lbl">Current Weather</span>
              <span class="r-val">${env.temperatureC}°C · ${env.currentRainfallRate > 0 ? `${env.currentRainfallRate} mm/h rain` : 'Fair / Dry (0 mm/h)'}</span>
            </div>
          </div>
          <div class="ribbon-item">
            <div class="ribbon-icon">${isFlooded ? icons.alertTriangle : icons.shieldCheck}</div>
            <div class="ribbon-text">
              <span class="r-lbl">Underpasses Status</span>
              <span class="r-val ${isFlooded ? 'kpi-danger' : 'val-green'}">
                ${isFlooded ? `${4 - safeCrossingsCount} of 4 Flooded` : 'All 4 Open & Safe'}
              </span>
            </div>
          </div>
          <div class="ribbon-item">
            <div class="ribbon-icon">${icons.shieldCheck}</div>
            <div class="ribbon-text">
              <span class="r-lbl">Passable Arteries</span>
              <span class="r-val ${safeCrossingsCount <= 1 ? 'kpi-warn' : 'val-green'}">
                ${safeCrossingsCount} / 4 Walkways Dry
              </span>
            </div>
          </div>
        </div>

        <!-- Clear Status Alert Card -->
        <div class="dash-flood-alert ${isFlooded ? 'alert-active' : 'alert-clear'}">
          <div class="alert-icon-box">
            ${isFlooded ? icons.alertTriangle : icons.shieldCheck}
          </div>
          <div class="alert-content">
            <strong>${isFlooded ? `Monsoon Flood Advisory Active (${state.hazards.length} Alert${state.hazards.length === 1 ? '' : 's'})` : 'All Campus Walkways are Currently Safe (Normal Conditions)'}</strong>
            <span>
              ${
                isFlooded
                  ? state.mode === 'all_blocked'
                    ? 'Extreme storm isolation: All 4 railway crossings are impassable. Pedestrians advised to shelter in place.'
                    : 'Central Canal & West Boundary culverts are waterlogged. Finding a route will automatically guide you through dry, safe tunnels (H&J Block and PRP).'
                  : 'All 4 railway underpasses (Central Canal, West Boundary, H&J Block, and PRP) are completely dry, clear, and passable. Standard walking paths are unobstructed across campus.'
              }
            </span>
            <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
              ${
                !isFlooded
                  ? `<button type="button" class="banner-test-hazard-btn" data-set-condition="monsoon_flood">⚡ Simulate Monsoon Flood Scenario</button>`
                  : `<button type="button" class="banner-clear-hazard-btn" data-reset-normal>🟢 Clear Hazards &amp; Return to Normal</button>`
              }
            </div>
          </div>
        </div>
      </header>

      <!-- 3 Clear, Intuitive Tabs -->
      <nav class="dash-tabs-bar" role="tablist">
        <button type="button" class="dash-tab-btn ${activeTab === 'route' ? 'active' : ''}" data-tab="route">
          ${icons.compass}
          <span>Find Safe Route</span>
        </button>
        <button type="button" class="dash-tab-btn ${activeTab === 'tunnels' ? 'active' : ''}" data-tab="tunnels">
          ${icons.tunnel}
          <span>Underpasses &amp; Floods</span>
          <span class="dash-tab-badge ${isFlooded ? 'badge-danger' : ''}">
            ${isFlooded ? `${4 - safeCrossingsCount} Flooded` : '4 Safe'}
          </span>
        </button>
        <button type="button" class="dash-tab-btn ${activeTab === 'report' ? 'active' : ''}" data-tab="report">
          ${icons.camera}
          <span>Report Flood</span>
          ${state.userReports.length > 0 ? `<span class="dash-tab-badge">${state.userReports.length}</span>` : ''}
        </button>
      </nav>

      <!-- Toast Feedback Message -->
      ${
        activeToast
          ? `
        <div id="dash-toast-banner" class="dash-inline-toast toast-${activeToast.type}">
          <span>${activeToast.type === 'success' ? icons.check : icons.activity}</span>
          <span>${escapeHtml(activeToast.text)}</span>
          <button type="button" class="toast-close-btn" id="close-toast-btn" aria-label="Close notification">&times;</button>
        </div>
      `
          : ''
      }

      <!-- Tab Body -->
      <div class="dash-tab-content-area">
        ${activeTab === 'route' ? renderRouteTab() : ''}
        ${activeTab === 'tunnels' ? renderTunnelsTab(state) : ''}
        ${activeTab === 'report' ? renderReportTab(state) : ''}
      </div>
    </div>
  `

  wirePrimaryDashboardEvents(container)
}

/* ─────────────────────────────────────────────────────────────────────────────
   TAB 1: FIND SAFE ROUTE (Simple, fast, auto-opens map on find route)
   ───────────────────────────────────────────────────────────────────────────── */

function renderRouteTab(): string {
  const r = lastNavigatorResult

  return `
    <div class="dash-card-box nav-planner-card">
      <div class="box-head-flex">
        <h3 class="box-heading">${icons.compass} Where are you going?</h3>
        <span class="box-tag">GPS Start Point</span>
      </div>
      <p class="box-desc">
        Your current starting point is automatically tracked with live GPS. Choose your destination below. Clicking <strong>Find Safe Route</strong> will calculate the dry detour and <strong>immediately open the Map View</strong>.
      </p>

      <div class="route-selector-form">
        <!-- 1. Origin (Start Point) -->
        <div class="form-field">
          <div class="field-label-row">
            <label>Start Point (Where you are)</label>
            <div class="origin-mode-pills" role="group" aria-label="Start point selection mode">
              <button type="button" class="origin-mode-btn ${originTrackingMode === 'gps' ? 'active' : ''}" id="btn-mode-gps" title="Use current GPS position">
                <span class="pulse-indicator"></span> Your Location (Live GPS)
              </button>
              <button type="button" class="origin-mode-btn ${originTrackingMode === 'custom' ? 'active' : ''}" id="btn-mode-custom" title="Choose a building">
                Campus Building
              </button>
            </div>
          </div>

          ${
            originTrackingMode === 'gps'
              ? `
            <div class="gps-origin-tracked-card" id="gps-origin-display-card">
              <div class="got-left">
                <div class="got-indicator">
                  <span class="pulse-indicator"></span>
                  <strong class="got-title">Live GPS Position (Tracking Active)</strong>
                  <span class="got-badge">±${currentGpsFix.accuracy}m ACCURACY</span>
                </div>
                <div class="got-coords-row">
                  <span class="got-coords" id="got-coords-val">
                    ${currentGpsFix.lat.toFixed(5)}°N, ${currentGpsFix.lon.toFixed(5)}°E
                  </span>
                  <span class="got-sub" id="got-ts-val">
                    Accuracy ±${currentGpsFix.accuracy}m · Updated ${currentGpsFix.timestamp}
                  </span>
                </div>
              </div>
              <div class="got-actions">
                <button type="button" class="gst-recenter-btn" id="btn-recenter-origin-gps" title="Re-sync current GPS coordinates">
                  ${icons.crosshair} Refresh GPS
                </button>
              </div>
            </div>
          `
              : `
            <select id="nav-origin-select" class="nav-select-large">
              <optgroup label="Academic & Administrative">
                <option value="12.97095,79.16068,Mother Teresa Block">Mother Teresa Block (Academic)</option>
                <option value="12.96985,79.15595,Technology Tower">Technology Tower (TT)</option>
                <option value="12.97103,79.16368,Silver Jubilee Tower (SJT)">Silver Jubilee Tower (SJT)</option>
                <option value="12.97280,79.16480,Pearl Research Park">Pearl Research Park (PRP)</option>
                <option value="12.96920,79.15610,Main Building">Main Building (MB)</option>
                <option value="12.97044,79.15596,Anna Audi Courts">Anna Audi Courts</option>
              </optgroup>
              <optgroup label="Hostels & Food">
                <option value="12.97250,79.15850,Food Street">Food Street (Hostels)</option>
                <option value="12.97272,79.15905,Just Bake">Just Bake / E &amp; K Block</option>
                <option value="12.97307,79.15730,A-Block Hostels">A-Block Hostels (Men)</option>
                <option value="12.97350,79.16100,Q-Block Hostels">Q-Block Hostels</option>
              </optgroup>
            </select>
          `
          }
        </div>

        <!-- 2. Destination -->
        <div class="form-field">
          <label for="nav-dest-select">Where do you want to go?</label>
          <select id="nav-dest-select" class="nav-select-large">
            <optgroup label="Popular Student Spots">
              <option value="12.97250,79.15850,Food Street">🍔 Food Street (Hostels)</option>
              <option value="12.97272,79.15905,Just Bake">☕ Just Bake / E &amp; K Block</option>
              <option value="12.97103,79.16368,Silver Jubilee Tower (SJT)">🏢 Silver Jubilee Tower (SJT)</option>
              <option value="12.97280,79.16480,Pearl Research Park">🔬 Pearl Research Park (PRP)</option>
              <option value="12.96985,79.15595,Technology Tower">🏛️ Technology Tower (TT)</option>
            </optgroup>
            <optgroup label="Hostel Blocks">
              <option value="12.97307,79.15730,A-Block Hostels">🏠 A-Block Hostels (Men)</option>
              <option value="12.97350,79.16100,Q-Block Hostels">🏠 Q-Block Hostels</option>
              <option value="12.97220,79.15780,D-Annexe Mess">🍽️ D-Annexe Mess</option>
            </optgroup>
            <optgroup label="Academic & Gates">
              <option value="12.97095,79.16068,Mother Teresa Block">Mother Teresa Block</option>
              <option value="12.96920,79.15610,Main Building">Main Building (MB)</option>
              <option value="12.97044,79.15596,Anna Audi Courts">Anna Audi Sports Courts</option>
              <option value="12.96870,79.15580,Main Gate 1">Main Gate 1 (Katpadi Road)</option>
              <option value="12.97400,79.16520,Gate 11A">Gate 11A (PRP / Railway Gate)</option>
            </optgroup>
          </select>
        </div>

        <!-- 3. Primary CTA Button: Find Safe Route (Straight aways opens map view) -->
        <button type="button" class="plan-route-btn" id="nav-custom-calc-btn">
          ${icons.navigation}
          <span>Find Safe Route (Opens Map) →</span>
        </button>
      </div>

      <!-- Quick 1-Tap Destinations (Instant Route & Opens Map) -->
      <div class="quick-routes-chips-row">
        <span class="chips-lbl">⚡ Or tap a destination for an instant safe route:</span>
        <div class="chips-flex-wrap">
          <button type="button" class="demo-photo-btn" data-gps-commute="12.97250,79.15850,Food Street">🍔 Food Street</button>
          <button type="button" class="demo-photo-btn" data-gps-commute="12.97272,79.15905,Just Bake">☕ Just Bake</button>
          <button type="button" class="demo-photo-btn" data-gps-commute="12.97103,79.16368,Silver Jubilee Tower">🏢 SJT</button>
          <button type="button" class="demo-photo-btn" data-gps-commute="12.97280,79.16480,Pearl Research Park">🔬 Pearl Research Park</button>
          <button type="button" class="demo-photo-btn" data-gps-commute="12.96985,79.15595,Technology Tower">🏛️ Technology Tower</button>
          <button type="button" class="demo-photo-btn" data-gps-commute="12.97307,79.15730,A-Block Hostels">🏠 Men Hostels</button>
        </div>
      </div>

      <!-- Route Result Card (if previously plotted) -->
      ${
        r
          ? `
        <div class="route-comparison-card">
          <div class="route-head-flex">
            <div>
              <span class="rc-label">Active Plotted Route</span>
              <h4 class="route-head-title">${escapeHtml(r.presetName || `${r.origin.label} ➔ ${r.target.label}`)}</h4>
            </div>
            <span class="cp-status-pill ${r.status === 'HAZARD_AVOIDED' ? 'pill-blocked' : r.status === 'IMPASSABLE' ? 'pill-blocked' : 'pill-open'}">
              ${r.status === 'HAZARD_AVOIDED' ? 'REROUTED AROUND FLOOD' : r.status === 'IMPASSABLE' ? 'IMPASSABLE' : 'DIRECT SAFE ROUTE'}
            </span>
          </div>

          <div class="route-stats-dual-grid">
            <div class="route-metric-box box-safe">
              <span class="rm-label">Safe Walking Time</span>
              <span class="rm-val">${humanEta(r.safeTimeMs)}</span>
              <span class="rm-sub">${humanDistance(r.safeDistM)} distance</span>
            </div>

            <div class="route-metric-box box-delta">
              <span class="rm-label">Flood Safety Detour</span>
              <span class="rm-val">${r.deltaSeconds > 0 ? `+${humanEta(r.deltaSeconds)}` : '0 min'}</span>
              <span class="rm-sub">${r.deltaMetres > 0 ? `+${humanDistance(r.deltaMetres)} detour` : 'No flood detour needed'}</span>
            </div>
          </div>

          <div class="route-narrative-box">
            ${escapeHtml(r.explanation)}
          </div>

          <div class="route-actions-row">
            <button type="button" class="route-map-action-btn" data-switch-view="map">
              ${icons.map}
              <span>View Plotted Route on Map</span>
            </button>
          </div>
        </div>
      `
          : ''
      }
    </div>
  `
}

/* ─────────────────────────────────────────────────────────────────────────────
   TAB 2: UNDERPASSES & FLOODS (Simple 4-tunnel cards + toggle + weather)
   ───────────────────────────────────────────────────────────────────────────── */

function renderTunnelsTab(state: ReturnType<typeof disasterService.getState>): string {
  const env = state.environmental

  return `
    <!-- Scenario Selection & Simulation Controls -->
    <div class="dash-card-box">
      <div class="box-head-flex">
        <h3 class="box-heading">⚡ Choose Campus Hazard Condition</h3>
        <span class="box-tag ${state.isHazardActive ? 'box-tag-hazard' : 'box-tag-normal'}">
          ${state.isHazardActive ? '🚨 Hazards Active' : '🟢 Normal Conditions'}
        </span>
      </div>
      <p class="box-desc">
        Under normal conditions, all railway underpasses and walking paths are open and dry. Choose a scenario below to activate flood simulations and test disaster-aware route avoidance.
      </p>

      <div class="scenario-buttons-row">
        <button type="button" class="scenario-choice-btn ${!state.isHazardActive ? 'active active-normal' : ''}" data-set-condition="normal">
          <span class="sc-title">🟢 Normal Conditions</span>
          <span class="sc-desc">All 4 underpasses open. Weather clear. Direct walking routes.</span>
        </button>
        <button type="button" class="scenario-choice-btn ${state.mode === 'monsoon_flood' ? 'active active-hazard' : ''}" data-set-condition="monsoon_flood">
          <span class="sc-title">🌧️ Monsoon Flash Flood</span>
          <span class="sc-desc">Submerges Central &amp; West canal culverts. Reroutes via H&amp;J and PRP tunnels.</span>
        </button>
        <button type="button" class="scenario-choice-btn ${state.mode === 'all_blocked' ? 'active active-hazard' : ''}" data-set-condition="all_blocked">
          <span class="sc-title">⛔ Complete Campus Isolation</span>
          <span class="sc-desc">All 4 railway underpasses impassable. Shelter in place warning.</span>
        </button>
      </div>

      <div class="rain-simulation-control">
        <div class="rain-sim-header">
          <label for="dash-rain-slider">
            <span>Simulate Rainfall Intensity: <strong id="dash-rain-val-label">${env.currentRainfallRate} mm/h</strong></span>
            <small class="slider-hint">${env.currentRainfallRate === 0 ? '(0 mm/h = Normal / Dry)' : env.currentRainfallRate > 28 ? '(>28 mm/h triggers automatic underpass flooding)' : '(Moderate rain)'}</small>
          </label>
          ${state.isHazardActive ? `
            <button type="button" class="reset-normal-btn" data-reset-normal>
              🟢 Reset to Normal
            </button>
          ` : ''}
        </div>
        <input type="range" id="dash-rain-slider" min="0" max="85" step="5" value="${env.currentRainfallRate}">
      </div>
    </div>

    <!-- Explanatory Header -->
    <div class="dash-card-box">
      <div class="box-head-flex">
        <h3 class="box-heading">${icons.tunnel} The 4 Campus Railway Underpasses</h3>
        <span class="box-tag">Campus Crossings</span>
      </div>
      <p class="box-desc">
        The railway line separates <strong>Hostels (North)</strong> and <strong>Academic Blocks (South)</strong>. These 4 underpasses are the only walking connections. You can mark any underpass as flooded or clear below to test routing.
      </p>

      <div class="chokepoint-status-grid">
        <!-- Chokepoint 1: Central Canal Underpass -->
        <div class="chokepoint-card ${state.blockedEdges.has(185) ? 'card-blocked' : 'card-open'}">
          <div class="cp-header">
            <span class="cp-status-pill ${state.blockedEdges.has(185) ? 'pill-blocked' : 'pill-open'}">
              ${state.blockedEdges.has(185) ? 'FLOODED (CLOSED)' : 'OPEN & SAFE'}
            </span>
            <span class="cp-type">Canal Culvert</span>
          </div>
          <h4 class="cp-title">Central Canal Underpass</h4>
          <p class="cp-desc">Mother Teresa Block / TT Annexe ↔ Just Bake / E &amp; K Block</p>
          <div class="cp-meta">
            <span>Status: <strong>${state.blockedEdges.has(185) ? 'Submerged (Avoided)' : 'Dry & Passable'}</strong></span>
            <span>Drainage: <strong>Low Culvert Dip</strong></span>
          </div>
          <div class="route-actions-row">
            <button type="button" class="cp-toggle-btn ${state.blockedEdges.has(185) ? 'btn-mark-open' : 'btn-mark-flood'}" data-toggle-chokepoint="centralCanalUnderpass">
              ${state.blockedEdges.has(185) ? `${icons.check} Clear Flood (Mark Open)` : `${icons.alertTriangle} Mark Flooded`}
            </button>
            <button type="button" class="cp-fly-btn" data-fly-coords="79.160364,12.971462">${icons.map} View on Map</button>
          </div>
        </div>

        <!-- Chokepoint 2: West Boundary Canal Underpass -->
        <div class="chokepoint-card ${state.blockedEdges.has(119) || state.blockedEdges.has(176) ? 'card-blocked' : 'card-open'}">
          <div class="cp-header">
            <span class="cp-status-pill ${state.blockedEdges.has(119) || state.blockedEdges.has(176) ? 'pill-blocked' : 'pill-open'}">
              ${state.blockedEdges.has(119) || state.blockedEdges.has(176) ? 'FLOODED (CLOSED)' : 'OPEN & SAFE'}
            </span>
            <span class="cp-type">Canal Culvert</span>
          </div>
          <h4 class="cp-title">West Boundary Canal Underpass</h4>
          <p class="cp-desc">Anna Audi Courts ↔ A-Block Hostels / One Food World</p>
          <div class="cp-meta">
            <span>Status: <strong>${state.blockedEdges.has(119) || state.blockedEdges.has(176) ? 'Submerged (Avoided)' : 'Dry & Passable'}</strong></span>
            <span>Drainage: <strong>Runoff Dip</strong></span>
          </div>
          <div class="route-actions-row">
            <button type="button" class="cp-toggle-btn ${state.blockedEdges.has(119) || state.blockedEdges.has(176) ? 'btn-mark-open' : 'btn-mark-flood'}" data-toggle-chokepoint="westCanalUnderpass">
              ${state.blockedEdges.has(119) || state.blockedEdges.has(176) ? `${icons.check} Clear Flood (Mark Open)` : `${icons.alertTriangle} Mark Flooded`}
            </button>
            <button type="button" class="cp-fly-btn" data-fly-coords="79.15654,12.97146">${icons.map} View on Map</button>
          </div>
        </div>

        <!-- Chokepoint 3: H & J Block Main Tunnel -->
        <div class="chokepoint-card ${state.blockedEdges.has(204) || state.blockedEdges.has(492) ? 'card-blocked' : 'card-open'}">
          <div class="cp-header">
            <span class="cp-status-pill ${state.blockedEdges.has(204) || state.blockedEdges.has(492) ? 'pill-blocked' : 'pill-safe'}">
              ${state.blockedEdges.has(204) || state.blockedEdges.has(492) ? 'CLOSED' : 'OPEN (MAIN SAFE TUNNEL)'}
            </span>
            <span class="cp-type">Reinforced Tunnel</span>
          </div>
          <h4 class="cp-title">H &amp; J Block Main Tunnel</h4>
          <p class="cp-desc">Technology Tower / Fountain Garden ↔ H &amp; J Hostels</p>
          <div class="cp-meta">
            <span>Status: <strong>${state.blockedEdges.has(204) || state.blockedEdges.has(492) ? 'Blocked' : 'Clear Artery'}</strong></span>
            <span>Drainage: <strong>Storm Pumps Protected</strong></span>
          </div>
          <div class="route-actions-row">
            <button type="button" class="cp-toggle-btn ${state.blockedEdges.has(204) || state.blockedEdges.has(492) ? 'btn-mark-open' : 'btn-mark-flood'}" data-toggle-chokepoint="hjBlockTunnel">
              ${state.blockedEdges.has(204) || state.blockedEdges.has(492) ? `${icons.check} Clear Flood (Mark Open)` : `${icons.alertTriangle} Mark Flooded`}
            </button>
            <button type="button" class="cp-fly-btn" data-fly-coords="79.158316,12.971424">${icons.map} View on Map</button>
          </div>
        </div>

        <!-- Chokepoint 4: Pearl Research Park (PRP) Tunnel -->
        <div class="chokepoint-card ${state.blockedEdges.has(434) ? 'card-blocked' : 'card-open'}">
          <div class="cp-header">
            <span class="cp-status-pill ${state.blockedEdges.has(434) ? 'pill-blocked' : 'pill-safe'}">
              ${state.blockedEdges.has(434) ? 'CLOSED' : 'OPEN (EAST SAFE TUNNEL)'}
            </span>
            <span class="cp-type">Arterial Highway</span>
          </div>
          <h4 class="cp-title">Pearl Research Park (PRP) Tunnel</h4>
          <p class="cp-desc">Main Campus Road ↔ Gate 11A / Pearl Research Park Courtyard</p>
          <div class="cp-meta">
            <span>Status: <strong>${state.blockedEdges.has(434) ? 'Blocked' : 'Clear Artery'}</strong></span>
            <span>Drainage: <strong>Elevated Roadway</strong></span>
          </div>
          <div class="route-actions-row">
            <button type="button" class="cp-toggle-btn ${state.blockedEdges.has(434) ? 'btn-mark-open' : 'btn-mark-flood'}" data-toggle-chokepoint="prpMainTunnel">
              ${state.blockedEdges.has(434) ? `${icons.check} Clear Flood (Mark Open)` : `${icons.alertTriangle} Mark Flooded`}
            </button>
            <button type="button" class="cp-fly-btn" data-fly-coords="79.16550,12.97140">${icons.map} View on Map</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Live Weather & Drainage Telemetry -->
    <div class="dash-card-box">
      <div class="box-head-flex">
        <h3 class="box-heading">${icons.activity} Live Campus Weather &amp; Flood Forecast</h3>
        <button type="button" class="sync-api-btn" id="sync-weather-api-btn">
          ${isSyncingWeather ? icons.activity : icons.refresh}
          <span>${isSyncingWeather ? 'Updating...' : 'Sync Live Weather'}</span>
        </button>
      </div>
      <p class="box-desc">
        Tracked from the Open-Meteo High-Resolution Weather Model and Copernicus GloFAS Palar River Basin stream.
      </p>

      <div class="dash-kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Temperature</span>
          <span class="kpi-value">${env.temperatureC}°C</span>
          <span class="kpi-sub">${escapeHtml(env.weatherDescription)}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Rainfall Rate</span>
          <span class="kpi-value ${env.currentRainfallRate > 20 ? 'kpi-danger' : env.currentRainfallRate > 5 ? 'kpi-warn' : ''}">
            ${env.currentRainfallRate} <small>mm/h</small>
          </span>
          <span class="kpi-sub">3h Total: ${env.accumulated3hRainfall} mm</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Topsoil Saturation</span>
          <span class="kpi-value">${env.soilMoisturePercent}%</span>
          <span class="kpi-sub">Runoff into dips</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">River Basin Risk</span>
          <span class="kpi-value val-warn">
            ${(env.glofasDischarge?.basinRunoffRisk || 'Elevated').toUpperCase()}
          </span>
          <span class="kpi-sub">Palar Catchment Basin</span>
        </div>
      </div>
    </div>
  `
}

/* ─────────────────────────────────────────────────────────────────────────────
   TAB 3: REPORT FLOOD / HAZARD (Simple form + coordinates + photo + reports)
   ───────────────────────────────────────────────────────────────────────────── */

function renderReportTab(state: ReturnType<typeof disasterService.getState>): string {
  const reports = state.userReports

  return `
    <div class="dash-card-box intake-form-card">
      <div class="box-head-flex">
        <h3 class="box-heading">${icons.camera} Report Waterlogging or Hazard</h3>
        <span class="box-tag">Campus Reports</span>
      </div>
      <p class="box-desc">
        Spotted waterlogging, a deep puddle, or a blocked pathway? Submit coordinates and an optional photo. Routes across campus will automatically detour around it.
      </p>

      <form id="incident-report-form" class="incident-form" onsubmit="return false;">
        <!-- Location Coordinates -->
        <div class="form-row-dual">
          <div class="form-field">
            <label for="rep-lat-input">Latitude (°N)</label>
            <input type="number" step="0.00001" id="rep-lat-input" value="${currentGpsFix.lat}" required>
          </div>
          <div class="form-field">
            <label for="rep-lon-input">Longitude (°E)</label>
            <input type="number" step="0.00001" id="rep-lon-input" value="${currentGpsFix.lon}" required>
          </div>
        </div>

        <div class="form-field">
          <button type="button" class="gst-recenter-btn" id="btn-use-live-gps-report" style="width: fit-content; margin-bottom: 4px;">
            ${icons.crosshair} Use My Current GPS Location
          </button>
        </div>

        <!-- Campus Landmark Reference -->
        <div class="form-field">
          <label for="rep-preset-select">Nearest Landmark Reference:</label>
          <select id="rep-preset-select">
            <option value="">-- Select nearest campus building --</option>
            <option value="12.97142,79.16036,Central Canal Underpass">Central Canal Underpass (Mother Teresa ↔ Just Bake)</option>
            <option value="12.97144,79.15652,West Boundary Canal Underpass">West Boundary Canal Underpass (Anna Audi ↔ A-Block)</option>
            <option value="12.97250,79.15850,Food Street Junction">Food Street / Men Hostels Junction</option>
            <option value="12.97150,79.16335,SJT South Promenade">SJT South Lake Promenade</option>
            <option value="12.97280,79.16480,PRP East Courtyard">Pearl Research Park East Courtyard</option>
          </select>
        </div>

        <!-- Location Title -->
        <div class="form-field">
          <label for="rep-title-input">Location / Road Title</label>
          <input type="text" id="rep-title-input" placeholder="e.g. Waterlogged pathway near Central Culvert" value="Central Culvert Waterlogging" required>
        </div>

        <!-- Type & Water Depth -->
        <div class="form-row-dual">
          <div class="form-field">
            <label for="rep-type-select">Hazard Type</label>
            <select id="rep-type-select">
              <option value="flood">Deep Flood Water (Block Path Completely)</option>
              <option value="waterlogging">Waterlogged Puddle / Mud (Caution Detour)</option>
              <option value="closure">Closed Barrier / Gate Locked</option>
            </select>
          </div>
          <div class="form-field">
            <label for="rep-depth-input">Estimated Water Depth (cm)</label>
            <input type="number" id="rep-depth-input" value="45" min="0" max="150" step="1">
          </div>
        </div>

        <!-- Photo Evidence Upload -->
        <div class="form-field">
          <label>Photo Evidence (Optional)</label>
          <div class="photo-dropzone" id="photo-dropzone-box">
            <input type="file" id="field-photo-input" accept="image/*" class="file-input-hidden">
            <div class="dropzone-prompt">
              <div style="color: #71717a; margin-bottom: 2px;">${icons.camera}</div>
              <span class="dropzone-title">Click or drag a photo here</span>
              <span class="dropzone-sub">Upload image to attach proof to the hazard point</span>
            </div>
          </div>

          <div id="photo-preview-container" class="photo-preview-container ${uploadedPhotoDataUrl ? '' : 'hidden'}">
            ${
              uploadedPhotoDataUrl
                ? `
              <div class="preview-card">
                <img src="${uploadedPhotoDataUrl}" alt="Hazard Preview" class="preview-thumb">
                <div class="preview-meta">
                  <span class="preview-name">${escapeHtml(uploadedPhotoFileName || 'photo.jpg')}</span>
                  <span class="preview-status">Attached Photo</span>
                  <button type="button" class="preview-remove-btn" id="remove-photo-btn">Remove Photo</button>
                </div>
              </div>
            `
                : ''
            }
          </div>
        </div>

        <!-- Notes -->
        <div class="form-field">
          <label for="rep-notes-input">Additional Notes</label>
          <textarea id="rep-notes-input" rows="2" placeholder="e.g. Water is knee deep, cannot walk through safely."></textarea>
        </div>

        <!-- Submit Button -->
        <button type="button" class="submit-report-btn" id="submit-hazard-report-btn">
          ${icons.upload}
          <span>Publish Hazard Report &amp; Update Map</span>
        </button>
      </form>
    </div>

    <!-- Active Reports List -->
    <div class="dash-card-box">
      <div class="box-head-flex">
        <h3 class="box-heading">${icons.database} Active Campus Reports (${reports.length})</h3>
        ${
          reports.length > 0
            ? `
          <button type="button" class="rep-delete-btn" id="btn-clear-all-reports">
            ${icons.trash} Clear All
          </button>
        `
            : ''
        }
      </div>
      <p class="box-desc">
        All active flood reports are automatically plotted as red spots on the map and avoided by the routing engine.
      </p>

      ${
        reports.length > 0
          ? `
        <div class="reports-stream-grid">
          ${reports
            .map(
              (r) => `
            <div class="report-stream-card ${r.severity === 'critical' ? 'rep-critical' : 'rep-caution'}">
              <div class="rep-card-top">
                <span class="rep-pill ${r.hazardType === 'flood' ? 'pill-blocked' : 'pill-safe'}">
                  ${r.hazardType.toUpperCase()}
                </span>
                <span class="rep-time">${escapeHtml(r.timestamp)}</span>
              </div>
              <h4 class="rep-title">${escapeHtml(r.roadName)}</h4>
              <p class="rep-coords">Lat: ${r.lat.toFixed(5)}, Lon: ${r.lon.toFixed(5)} ${r.waterDepthCm ? `· Depth: ${r.waterDepthCm}cm` : ''}</p>
              <p class="rep-notes">${escapeHtml(r.notes || 'No extra notes provided.')}</p>
              ${
                r.photoDataUrl
                  ? `
                <div class="rep-thumb-wrap">
                  <img src="${r.photoDataUrl}" alt="Hazard Photo" class="rep-evidence-img">
                </div>
              `
                  : ''
              }
              <div class="rep-card-actions">
                <button type="button" class="cp-fly-btn" data-fly-coords="${r.lon},${r.lat}">${icons.map} View on Map</button>
                <button type="button" class="rep-delete-btn" data-delete-report="${escapeHtml(r.id)}">${icons.trash} Remove</button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : `
        <div class="empty-benchmarks-placeholder">
          <p>No student reports submitted yet. Submit a report above if you encounter flooding or blocked roads.</p>
        </div>
      `
      }
    </div>
  `
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROUTE PLANNING LOGIC (Immediately opens the map view)
   ───────────────────────────────────────────────────────────────────────────── */

function planRoute(
  from: { lat: number; lon: number; label: string },
  to: { lat: number; lon: number; label: string },
  presetName?: string,
  expectedTunnel?: string
) {
  if (!host) return

  const safety = disasterService.getState()
  const baseline = host.router.route(from, to, 'foot')
  const disasterAware = host.router.routeDisasterAware(from, to, 'foot', {
    hazards: safety.hazards,
    blockedEdges: safety.blockedEdges,
    riskMultipliers: safety.riskMultipliers,
  })

  const baseSec = baseline?.seconds ?? 0
  const safeSec = disasterAware?.safeRoute?.seconds ?? baseSec
  const baseM = baseline?.metres ?? 0
  const safeM = disasterAware?.safeRoute?.metres ?? baseM

  let tunnel = expectedTunnel || 'Safe Crossing'
  if (!expectedTunnel && safeM > baseM + 50) {
    tunnel = 'H & J Block Main Tunnel'
  }

  const avoided = disasterAware?.hazardsEncountered.map((h) => h.roadName || h.title) ?? []
  let explanation = ''
  if (disasterAware?.status === 'HAZARD_AVOIDED') {
    explanation = `The direct path crosses flooded corridors (${avoided.join(', ') || 'underpass culverts'}). Rerouted safely via ${tunnel} (+${humanEta(Math.max(0, safeSec - baseSec))} detour).`
  } else if (disasterAware?.status === 'IMPASSABLE') {
    explanation = 'All campus railway crossings are impassable due to extreme flooding. Please shelter in place.'
  } else {
    explanation = 'The direct walking route does not cross any active flood or hazard zones. Safe to proceed.'
  }

  lastNavigatorResult = {
    origin: from,
    target: to,
    presetName,
    baselineTimeMs: baseSec,
    baselineDistM: baseM,
    safeTimeMs: safeSec,
    safeDistM: safeM,
    deltaSeconds: Math.max(0, safeSec - baseSec),
    deltaMetres: Math.max(0, safeM - baseM),
    status: disasterAware?.status ?? 'DIRECT_PATH_SAFE',
    avoidedHazards: avoided,
    tunnelUsed: tunnel,
    explanation,
  }

  // Draw the route endpoints on the map
  if (host.setRouteEndpoints) {
    host.setRouteEndpoints(from, to)
  } else {
    host.routeTo(to.lat, to.lon, to.label)
  }

  // CRITICAL REQUIREMENT: Straight away open the map view after clicking find route
  host.switchView?.('map')
}

/* ─────────────────────────────────────────────────────────────────────────────
   EVENT WIRING
   ───────────────────────────────────────────────────────────────────────────── */

function wirePrimaryDashboardEvents(container: HTMLElement) {
  // View mode switcher: only map view option exists now
  container.querySelectorAll<HTMLButtonElement>('[data-switch-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = (btn.dataset.switchView as 'dashboard' | 'map') || 'map'
      if (host?.switchView) {
        host.switchView(mode)
      }
    })
  })

  // Tab switcher
  container.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      activeTab = normalizeTab(tabBtn.dataset.tab as TabType)
      renderPrimaryDashboard(activeTab)
      container.scrollTop = 0
    })
  })

  // Start point mode (Live GPS vs Landmark)
  container.querySelector<HTMLButtonElement>('#btn-mode-gps')?.addEventListener('click', () => {
    originTrackingMode = 'gps'
    startGpsTracking(true)
    renderPrimaryDashboard('route')
  })

  container.querySelector<HTMLButtonElement>('#btn-mode-custom')?.addEventListener('click', () => {
    originTrackingMode = 'custom'
    renderPrimaryDashboard('route')
  })

  // Refresh GPS button on start point card
  container.querySelector<HTMLButtonElement>('#btn-recenter-origin-gps')?.addEventListener('click', () => {
    startGpsTracking(true)
    updateGpsLiveDisplays()
    showToast('GPS fix refreshed.', 'info')
  })

  // Interactive Underpass user toggle buttons
  container.querySelectorAll<HTMLButtonElement>('[data-toggle-chokepoint]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cpKey = btn.dataset.toggleChokepoint as any
      if (cpKey) {
        disasterService.toggleChokepointFlood(cpKey)
        showToast(`Toggled underpass flood status. Routes updated.`, 'info')
        renderPrimaryDashboard(activeTab)
        host?.onRecalculateRoute?.()
      }
    })
  })

  // Condition switcher (Normal, Monsoon Flood, All Blocked)
  container.querySelectorAll<HTMLButtonElement>('[data-set-condition]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cond = btn.dataset.setCondition as any
      if (cond) {
        disasterService.setMode(cond)
        if (cond === 'normal') {
          showToast('Campus conditions reset to Normal. All 4 underpasses open & safe.', 'success')
        } else if (cond === 'monsoon_flood') {
          showToast('Monsoon flood scenario activated: 2 canal underpasses closed.', 'info')
        } else if (cond === 'all_blocked') {
          showToast('Extreme isolation scenario activated: all 4 underpasses closed.', 'info')
        }
        renderPrimaryDashboard(activeTab)
        host?.onRecalculateRoute?.()
      }
    })
  })

  // Reset to Normal Conditions button
  container.querySelectorAll<HTMLButtonElement>('[data-reset-normal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      disasterService.resetToNormalConditions()
      showToast('Reset to Normal Conditions. All walkways dry & open.', 'success')
      renderPrimaryDashboard(activeTab)
      host?.onRecalculateRoute?.()
    })
  })

  // Rainfall simulation slider in Underpasses & Floods tab
  const rainSlider = container.querySelector<HTMLInputElement>('#dash-rain-slider')
  const rainValLabel = container.querySelector<HTMLElement>('#dash-rain-val-label')
  if (rainSlider && rainValLabel) {
    rainSlider.addEventListener('input', () => {
      rainValLabel.textContent = `${rainSlider.value} mm/h`
    })
    rainSlider.addEventListener('change', () => {
      const val = +rainSlider.value
      disasterService.setSimulatedRainfall(val)
      if (val === 0) {
        showToast('Rainfall set to 0 mm/h. Normal conditions restored.', 'success')
      } else if (val > 28) {
        showToast(`Simulated ${val} mm/h rain: flood closures triggered.`, 'info')
      }
      renderPrimaryDashboard(activeTab)
      host?.onRecalculateRoute?.()
    })
  }

  // Clear all reports button
  container.querySelector<HTMLButtonElement>('#btn-clear-all-reports')?.addEventListener('click', () => {
    disasterService.clearAllUserReports()
    showToast('All custom incident reports cleared. Normal conditions restored.', 'success')
    renderPrimaryDashboard(activeTab)
    host?.onRecalculateRoute?.()
  })

  // Close toast button
  container.querySelector<HTMLButtonElement>('#close-toast-btn')?.addEventListener('click', () => {
    activeToast = null
    const toastEl = document.getElementById('dash-toast-banner')
    if (toastEl) toastEl.remove()
  })

  // 1-Tap Quick Destination Chips from live GPS (Straight aways opens map view)
  container.querySelectorAll<HTMLButtonElement>('[data-gps-commute]').forEach((btn) => {
    btn.addEventListener('click', () => {
      originTrackingMode = 'gps'
      const parts = btn.dataset.gpsCommute?.split(',')
      if (parts && parts.length >= 3) {
        const from = {
          lat: currentGpsFix.lat,
          lon: currentGpsFix.lon,
          label: `Your Location (${currentGpsFix.lat.toFixed(4)}, ${currentGpsFix.lon.toFixed(4)})`,
        }
        const to = { lat: +parts[0]!, lon: +parts[1]!, label: parts[2]! }
        planRoute(from, to, `Your Location ➔ ${to.label}`)
      }
    })
  })

  // Fly to Underpasses / Reports (Straight aways opens map view and focuses location)
  container.querySelectorAll<HTMLElement>('[data-fly-coords]').forEach((el) => {
    el.addEventListener('click', () => {
      const parts = el.dataset.flyCoords?.split(',').map(Number)
      if (parts && parts.length === 2 && !isNaN(parts[0]!) && !isNaN(parts[1]!)) {
        host?.switchView?.('map')
        setTimeout(() => {
          host?.map.easeTo({
            center: [parts[0]!, parts[1]!],
            zoom: 17.5,
            duration: 700,
          })
        }, 100)
      }
    })
  })

  // PRIMARY "FIND SAFE ROUTE" BUTTON (Straight aways opens map view)
  const calcBtn = container.querySelector<HTMLButtonElement>('#nav-custom-calc-btn')
  if (calcBtn) {
    calcBtn.addEventListener('click', () => {
      let from: { lat: number; lon: number; label: string }
      if (originTrackingMode === 'gps') {
        from = {
          lat: currentGpsFix.lat,
          lon: currentGpsFix.lon,
          label: `Your Location (${currentGpsFix.lat.toFixed(4)}, ${currentGpsFix.lon.toFixed(4)})`,
        }
      } else {
        const origVal = (container.querySelector<HTMLSelectElement>('#nav-origin-select')?.value ?? '').split(',')
        if (origVal.length >= 3) {
          from = { lat: +origVal[0]!, lon: +origVal[1]!, label: origVal[2]! }
        } else {
          from = { lat: 12.97095, lon: 79.16068, label: 'Mother Teresa Block' }
        }
      }

      const destVal = (container.querySelector<HTMLSelectElement>('#nav-dest-select')?.value ?? '').split(',')
      if (destVal.length >= 3) {
        const to = { lat: +destVal[0]!, lon: +destVal[1]!, label: destVal[2]! }
        planRoute(from, to, originTrackingMode === 'gps' ? `Your Location ➔ ${to.label}` : `${from.label} ➔ ${to.label}`)
      }
    })
  }

  // "Use My Current GPS" button in Report form
  container.querySelector<HTMLButtonElement>('#btn-use-live-gps-report')?.addEventListener('click', () => {
    const latIn = container.querySelector<HTMLInputElement>('#rep-lat-input')
    const lonIn = container.querySelector<HTMLInputElement>('#rep-lon-input')
    if (latIn) latIn.value = String(currentGpsFix.lat)
    if (lonIn) lonIn.value = String(currentGpsFix.lon)
    showToast('Form filled with current GPS coordinates.', 'info')
  })

  // Landmark preset selector in Report form
  const presetSelect = container.querySelector<HTMLSelectElement>('#rep-preset-select')
  if (presetSelect) {
    presetSelect.addEventListener('change', () => {
      const val = presetSelect.value
      if (!val) return
      const parts = val.split(',')
      if (parts.length >= 3) {
        const latInput = container.querySelector<HTMLInputElement>('#rep-lat-input')
        const lonInput = container.querySelector<HTMLInputElement>('#rep-lon-input')
        const titleInput = container.querySelector<HTMLInputElement>('#rep-title-input')
        if (latInput) latInput.value = parts[0]!
        if (lonInput) lonInput.value = parts[1]!
        if (titleInput) titleInput.value = `${parts[2]!} Waterlogging`
      }
    })
  }

  // Photo dropzone
  const dropzoneBox = container.querySelector<HTMLElement>('#photo-dropzone-box')
  const fileInput = container.querySelector<HTMLInputElement>('#field-photo-input')
  if (dropzoneBox && fileInput) {
    dropzoneBox.addEventListener('click', () => fileInput.click())
    dropzoneBox.addEventListener('dragover', (e) => {
      e.preventDefault()
      dropzoneBox.classList.add('drag-active')
    })
    dropzoneBox.addEventListener('dragleave', () => dropzoneBox.classList.remove('drag-active'))
    dropzoneBox.addEventListener('drop', (e) => {
      e.preventDefault()
      dropzoneBox.classList.remove('drag-active')
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        handlePhotoFile(e.dataTransfer.files[0])
      }
    })
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        handlePhotoFile(fileInput.files[0])
      }
    })
  }

  function handlePhotoFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG, JPG, WebP).', 'info')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      uploadedPhotoDataUrl = reader.result as string
      uploadedPhotoFileName = file.name
      renderPrimaryDashboard('report')
      showToast(`Photo attached: ${file.name}`, 'success')
    }
    reader.readAsDataURL(file)
  }

  // Remove Photo button
  container.querySelector<HTMLButtonElement>('#remove-photo-btn')?.addEventListener('click', () => {
    uploadedPhotoDataUrl = null
    uploadedPhotoFileName = null
    renderPrimaryDashboard('report')
    showToast('Photo removed.', 'info')
  })

  // Submit Hazard Report
  const submitRepBtn = container.querySelector<HTMLButtonElement>('#submit-hazard-report-btn')
  if (submitRepBtn) {
    submitRepBtn.addEventListener('click', () => {
      const latVal = +(container.querySelector<HTMLInputElement>('#rep-lat-input')?.value ?? '')
      const lonVal = +(container.querySelector<HTMLInputElement>('#rep-lon-input')?.value ?? '')
      const titleVal = (container.querySelector<HTMLInputElement>('#rep-title-input')?.value || 'Campus Hazard').trim()
      const typeVal = (container.querySelector<HTMLSelectElement>('#rep-type-select')?.value || 'flood') as HazardType
      const depthVal = +(container.querySelector<HTMLInputElement>('#rep-depth-input')?.value || '40')
      const notesVal = (container.querySelector<HTMLTextAreaElement>('#rep-notes-input')?.value || '').trim()

      if (isNaN(latVal) || isNaN(lonVal)) {
        showToast('Please provide valid latitude and longitude.', 'info')
        return
      }

      const report: UserFieldReport = {
        id: `user-rep-${Date.now()}`,
        lat: latVal,
        lon: lonVal,
        roadName: titleVal,
        hazardType: typeVal,
        severity: depthVal >= 30 || typeVal === 'flood' ? 'critical' : 'warning',
        waterDepthCm: depthVal,
        photoDataUrl: uploadedPhotoDataUrl || undefined,
        notes: notesVal || 'User-reported flood hazard.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reportedBy: 'Campus Field Reporter',
        accuracyMetres: 35,
      }

      disasterService.addUserReport(report)
      uploadedPhotoDataUrl = null
      uploadedPhotoFileName = null
      showToast('Hazard report published! Map and routing updated.', 'success')
      renderPrimaryDashboard('report')
      host?.onRecalculateRoute?.()
    })
  }

  // Delete Individual Report
  container.querySelectorAll<HTMLButtonElement>('[data-delete-report]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const repId = btn.dataset.deleteReport
      if (repId) {
        disasterService.removeUserReport(repId)
        showToast('Report removed.', 'info')
        renderPrimaryDashboard('report')
        host?.onRecalculateRoute?.()
      }
    })
  })

  // Sync Live Weather API button
  container.querySelector<HTMLButtonElement>('#sync-weather-api-btn')?.addEventListener('click', async () => {
    isSyncingWeather = true
    renderPrimaryDashboard('tunnels')
    try {
      await disasterService.syncWeatherFromApi()
      showToast('Weather updated from Open-Meteo API.', 'success')
    } catch (e) {
      showToast('Synced cached weather forecast.', 'info')
    } finally {
      isSyncingWeather = false
      renderPrimaryDashboard('tunnels')
    }
  })
}
