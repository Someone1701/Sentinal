import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initCursorTrail } from './ui/cursor-trail'
import { wireNeoLeafLinks, playNeoLeafTransition } from './ui/neoleaf-loader'

gsap.registerPlugin(ScrollTrigger)

/**
 * Sentinel Landing Page Motion & Interactive Engine
 * Art-directed GSAP orchestration with graceful degradation
 */
document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll()
  initLiveTelemetry()
  initGsapAnimations()
  initIntro3DSurfing()
  initHeroParallax()
  initCommuteCardActions()
  initCursorTrail()
  wireNeoLeafLinks()
})


function isReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/* ── GSAP MOTION SYSTEM ─────────────────────────────────────────────────── */

function initGsapAnimations() {
  if (isReducedMotion()) {
    // Respect user's motion preference: ensure full visibility immediately
    gsap.set(
      [
        '.lp-navbar',
        '.hero-status-pill',
        '.hero-line-reveal',
        '.hero-subtitle',
        '.hero-cta-cluster > *',
        '.telemetry-card',
        '.hero-frame',
        '.floating-hud',
        '.underpass-card',
        '.bento-card',
        '.commute-card',
        '.cta-banner-wrapper',
      ],
      { opacity: 1, clearProps: 'all' }
    )
    return
  }

  // Ensure lagSmoothing doesn't pause animations on tab switch
  gsap.ticker.lagSmoothing(500, 33)

  // 0. Intro Screen Initial Entrance
  const introEntranceTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  introEntranceTl
    .fromTo('.intro-top-bar', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 })
    .fromTo('.intro-emblem', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7 }, '-=0.3')
    .fromTo('.intro-kicker', { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.4')
    .fromTo('.intro-title', { y: 25, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.7 }, '-=0.3')
    .fromTo('.intro-tagline', { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.4')
    .fromTo('.intro-bottom-action', { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.3')

  // Smooth Intro Transition — responsive and easy to scroll without viewport locking
  const introPinTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#intro-screen',
      start: 'top top',
      end: 'bottom top',
      scrub: 0.5,
    },
  })

  introPinTl
    .to('.intro-top-bar', { y: -30, opacity: 0, duration: 0.3 }, 0)
    .to('.intro-bottom-action', { y: 30, opacity: 0, duration: 0.3 }, 0)
    .to(
      '.intro-center-hero',
      {
        y: -50,
        opacity: 0.3,
        duration: 0.8,
        ease: 'power1.out',
      },
      0
    )
    .to(
      '.intro-glow-aura',
      {
        opacity: 0.2,
        duration: 0.8,
      },
      0
    )

  // Scroll to enter click handler
  const introScrollBtn = document.getElementById('intro-scroll-trigger-btn')
  if (introScrollBtn) {
    const jumpToHero = () => {
      const hero = document.getElementById('hero')
      if (hero) {
        hero.scrollIntoView({ behavior: 'smooth' })
      }
    }
    introScrollBtn.addEventListener('click', jumpToHero)
    introScrollBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        jumpToHero()
      }
    })
  }

  // 1. Hero Section Coordinated Entrance Timeline (Triggers when entering viewport)
  const heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero-section',
      start: 'top 85%',
      once: true,
    },
    defaults: { ease: 'power3.out' },
    onComplete: () => {
      // Clear props so CSS hovers, transforms, and interactions are 100% native
      gsap.set(
        [
          '.hero-status-pill',
          '.hero-line-reveal',
          '.hero-subtitle',
          '.hero-cta-cluster > *',
          '.telemetry-card',
          '.hero-frame',
          '.floating-hud',
        ],
        { clearProps: 'opacity,transform,visibility' }
      )
    },
  })

  heroTl
    .fromTo(
      '.lp-navbar',
      { y: -24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6 }
    )
    .fromTo(
      '.hero-status-pill',
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45 },
      '-=0.3'
    )
    .fromTo(
      '.hero-line-reveal',
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 },
      '-=0.25'
    )
    .fromTo(
      '.hero-subtitle',
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5 },
      '-=0.35'
    )
    .fromTo(
      '.hero-cta-cluster > *',
      { y: 15, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.08 },
      '-=0.35'
    )
    .fromTo(
      '.telemetry-card',
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, stagger: 0.06 },
      '-=0.3'
    )
    .fromTo(
      '.hero-frame',
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' },
      '-=0.7'
    )
    .fromTo(
      '.floating-hud',
      { y: 16, opacity: 0, scale: 0.92 },
      { y: 0, opacity: 1, scale: 1, duration: 0.55, stagger: 0.15 },
      '-=0.4'
    )

  // 2. Section Headers Staggered Reveal
  gsap.utils.toArray<HTMLElement>('.section-header').forEach((header) => {
    ScrollTrigger.create({
      trigger: header,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.fromTo(
          header.children,
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
            clearProps: 'opacity,transform',
          }
        )
      },
    })
  })

  // 3. 4 Railway Underpasses Matrix Cards (Batch Reveal)
  ScrollTrigger.batch('.underpass-card', {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        { y: 32, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.1,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        }
      )
    },
  })

  // 4. Feature Bento Grid Cards (Batch Reveal)
  ScrollTrigger.batch('.bento-card', {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.08,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        }
      )
    },
  })

  // 5. Popular Commute Presets Cards (Batch Reveal)
  ScrollTrigger.batch('.commute-card', {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        }
      )
    },
  })

  // 6. Call to Action Banner Reveal
  const ctaBanner = document.querySelector<HTMLElement>('.cta-banner-wrapper')
  if (ctaBanner) {
    ScrollTrigger.create({
      trigger: ctaBanner,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.fromTo(
          ctaBanner,
          { y: 30, opacity: 0, scale: 0.98 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.7,
            ease: 'power3.out',
            clearProps: 'opacity,transform',
          }
        )
      },
    })
  }

  // Safety failsafe: after 2.5s, verify all elements are visible in case of headless or throttled execution
  setTimeout(() => {
    ScrollTrigger.refresh()
    document.querySelectorAll<HTMLElement>(
      '.underpass-card, .bento-card, .commute-card, .cta-banner-wrapper, .hero-cta-cluster > *, .telemetry-card'
    ).forEach((el) => {
      if (window.getComputedStyle(el).opacity === '0') {
        el.style.opacity = '1'
        el.style.transform = 'none'
      }
    })
  }, 2500)
}

