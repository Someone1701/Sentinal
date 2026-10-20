import { disasterService } from '../disaster/service'
import type { DisasterScenarioId } from '../disaster/types'
import { icons } from './icons'

export interface LandingHost {
  switchView: (mode: 'landing' | 'dashboard' | 'map') => void
  routeTo?: (lat: number, lon: number, label: string) => void
  setRouteEndpoints?: (
    from: { lat: number; lon: number; label: string },
    to: { lat: number; lon: number; label: string }
  ) => void
  onSelectScenario?: (scenario: DisasterScenarioId) => void
}

let host: LandingHost | null = null

export function initLanding(h: LandingHost) {
  host = h
  renderLandingPage()

  // Subscribe to disaster service so telemetry in landing page stays live
  disasterService.subscribe(() => {
    const landingEl = document.getElementById('landing-viewport')
    if (landingEl && landingEl.innerHTML.trim().length > 0) {
      updateLandingLiveStats()
    }
  })
}

function updateLandingLiveStats() {
  const state = disasterService.getState()
  const env = state.environmental
  const isFlooded = state.isHazardActive

  const weatherEl = document.getElementById('landing-telemetry-weather')
  const underpassesEl = document.getElementById('landing-telemetry-underpasses')
  const statusBadgeEl = document.getElementById('landing-status-badge')

  if (weatherEl) {
    weatherEl.textContent = `${env.temperatureC}°C · ${env.currentRainfallRate > 0 ? `${env.currentRainfallRate} mm/h rain` : 'Clear / Dry'}`
  }
  if (underpassesEl) {
    const safeCount =
      (state.blockedEdges.has(204) || state.blockedEdges.has(492) ? 0 : 1) +
      // PRP tunnel: check all 4 edges, not just 434
      (state.blockedEdges.has(434) || state.blockedEdges.has(727) || state.blockedEdges.has(724) || state.blockedEdges.has(627) ? 0 : 1) +
      (state.blockedEdges.has(185) ? 0 : 1) +
      (state.blockedEdges.has(119) || state.blockedEdges.has(176) ? 0 : 1)
    underpassesEl.textContent = isFlooded ? `${4 - safeCount} of 4 Flooded` : 'All 4 Open & Safe'
    underpassesEl.className = `hero-stat-value ${isFlooded ? 'stat-danger' : 'stat-safe'}`
  }
  if (statusBadgeEl) {
    statusBadgeEl.innerHTML = isFlooded
      ? `<span class="pulse-indicator-red"></span> 🚨 MONSOON FLOOD SIMULATION ACTIVE (${state.hazards.length} HAZARDS)`
      : `<span class="pulse-indicator"></span> 🟢 NORMAL CAMPUS CONDITIONS · ALL WALKWAYS DRY`
    statusBadgeEl.className = `landing-hero-pill ${isFlooded ? 'pill-flood' : 'pill-normal'}`
  }
}

