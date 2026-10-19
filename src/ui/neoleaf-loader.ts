import gsap from 'gsap'

/**
 * NeoLeaf Awwwards-Inspired Loading Animation & View Transition Engine
 * Inspired by https://www.awwwards.com/inspiration/loading-animation-neoleaf-1
 * Design language:
 * - Minimalist deep-void canopy with neon lime (#e6f536), cyber cyan (#22d3ee) & violet accents
 * - Monospace kinetic percentage counter (000% -> 100%)
 * - Sweeping dual-laser progress bar
 * - Multi-stage telemetry status readouts
 * - Dual shutter split wipe (top/bottom) unveiling destination view seamlessly
 */

export interface TransitionOptions {
  targetUrl?: string
  onComplete?: () => void
  statusText?: string
  fast?: boolean
  label?: string
}

let activeLoaderOverlay: HTMLElement | null = null

export function dismissNeoLeafLoader() {
  if (activeLoaderOverlay) {
    activeLoaderOverlay.remove()
    activeLoaderOverlay = null
  }
}

function createLoaderDOM(): {
  overlay: HTMLElement
  counterVal: HTMLElement
  statusTextEl: HTMLElement
  laserBar: HTMLElement
  topShutter: HTMLElement
  bottomShutter: HTMLElement
  centerContent: HTMLElement
} {
  // Clean up any stale overlay
  dismissNeoLeafLoader()
  const old = document.getElementById('neoleaf-transition-overlay')
  if (old) old.remove()

  const overlay = document.createElement('div')
  overlay.id = 'neoleaf-transition-overlay'
  overlay.className = 'neoleaf-overlay'
  overlay.setAttribute('aria-live', 'polite')
  overlay.setAttribute('aria-label', 'Loading transition')

  overlay.innerHTML = `
    <!-- Top & Bottom Kinetic Shutters -->
    <div class="neoleaf-shutter neoleaf-shutter-top" id="neoleaf-shutter-top">
      <div class="neoleaf-shutter-grid"></div>
    </div>
    <div class="neoleaf-shutter neoleaf-shutter-bottom" id="neoleaf-shutter-bottom">
      <div class="neoleaf-shutter-grid"></div>
    </div>

    <!-- Central Telemetry & Kinetic Counter -->
    <div class="neoleaf-center-container" id="neoleaf-center-content">
      <!-- Ambient Glowing Aura -->
      <div class="neoleaf-ambient-orb"></div>

      <!-- Top Mini Badges -->
      <div class="neoleaf-header-row">
        <div class="neoleaf-status-pill">
          <span class="neoleaf-pulse-dot"></span>
          <span class="neoleaf-pill-label" id="neoleaf-status-text">INITIALIZING SPATIAL GRAPH</span>
        </div>
        <div class="neoleaf-coord-mono">
          12.9698° N · 79.1559° E
        </div>
      </div>

      <!-- Big Typography & Kinetic Counter -->
      <div class="neoleaf-counter-row">
        <div class="neoleaf-counter-display">
          <span class="neoleaf-digits" id="neoleaf-counter-val">000</span>
          <span class="neoleaf-unit">%</span>
        </div>
        <div class="neoleaf-brand-kicker">
          <span class="neoleaf-kicker-title">SENTINEL</span>
          <span class="neoleaf-kicker-sub">CAMPUS TWIN ENGINE</span>
        </div>
      </div>

      <!-- Laser Progress Track -->
      <div class="neoleaf-laser-track">
        <div class="neoleaf-laser-fill" id="neoleaf-laser-bar"></div>
        <div class="neoleaf-laser-head"></div>
      </div>

      <!-- Sub-Ticker Telemetry Indicators -->
      <div class="neoleaf-footer-row">
        <div class="neoleaf-sub-metric">
          <span class="neoleaf-sub-lbl">NODES</span>
          <span class="neoleaf-sub-val">966</span>
        </div>
        <div class="neoleaf-sub-metric">
          <span class="neoleaf-sub-lbl">EDGES</span>
          <span class="neoleaf-sub-val">1,096</span>
        </div>
        <div class="neoleaf-sub-metric">
          <span class="neoleaf-sub-lbl">UNDERPASSES</span>
          <span class="neoleaf-sub-val">4 SENSORS</span>
        </div>
        <div class="neoleaf-sub-metric">
          <span class="neoleaf-sub-lbl">BUFFER</span>
          <span class="neoleaf-sub-val val-lime">READY</span>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  return {
    overlay,
    counterVal: overlay.querySelector('#neoleaf-counter-val')!,
    statusTextEl: overlay.querySelector('#neoleaf-status-text')!,
    laserBar: overlay.querySelector('#neoleaf-laser-bar')!,
    topShutter: overlay.querySelector('#neoleaf-shutter-top')!,
    bottomShutter: overlay.querySelector('#neoleaf-shutter-bottom')!,
    centerContent: overlay.querySelector('#neoleaf-center-content')!,
  }
}

/**
 * Execute full NeoLeaf Loading Transition
 */
export function playNeoLeafTransition(options: TransitionOptions = {}) {
  const {
    targetUrl,
    onComplete,
    statusText = 'MOUNTING CAMPUS DIGITAL TWIN',
    fast = false,
  } = options

  const {
    overlay,
    counterVal,
    statusTextEl,
    laserBar,
    topShutter,
    bottomShutter,
    centerContent,
  } = createLoaderDOM()

  activeLoaderOverlay = overlay

  statusTextEl.textContent = statusText

  const counterObj = { value: 0 }
  const duration = fast ? 0.45 : 0.75

  const statuses = [
    statusText,
    'CALIBRATING TOPOGRAPHIC ELEVATIONS',
    'SYNCHRONIZING UNDERPASS SENSORS',
    'SYSTEM READY',
  ]

  // Entrance Timeline: Shutters close from top & bottom
  const tl = gsap.timeline({
    defaults: { ease: 'power3.inOut' },
  })

  // 1. Shutters snap shut
  tl.set(overlay, { display: 'flex', opacity: 1, pointerEvents: 'all' })
    .fromTo(topShutter, { yPercent: -100 }, { yPercent: 0, duration: 0.28, ease: 'power4.out' }, 0)
    .fromTo(bottomShutter, { yPercent: 100 }, { yPercent: 0, duration: 0.28, ease: 'power4.out' }, 0)
    .fromTo(centerContent, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.25 }, 0.1)

  // 2. Kinetic Counter & Laser Progress
  tl.to(
    counterObj,
    {
      value: 100,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const val = Math.floor(counterObj.value)
        counterVal.textContent = val < 10 ? `00${val}` : val < 100 ? `0${val}` : `${val}`
        laserBar.style.width = `${val}%`

        // Cycle through status readouts
        const sIndex = Math.min(statuses.length - 1, Math.floor((val / 100) * statuses.length))
        if (statuses[sIndex]) {
          statusTextEl.textContent = statuses[sIndex]
        }
      },
    },
    0.15
  )

  // 3. Execution Action or Exit Split
  tl.add(() => {
    if (targetUrl) {
      window.location.href = targetUrl
      return
    }

    if (onComplete) {
      onComplete()
    }
  })

  // If no immediate page redirect, play the dramatic NeoLeaf shutter split reveal
  if (!targetUrl) {
    tl.to(centerContent, { opacity: 0, scale: 1.06, duration: 0.25, ease: 'power2.in' }, '+=0.05')
      .to(topShutter, { yPercent: -100, duration: 0.42, ease: 'power4.inOut' })
      .to(bottomShutter, { yPercent: 100, duration: 0.42, ease: 'power4.inOut' }, '<')
      .set(overlay, { display: 'none', pointerEvents: 'none' })
      .add(() => {
        overlay.remove()
        activeLoaderOverlay = null
      })
  }
}

/**
 * Attach NeoLeaf transition to links matching a selector
 */
export function wireNeoLeafLinks(selector = 'a[href^="/map"], a[href="/"], [data-neoleaf-nav]') {
  document.querySelectorAll<HTMLAnchorElement>(selector).forEach((link) => {
    link.addEventListener('click', (e) => {
      // Don't intercept target="_blank" or cmd/ctrl clicks
      if (link.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return

      const href = link.getAttribute('href')
      if (!href) return

      e.preventDefault()

      let label = 'MOUNTING CAMPUS DIGITAL TWIN'
      if (href.includes('dashboard')) label = 'INITIALIZING SAFETY DASHBOARD'
      else if (href.includes('hazard')) label = 'COMPILING MONSOON FLOOD SIMULATION'
      else if (href.includes('route')) label = 'COMPUTING A* FLOOD-SAFE TRAJECTORY'
      else if (href === '/' || href === '/landing.html') label = 'RETURNING TO CAMPUS BRIEFING'

      playNeoLeafTransition({
        targetUrl: href,
        statusText: label,
        fast: false,
      })
    })
  })
}