/* ── INTRO 3D TEXT & HERO SURFING ───────────────────────────────────────── */

function initIntro3DSurfing() {
  if (isReducedMotion()) return

  const introScreen = document.getElementById('intro-screen')
  const centerHero = document.querySelector<HTMLElement>('.intro-center-hero')
  const emblem = document.querySelector<HTMLElement>('.intro-emblem')
  const title = document.querySelector<HTMLElement>('.intro-title')
  const chars = document.querySelectorAll<HTMLElement>('.surf-char')
  const kicker = document.querySelector<HTMLElement>('.intro-kicker')
  const tagline = document.querySelector<HTMLElement>('.intro-tagline')
  const aura = document.querySelector<HTMLElement>('.intro-glow-aura')

  if (!introScreen || !centerHero) return

  // Track surfing motion across the intro viewport
  introScreen.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = introScreen.getBoundingClientRect()
    // Normalized coordinates from -1 to 1 relative to center
    const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
    const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)

    // 1. Tilt entire hero in 3D perspective
    gsap.to(centerHero, {
      rotationY: nx * 22,
      rotationX: -ny * 18,
      transformPerspective: 1200,
      duration: 0.45,
      ease: 'power2.out',
      overwrite: 'auto',
    })

    // 2. Parallax multi-plane offsets for true 3D spatial depth
    if (emblem) {
      gsap.to(emblem, {
        x: nx * 30,
        y: ny * 24,
        z: 65,
        rotationZ: nx * 8,
        duration: 0.45,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }

    if (kicker) {
      gsap.to(kicker, {
        x: nx * 18,
        y: ny * 14,
        z: 45,
        duration: 0.45,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }

    if (title) {
      gsap.to(title, {
        x: nx * 26,
        y: ny * 20,
        z: 90,
        duration: 0.45,
        ease: 'power2.out',
        overwrite: 'auto',
      })

      // Dynamic reactive 3D cast-shadow
      const shadowX = -nx * 22
      const shadowY = -ny * 20
      title.style.filter = `drop-shadow(${shadowX}px ${shadowY}px 26px rgba(34, 211, 238, 0.4)) drop-shadow(${shadowX * 1.5}px ${shadowY * 1.5}px 45px rgba(0, 0, 0, 0.7))`
    }

    if (tagline) {
      gsap.to(tagline, {
        x: nx * 14,
        y: ny * 10,
        z: 35,
        duration: 0.45,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }

    if (aura) {
      // Inverted parallax for maximum depth illusion
      gsap.to(aura, {
        x: -nx * 50,
        y: -ny * 40,
        duration: 0.65,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }

    // 3. Kinetic Letter Surfing: each letter ripples and elevates in 3D when cursor passes near it
    chars.forEach((char) => {
      const cRect = char.getBoundingClientRect()
      const cx = cRect.left + cRect.width / 2
      const cy = cRect.top + cRect.height / 2
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy)
      const maxDist = 200

      if (dist < maxDist) {
        const factor = Math.pow(1 - dist / maxDist, 1.6)
        const liftZ = factor * 70
        const rotX = -((e.clientY - cy) / maxDist) * factor * 35
        const rotY = ((e.clientX - cx) / maxDist) * factor * 35
        const scale = 1 + factor * 0.2

        char.classList.add('active-surf')
        gsap.to(char, {
          z: liftZ,
          rotationX: rotX,
          rotationY: rotY,
          scale: scale,
          duration: 0.2,
          ease: 'power2.out',
          overwrite: 'auto',
        })
      } else {
        char.classList.remove('active-surf')
        gsap.to(char, {
          z: 0,
          rotationX: 0,
          rotationY: 0,
          scale: 1,
          duration: 0.55,
          ease: 'power3.out',
          overwrite: 'auto',
        })
      }
    })
  })

  // Return to smooth resting state on mouse leave
  introScreen.addEventListener('mouseleave', () => {
    gsap.to(centerHero, {
      rotationX: 0,
      rotationY: 0,
      duration: 1.2,
      ease: 'elastic.out(1, 0.45)',
    })

    if (emblem) gsap.to(emblem, { x: 0, y: 0, z: 0, rotationZ: 0, duration: 1, ease: 'power2.out' })
    if (kicker) gsap.to(kicker, { x: 0, y: 0, z: 0, duration: 1, ease: 'power2.out' })
    if (title) {
      gsap.to(title, { x: 0, y: 0, z: 0, duration: 1, ease: 'power2.out' })
      title.style.filter = ''
    }
    if (tagline) gsap.to(tagline, { x: 0, y: 0, z: 0, duration: 1, ease: 'power2.out' })
    if (aura) gsap.to(aura, { x: 0, y: 0, duration: 1, ease: 'power2.out' })

    chars.forEach((char) => {
      char.classList.remove('active-surf')
      gsap.to(char, {
        z: 0,
        rotationX: 0,
        rotationY: 0,
        scale: 1,
        duration: 0.7,
        ease: 'elastic.out(1, 0.45)',
      })
    })
  })
}

/* ── SUBTLE HERO 3D PARALLAX (DESKTOP) ─────────────────────────────────── */

function initHeroParallax() {
  if (isReducedMotion() || window.matchMedia('(max-width: 1024px)').matches) return

  const frame = document.querySelector<HTMLElement>('.hero-frame')
  const heroBox = document.querySelector<HTMLElement>('.hero-visual-box')
  if (!frame || !heroBox) return

  heroBox.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = heroBox.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5

    gsap.to(frame, {
      rotationY: x * 8,
      rotationX: -y * 8,
      duration: 0.6,
      ease: 'power2.out',
      transformPerspective: 900,
    })

    gsap.to('.hud-route', {
      x: -x * 12,
      y: -y * 12,
      duration: 0.6,
      ease: 'power2.out',
    })

    gsap.to('.hud-search', {
      x: x * 15,
      y: y * 15,
      duration: 0.6,
      ease: 'power2.out',
    })
  })

  heroBox.addEventListener('mouseleave', () => {
    gsap.to([frame, '.hud-route', '.hud-search'], {
      rotationY: 0,
      rotationX: 0,
      x: 0,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
    })
  })
}

/* ── NAVBAR STICKY STATE ────────────────────────────────────────────────── */

function initNavbarScroll() {
  const navbar = document.querySelector<HTMLElement>('.lp-navbar')
  if (!navbar) return

  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled')
      } else {
        navbar.classList.remove('scrolled')
      }
    },
    { passive: true }
  )
}