export function renderLandingPage() {
  const container = document.getElementById('landing-viewport')
  if (!container) return

  const state = disasterService.getState()
  const env = state.environmental
  const isFlooded = state.isHazardActive

  const safeCount =
    (state.blockedEdges.has(204) || state.blockedEdges.has(492) ? 0 : 1) +
    // PRP tunnel: check all 4 edges, not just 434
    (state.blockedEdges.has(434) || state.blockedEdges.has(727) || state.blockedEdges.has(724) || state.blockedEdges.has(627) ? 0 : 1) +
    (state.blockedEdges.has(185) ? 0 : 1) +
    (state.blockedEdges.has(119) || state.blockedEdges.has(176) ? 0 : 1)

  container.innerHTML = `
    <div class="landing-scroll-wrapper">
      <!-- ── HERO SECTION ────────────────────────────────────────────────── -->
      <section class="landing-hero-section">
        <div class="hero-cosmic-glow"></div>
        <div class="hero-grid-pattern"></div>

        <div class="landing-container hero-content-layout">
          <!-- Left: Hero Headline & CTAs -->
          <div class="hero-text-column">
            <div id="landing-status-badge" class="landing-hero-pill ${isFlooded ? 'pill-flood' : 'pill-normal'}">
              ${
                isFlooded
                  ? `<span class="pulse-indicator-red"></span> 🚨 MONSOON FLOOD SIMULATION ACTIVE (${state.hazards.length} HAZARDS)`
                  : `<span class="pulse-indicator"></span> 🟢 NORMAL CAMPUS CONDITIONS · ALL WALKWAYS DRY`
              }
            </div>

            <h1 class="hero-display-title">
              Real-Time Campus Navigation Built for <span class="text-gradient-cyan">Sunshine</span> &amp; <span class="text-gradient-indigo">Cloudbursts</span>.
            </h1>

            <p class="hero-lead-text">
              Navigate 181 campus landmarks, explore daily mess menus and 3D architectural models, and steer clear of flooded railway underpasses with automated topographic runoff prediction.
            </p>

            <!-- Hero Action Buttons -->
            <div class="hero-cta-group">
              <button type="button" class="btn-hero-primary" data-landing-action="map" id="btn-hero-launch-map">
                ${icons.map}
                <span>Launch Interactive Map</span>
                <span class="btn-arrow">➔</span>
              </button>

              <button type="button" class="btn-hero-secondary" data-landing-action="dashboard" id="btn-hero-open-dash">
                ${icons.compass}
                <span>Safety Dashboard</span>
              </button>

              <button type="button" class="btn-hero-ghost" data-landing-action="simulate-monsoon" id="btn-hero-sim-monsoon">
                <span>🌧️ Simulate Monsoon Flood</span>
              </button>
            </div>

            <!-- Live Telemetry HUD Strip -->
            <div class="hero-telemetry-hud">
              <div class="hero-stat-card">
                <span class="hero-stat-label">Weather Station</span>
                <span class="hero-stat-value" id="landing-telemetry-weather">
                  ${env.temperatureC}°C · ${env.currentRainfallRate > 0 ? `${env.currentRainfallRate} mm/h rain` : 'Clear / Dry'}
                </span>
                <span class="hero-stat-sub">Open-Meteo Synoptic</span>
              </div>

              <div class="hero-stat-card">
                <span class="hero-stat-label">Railway Underpasses</span>
                <span class="hero-stat-value ${isFlooded ? 'stat-danger' : 'stat-safe'}" id="landing-telemetry-underpasses">
                  ${isFlooded ? `${4 - safeCount} of 4 Flooded` : 'All 4 Open & Safe'}
                </span>
                <span class="hero-stat-sub">Topographic Runoff Sensor</span>
              </div>

              <div class="hero-stat-card">
                <span class="hero-stat-label">Offline Network</span>
                <span class="hero-stat-value">966 Nodes · 1,096 Edges</span>
                <span class="hero-stat-sub">Client-Side Graph</span>
              </div>

              <div class="hero-stat-card">
                <span class="hero-stat-label">Directory Index</span>
                <span class="hero-stat-value">1,363 Entities</span>
                <span class="hero-stat-sub">181 POIs · 1,148 Faculty</span>
              </div>
            </div>
          </div>

          <!-- Right: Visual Showcase with Digital Twin & Route Telemetry -->
          <div class="hero-visual-column">
            <div class="hero-image-frame">
              <img src="/hero-visual.jpg" alt="Sentinel Campus Intelligence Digital Twin Visualization" class="hero-main-img" width="1200" height="675">
              <div class="hero-frame-shine"></div>

              <!-- Floating Live HUD Overlay Card -->
              <div class="floating-hud-card hud-card-route">
                <div class="f-hud-badge">
                  <span class="pulse-indicator-cyan"></span>
                  <span>A* SMART REROUTE ENGINE</span>
                </div>
                <div class="f-hud-route-title">MH Hostels ➔ Silver Jubilee Tower</div>
                <div class="f-hud-meta">
                  <span class="f-hud-tag tag-rerouted">🛡️ Bypassed Canal Flood</span>
                  <span class="f-hud-time">6 min · 480m via H&amp;J Tunnel</span>
                </div>
              </div>

              <!-- Floating Spotlight Search Pill -->
              <div class="floating-hud-card hud-card-search">
                <div class="f-hud-search-row">
                  <span class="f-hud-glyph">›</span>
                  <span class="f-hud-query">prp 327 · sjt 101 · gate 11 · mess dinner</span>
                  <kbd>⌘K</kbd>
                </div>
                <div class="f-hud-sub">Sub-millisecond instant search over 1,363 entities</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── SECTION: THE 4 RAILWAY UNDERPASSES (CHOKEPOINT MATRIX) ──────── -->
      <section class="landing-section bg-section-dark">
        <div class="landing-container">
          <div class="section-title-wrap text-center">
            <span class="section-kicker">CAMPUS TOPOGRAPHY &amp; RESILIENCE</span>
            <h2 class="section-heading">The 4 Railway Underpasses of VIT Vellore</h2>
            <p class="section-subtitle">
              The Katpadi railway line physically bisects VIT Vellore into <strong>Hostels (North)</strong> and <strong>Academic Blocks (South)</strong>. These 4 underpasses are the only pedestrian arteries connecting campus.
            </p>
          </div>

          <div class="underpass-matrix-grid">
            <!-- Chokepoint 1 -->
            <div class="matrix-card ${state.blockedEdges.has(185) ? 'card-status-closed' : 'card-status-open'}">
              <div class="m-card-badge-row">
                <span class="m-badge ${state.blockedEdges.has(185) ? 'badge-closed' : 'badge-safe'}">
                  ${state.blockedEdges.has(185) ? 'FLOODED (CLOSED)' : 'DRY & PASSABLE'}
                </span>
                <span class="m-tag">CANAL CULVERT</span>
              </div>
              <h3 class="m-card-title">Central Canal Underpass</h3>
              <p class="m-card-conn">Mother Teresa Block / TT Annexe ↔ Just Bake / E &amp; K Block</p>
              <p class="m-card-desc">
                Low-clearance canal culvert with a 2.4m topographic elevation depression. Highly susceptible to storm water accumulation during cloudbursts.
              </p>
              <div class="m-card-footer">
                <span class="m-foot-note">Sentinel auto-reroutes pedestrians to H&amp;J Block Tunnel during downpours.</span>
                <button type="button" class="btn-micro-action" data-fly-coords="79.160364,12.971462">View on Map ↗</button>
              </div>
            </div>

            <!-- Chokepoint 2 -->
            <div class="matrix-card ${state.blockedEdges.has(119) || state.blockedEdges.has(176) ? 'card-status-closed' : 'card-status-open'}">
              <div class="m-card-badge-row">
                <span class="m-badge ${state.blockedEdges.has(119) || state.blockedEdges.has(176) ? 'badge-closed' : 'badge-safe'}">
                  ${state.blockedEdges.has(119) || state.blockedEdges.has(176) ? 'FLOODED (CLOSED)' : 'DRY & PASSABLE'}
                </span>
                <span class="m-tag">PERIMETER CULVERT</span>
              </div>
              <h3 class="m-card-title">West Boundary Canal Underpass</h3>
              <p class="m-card-conn">Anna Audi Courts ↔ A-Block Hostels / One Food World</p>
              <p class="m-card-desc">
                Perimeter drainage underpass adjoining the western boundary. Runoff from adjacent fields quickly submerges this low-dip crossing.
              </p>
              <div class="m-card-footer">
                <span class="m-foot-note">Sentinel alerts western hostel residents to use the central arterial crossings.</span>
                <button type="button" class="btn-micro-action" data-fly-coords="79.15654,12.97146">View on Map ↗</button>
              </div>
            </div>

            <!-- Chokepoint 3 -->
            <div class="matrix-card ${state.blockedEdges.has(204) || state.blockedEdges.has(492) ? 'card-status-closed' : 'card-status-open'}">
              <div class="m-card-badge-row">
                <span class="m-badge ${state.blockedEdges.has(204) || state.blockedEdges.has(492) ? 'badge-closed' : 'badge-safe'}">
                  ${state.blockedEdges.has(204) || state.blockedEdges.has(492) ? 'BLOCKED' : 'SAFE HIGH-WATER ARTERY'}
                </span>
                <span class="m-tag tag-primary">REINFORCED TUNNEL</span>
              </div>
              <h3 class="m-card-title">H &amp; J Block Main Tunnel</h3>
              <p class="m-card-conn">Technology Tower / Fountain Garden ↔ H &amp; J Hostels</p>
              <p class="m-card-desc">
                Reinforced, high-clearance arterial tunnel equipped with dedicated storm pumps. Engineered to remain open and safe during severe monsoon downpours.
              </p>
              <div class="m-card-footer">
                <span class="m-foot-note">Primary recommended bypass corridor for north-south pedestrian crossing.</span>
                <button type="button" class="btn-micro-action" data-fly-coords="79.158316,12.971424">View on Map ↗</button>
              </div>
            </div>

            <!-- Chokepoint 4 -->
            <div class="matrix-card ${state.blockedEdges.has(434) ? 'card-status-closed' : 'card-status-open'}">
              <div class="m-card-badge-row">
                <span class="m-badge ${state.blockedEdges.has(434) ? 'badge-closed' : 'badge-safe'}">
                  ${state.blockedEdges.has(434) ? 'BLOCKED' : 'HIGH-RESILIENCE ARTERY'}
                </span>
                <span class="m-tag tag-primary">HIGHWAY CROSSING</span>
              </div>
              <h3 class="m-card-title">Pearl Research Park (PRP) Tunnel</h3>
              <p class="m-card-conn">Main Campus Road ↔ Gate 11A / Pearl Research Park</p>
              <p class="m-card-desc">
                Grade-separated multi-lane arterial road underpass connecting Gate 11A and the Pearl Research Park courtyard. Elevated gradient prevents waterlogging.
              </p>
              <div class="m-card-footer">
                <span class="m-foot-note">High-throughput corridor connecting the eastern academic district.</span>
                <button type="button" class="btn-micro-action" data-fly-coords="79.16550,12.97140">View on Map ↗</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── SECTION: BENTO GRID FEATURES ────────────────────────────────── -->
      <section class="landing-section">
        <div class="landing-container">
          <div class="section-title-wrap text-center">
            <span class="section-kicker">ENGINEERING HIGHLIGHTS</span>
            <h2 class="section-heading">Platform Features &amp; Architecture</h2>
            <p class="section-subtitle">
              Engineered specifically for the daily needs of VIT students, faculty, and emergency response teams.
            </p>
          </div>

          <div class="bento-features-grid">
            <!-- Bento 1: Flood Rerouting (Span 2) -->
            <div class="bento-box bento-span-2">
              <div class="bento-icon-box">${icons.shieldCheck}</div>
              <h3 class="bento-title">Disaster-Aware A* Rerouting Engine</h3>
              <p class="bento-text">
                When rainfall exceeds 28 mm/h or users submit confirmed flood blockages, Sentinel's routing engine instantly eliminates impassable edges and applies risk penalty multipliers to waterlogged caution corridors. You are guaranteed a dry, reliable walking route between hostels and exam halls.
              </p>
              <div class="bento-pills-row">
                <span class="bpill">A* Algorithm</span>
                <span class="bpill">Custom Binary Heap</span>
                <span class="bpill">Quantified ETA &amp; Distance Deltas</span>
                <span class="bpill">Automated Human Explanations</span>
              </div>
            </div>

            <!-- Bento 2: Instant Spotlight (Span 1) -->
            <div class="bento-box bento-span-1">
              <div class="bento-icon-box">${icons.search}</div>
              <h3 class="bento-title">Sub-Millisecond Campus Spotlight</h3>
              <p class="bento-text">
                Press <kbd>⌘K</kbd> anywhere on campus to instantly search 1,363 indexed records: classrooms (PRP 327, SJT 101), hostel blocks (MH A–T, LH A–C), gates, ATMs, and verified faculty profiles.
              </p>
              <div class="bento-pills-row">
                <span class="bpill">&lt;1 ms Search Latency</span>
                <span class="bpill">Fuzzy Token Matching</span>
              </div>
            </div>

            <!-- Bento 3: Live Mess Menus (Span 1) -->
            <div class="bento-box bento-span-1">
              <div class="bento-icon-box">${icons.food}</div>
              <h3 class="bento-title">Live Campus Mess Menus</h3>
              <p class="bento-text">
                Synchronized snapshots of 740 daily meals across 6 campus dining halls. Type <kbd>mess dinner</kbd> to see tonight's dinner menu (Veg, Non-Veg, and Special) without logging into VTOP.
              </p>
              <div class="bento-pills-row">
                <span class="bpill">6 Mess Halls</span>
                <span class="bpill">Daily Menu Sync</span>
              </div>
            </div>

            <!-- Bento 4: 3D Architectural Twins (Span 2) -->
            <div class="bento-box bento-span-2">
              <div class="bento-icon-box">${icons.map}</div>
              <h3 class="bento-title">3D Architectural Digital Twins &amp; Room-Level Pins</h3>
              <p class="bento-text">
                Explore a complete 3D polygonal extrusion of Pearl Research Park (PRP) with individual floor layouts (Floors 1–7) and courtyard walkways. Switch between Satellite imagery and high-contrast 3D tilt mode with right-click drag or two-finger gesture.
              </p>
              <div class="bento-pills-row">
                <span class="bpill">PRP 3D Mesh</span>
                <span class="bpill">Multi-Floor Wayfinding</span>
                <span class="bpill">Esri Satellite Tiles</span>
                <span class="bpill">WebGL 60 FPS</span>
              </div>
            </div>

            <!-- Bento 5: Crowdsourced Telemetry (Span 1) -->
            <div class="bento-box bento-span-1">
              <div class="bento-icon-box">${icons.camera}</div>
              <h3 class="bento-title">Field Reports &amp; Photo Proof</h3>
              <p class="bento-text">
                Spotted waterlogging or a closed pathway? Submit GPS coordinates and geotagged photographic proof. Reports dynamically block routes for other students in real time.
              </p>
              <div class="bento-pills-row">
                <span class="bpill">Photo Evidence</span>
                <span class="bpill">GPS Geotagging</span>
              </div>
            </div>

            <!-- Bento 6: Privacy & Offline Speed (Span 2) -->
            <div class="bento-box bento-span-2">
              <div class="bento-icon-box">${icons.activity}</div>
              <h3 class="bento-title">100% Client-Side Privacy &amp; Offline Performance</h3>
              <p class="bento-text">
                The entire campus map extract, graph database, and search index compress down to just 391 kB of static GeoJSON. Everything runs locally inside your browser with zero analytics tracking, zero external tile server subscriptions, and zero downtime.
              </p>
              <div class="bento-pills-row">
                <span class="bpill">391 kB Total Payload</span>
                <span class="bpill">Zero Tracking</span>
                <span class="bpill">Self-Hosted OSM</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── SECTION: POPULAR CAMPUS COMMUTES (TRY IT LIVE) ──────────────── -->
      <section class="landing-section bg-section-dark">
        <div class="landing-container">
          <div class="section-title-wrap text-center">
            <span class="section-kicker">TRY IT IN 1 CLICK</span>
            <h2 class="section-heading">Popular Campus Commutes</h2>
            <p class="section-subtitle">
              Click any route below to plot the optimal walking trajectory directly on the interactive map.
            </p>
          </div>

          <div class="commute-presets-grid">
            <div class="commute-card" data-landing-commute="12.97350,79.16100,Q-Block Hostels,12.97103,79.16368,Silver Jubilee Tower (SJT)">
              <div class="c-card-header">
                <span class="c-card-tag">MORNING LECTURE</span>
                <span class="c-card-stat">6 min · 470m</span>
              </div>
              <h4 class="c-card-title">Q-Block Hostels ➔ Silver Jubilee Tower (SJT)</h4>
              <p class="c-card-desc">Direct pedestrian artery through the eastern campus promenade.</p>
              <button type="button" class="btn-commute-plot">Plot Route on Map →</button>
            </div>

            <div class="commute-card" data-landing-commute="12.96985,79.15595,Technology Tower (TT),12.97250,79.15850,Food Street">
              <div class="c-card-header">
                <span class="c-card-tag tag-reroute">MONSOON PROTECTED</span>
                <span class="c-card-stat">5 min · 410m</span>
              </div>
              <h4 class="c-card-title">Technology Tower ➔ Food Street</h4>
              <p class="c-card-desc">Crosses via H&amp;J Block Main Tunnel; stays dry during downpours.</p>
              <button type="button" class="btn-commute-plot">Plot Route on Map →</button>
            </div>

            <div class="commute-card" data-landing-commute="12.96870,79.15580,Main Gate 1,12.97280,79.16480,Pearl Research Park (PRP)">
              <div class="c-card-header">
                <span class="c-card-tag">TRANS-CAMPUS</span>
                <span class="c-card-stat">12 min · 980m</span>
              </div>
              <h4 class="c-card-title">Main Gate 1 ➔ Pearl Research Park (PRP)</h4>
              <p class="c-card-desc">Arterial corridor connecting Katpadi Road entrance to PRP.</p>
              <button type="button" class="btn-commute-plot">Plot Route on Map →</button>
            </div>
          </div>
        </div>
      </section>

      <!-- ── SECTION: FINAL CALL TO ACTION BANNER ────────────────────────── -->
      <section class="landing-cta-banner-section">
        <div class="landing-container">
          <div class="cta-banner-box">
            <div class="cta-banner-glow"></div>
            <div class="cta-content">
              <span class="cta-kicker">GET STARTED RIGHT NOW</span>
              <h2 class="cta-heading">Ready to Navigate VIT Vellore with Total Confidence?</h2>
              <p class="cta-desc">
                Explore the campus map, test the disaster-aware rerouting simulator, or search for any building or mess hall in seconds.
              </p>
              <div class="cta-buttons-row">
                <button type="button" class="btn-hero-primary" data-landing-action="map" id="btn-cta-launch-map">
                  ${icons.map}
                  <span>Open Interactive Map</span>
                  <span class="btn-arrow">➔</span>
                </button>
                <button type="button" class="btn-hero-secondary" data-landing-action="dashboard" id="btn-cta-open-dash">
                  ${icons.compass}
                  <span>Campus Safety Dashboard</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── FOOTER ──────────────────────────────────────────────────────── -->
      <footer class="landing-footer">
        <div class="landing-container footer-content-row">
          <div class="footer-left">
            <div class="footer-brand">
              <span class="f-word">SENTINEL</span>
              <span class="f-sub">VIT VELLORE SPATIAL ENGINE</span>
            </div>
            <p class="footer-tagline">
              A community open-source wayfinding and flood resilience project for Vellore Institute of Technology.
            </p>
          </div>

          <div class="footer-right">
            <div class="footer-links-group">
              <a href="https://www.openstreetmap.org/relation/15931944" target="_blank" rel="noopener">OpenStreetMap Relation</a>
              <span class="f-sep">·</span>
              <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo Synoptic API</a>
              <span class="f-sep">·</span>
              <a href="https://www.globalfloods.eu" target="_blank" rel="noopener">Copernicus GloFAS</a>
              <span class="f-sep">·</span>
              <span class="f-lic">MIT License</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `

  wireLandingEvents(container)
}

