import type { Map as MapLibreMap } from 'maplibre-gl'
import { disasterService, type DisasterState } from '../disaster/service'
import type { HazardZone, DisasterScenarioId } from '../disaster/types'

interface DisasterPanelHost {
  map: MapLibreMap
  onRecalculateRoute?: () => void
}

let host: DisasterPanelHost | null = null

export function initDisasterPanel(h: DisasterPanelHost) {
  host = h
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function showDisasterPanel() {
  const panel = document.getElementById('panel')
  if (!panel) return

  const state = disasterService.getState()
  panel.hidden = false
  panel.innerHTML = renderPanelContent(state)
  wirePanelEvents(panel)
}

function renderPanelContent(state: DisasterState): string {
  const env = state.environmental
  const isLive = state.isLive

  const statusBadge = isLive
    ? `<span class="badge-live"><span class="pulse-dot"></span> LIVE METEOROLOGICAL FEED</span>`
    : `<span class="badge-sim"><span class="sim-dot"></span> VERIFIED DEMONSTRATION SIMULATION</span>`

  const cardsHtml = state.hazards.length
    ? state.hazards.map((h) => renderHazardCard(h)).join('')
    : `<div class="empty-hazards">
         <div class="empty-icon">🟢</div>
         <p><strong>No Critical Hazards Active</strong></p>
         <p class="p-note">All campus paths and railway crossings are clear and safe under current conditions.</p>
       </div>`

  return `
    <article class="p-card disaster-panel-card">
      <header class="p-head">
        <div class="p-title-wrap">
          <h2 class="p-title">🚨 Live Disaster & Flood Monitoring</h2>
          <p class="p-sub">Real-Time Environmental Hazard Tracking & Route Safety</p>
        </div>
        <button type="button" class="p-close" aria-label="Close panel" data-close-panel>&times;</button>
      </header>

      <div class="disaster-status-banner">
        ${statusBadge}
        <span class="last-updated">Updated: ${escapeHtml(state.lastUpdated)}</span>
      </div>

      <!-- Live Environmental Weather Metrics -->
      <div class="weather-metrics-grid">
        <div class="metric-card">
          <span class="metric-label">Rainfall Rate</span>
          <span class="metric-val ${env.currentRainfallRate > 25 ? 'val-danger' : env.currentRainfallRate > 5 ? 'val-warn' : ''}">
            ${env.currentRainfallRate} <small>mm/h</small>
          </span>
        </div>
        <div class="metric-card">
          <span class="metric-label">3h Accumulation</span>
          <span class="metric-val">${env.accumulated3hRainfall} <small>mm</small></span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Soil Saturation</span>
          <span class="metric-val">${env.soilMoisturePercent}%</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Temperature</span>
          <span class="metric-val">${env.temperatureC}°C</span>
        </div>
      </div>

      <div class="weather-condition-row">
        <span><strong>Condition:</strong> ${escapeHtml(env.weatherDescription)}</span>
        <span class="weather-source">Source: ${escapeHtml(env.source)}</span>
      </div>

      <!-- Demonstration Scenario / Mode Switcher -->
      <section class="disaster-section">
        <h3 class="section-title">Select Disaster Scenario / Test Mode</h3>
        <div class="scenario-buttons">
          <button type="button" class="scenario-btn ${state.mode === 'monsoon_flood' ? 'active' : ''}" data-scenario="monsoon_flood">
            🌧️ Scenario 1: Monsoon Flash Flood (2 Canal Underpasses Closed)
          </button>
          <button type="button" class="scenario-btn ${state.mode === 'all_blocked' ? 'active' : ''}" data-scenario="all_blocked">
            ⛔ Scenario 2: Complete Isolation (All Corridors Closed)
          </button>
          <button type="button" class="scenario-btn ${state.mode === 'live' ? 'active' : ''}" data-scenario="live">
            📡 Live Open-Meteo Weather Mode
          </button>
        </div>

        <div class="rain-slider-wrap">
          <label for="rain-slider">
            <span>Simulate Rainfall Intensity: <strong id="rain-val-label">${env.currentRainfallRate} mm/h</strong></span>
            <small class="slider-hint">(>28 mm/h triggers automatic underpass flooding prediction)</small>
          </label>
          <input type="range" id="rain-slider" min="0" max="85" step="5" value="${env.currentRainfallRate}">
        </div>
      </section>

      <!-- Active Alerts List -->
      <section class="disaster-section">
        <div class="section-header-flex">
          <h3 class="section-title">Active Hazard & Flood Alerts (${state.hazards.length})</h3>
          <button type="button" class="recalc-btn-mini" data-recalc-route title="Re-evaluate active route with current hazards">
            🔄 Recalculate Route
          </button>
        </div>
        <div class="hazard-cards-list">
          ${cardsHtml}
        </div>
      </section>

      <!-- Safe Corridors Reference -->
      <section class="disaster-section safe-corridors-box">
        <h3 class="section-title">🛡️ High-Clearance Safe Arteries</h3>
        <p class="safe-note">These reinforced railway crossings remain operational during flash flood conditions:</p>
        <ul class="safe-corridor-list">
          <li data-fly-to="79.15830,12.97140">
            <strong>H & J Block Main Tunnel:</strong> High-clearance pumped culvert connecting Technology Tower ↔ H/J Hostels.
          </li>
          <li data-fly-to="79.16550,12.97140">
            <strong>Pearl Research Park (PRP) Tunnel:</strong> Grade-separated arterial road connecting Gate 11A ↔ PRP.
          </li>
        </ul>
      </section>

      <footer class="disaster-footer">
        <p class="p-note">
          Official Emergency Data: In actual crisis, obey local safety officers and campus security.
          Data refreshed on demand via Open-Meteo & verified hydrological run-off model.
        </p>
      </footer>
    </article>
  `
}

function renderHazardCard(h: HazardZone): string {
  const isClosed = h.status === 'confirmed_closed'
  const sevClass = `sev-${h.severity}`
  const statusLabel = isClosed ? 'CONFIRMED ROAD CLOSURE' : 'WATERLOGGING CAUTION'

  return `
    <div class="hazard-card ${sevClass}" data-fly-to="${h.center[0]},${h.center[1]}">
      <div class="h-card-header">
        <span class="h-card-badge ${isClosed ? 'badge-closed' : 'badge-caution'}">${statusLabel}</span>
        <span class="h-card-sev">${h.severity.toUpperCase()}</span>
      </div>
      <h4 class="h-card-title">${escapeHtml(h.title)}</h4>
      <div class="h-card-meta">
        <span>📍 <strong>Affected Road:</strong> ${escapeHtml(h.roadName)}</span>
        ${h.waterDepthCm ? `<span>🌊 <strong>Water Depth:</strong> ~${h.waterDepthCm} cm</span>` : ''}
      </div>
      <p class="h-card-desc">${escapeHtml(h.description)}</p>
      <div class="h-card-foot">
        <span class="h-card-source">Source: ${escapeHtml(h.source)}</span>
        <span class="h-card-jump">Tap to view on map ↗</span>
      </div>
    </div>
  `
}

function wirePanelEvents(panel: HTMLElement) {
  // Close button
  panel.querySelector('[data-close-panel]')?.addEventListener('click', () => {
    panel.hidden = true
  })

  // Scenario Buttons
  panel.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.scenario as DisasterScenarioId
      disasterService.setMode(mode)
      showDisasterPanel()
      host?.onRecalculateRoute?.()
    })
  })

  // Rainfall Slider
  const slider = panel.querySelector<HTMLInputElement>('#rain-slider')
  const valLabel = panel.querySelector<HTMLElement>('#rain-val-label')
  if (slider && valLabel) {
    slider.addEventListener('input', () => {
      valLabel.textContent = `${slider.value} mm/h`
    })
    slider.addEventListener('change', () => {
      disasterService.setSimulatedRainfall(+slider.value)
      showDisasterPanel()
      host?.onRecalculateRoute?.()
    })
  }

  // Recalculate route
  panel.querySelector('[data-recalc-route]')?.addEventListener('click', () => {
    host?.onRecalculateRoute?.()
  })

  // Fly to hazard card
  panel.querySelectorAll<HTMLElement>('[data-fly-to]').forEach((el) => {
    el.addEventListener('click', () => {
      const parts = el.dataset.flyTo?.split(',').map(Number)
      if (parts && parts.length === 2 && !isNaN(parts[0]!) && !isNaN(parts[1]!)) {
        host?.map.easeTo({
          center: [parts[0]!, parts[1]!],
          zoom: 17.5,
          duration: 650,
        })
      }
    })
  })
}