/* ── LIVE SYNOPTIC WEATHER & STATUS ─────────────────────────────────────── */

async function initLiveTelemetry() {
  const weatherValEl = document.querySelector<HTMLElement>('[data-lp-telemetry-weather]')
  if (!weatherValEl) return

  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=12.9698&longitude=79.1559&current=temperature_2m,precipitation'
    )
    if (!res.ok) return
    const data = await res.json()
    const temp = Math.round(data.current?.temperature_2m ?? 24)
    const rain = data.current?.precipitation ?? 0

    weatherValEl.textContent = `${temp}°C · ${rain > 0 ? `${rain} mm/h rain` : 'Clear / Dry'}`
  } catch {
    // Keep default static synoptic metric
  }
}


/* ── INTERACTIVE PRESETS & LINKS ────────────────────────────────────────── */

function initCommuteCardActions() {
  // Commute preset cards navigate to main map with NeoLeaf transition and route params
  document.querySelectorAll<HTMLElement>('[data-commute-route]').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault()
      const routeData = card.dataset.commuteRoute
      if (routeData) {
        const destUrl = `/map?route=${encodeURIComponent(routeData)}`
        playNeoLeafTransition({
          targetUrl: destUrl,
          statusText: 'COMPUTING A* FLOOD-SAFE TRAJECTORY',
          fast: false,
        })
      }
    })
  })
}