function wireLandingEvents(container: HTMLElement) {
  // Action buttons (Map View, Dashboard, Monsoon Simulation)
  container.querySelectorAll<HTMLButtonElement>('[data-landing-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.landingAction
      if (action === 'map') {
        host?.switchView('map')
      } else if (action === 'dashboard') {
        host?.switchView('dashboard')
      } else if (action === 'simulate-monsoon') {
        disasterService.setMode('monsoon_flood')
        host?.switchView('map')
      }
    })
  })

  // Quick Commute Cards
  container.querySelectorAll<HTMLElement>('[data-landing-commute]').forEach((el) => {
    el.addEventListener('click', () => {
      const data = el.dataset.landingCommute?.split(',')
      if (data && data.length >= 6) {
        const from = { lat: +data[0]!, lon: +data[1]!, label: data[2]! }
        const to = { lat: +data[3]!, lon: +data[4]!, label: data[5]! }
        if (host?.setRouteEndpoints) {
          host.setRouteEndpoints(from, to)
        } else if (host?.routeTo) {
          host.routeTo(to.lat, to.lon, to.label)
        }
        host?.switchView('map')
      }
    })
  })

  // Fly to Underpass buttons
  container.querySelectorAll<HTMLButtonElement>('[data-fly-coords]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const parts = btn.dataset.flyCoords?.split(',').map(Number)
      if (parts && parts.length === 2 && !isNaN(parts[0]!) && !isNaN(parts[1]!)) {
        host?.switchView('map')
        // Give time for view mode transition
        setTimeout(() => {
          if (host?.routeTo) {
            host.routeTo(parts[1]!, parts[0]!, 'Railway Crossing')
          }
        }, 150)
      }
    })
  })
}
