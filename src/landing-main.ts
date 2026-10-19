import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Sentinel Landing Page Motion & Interactive Engine
 * Art-directed GSAP orchestration with graceful degradation
 */
document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll()
  initLiveTelemetry()
  initGsapAnimations()
  initHeroParallax()
  initCommuteCardActions()
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

  // Pinned Cinematic Curtain & Zoom Intro Scrub
  const introPinTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#intro-screen',
      start: 'top top',
      end: '+=110%',
      pin: true,
      pinSpacing: true,
      scrub: 0.8,
      anticipatePin: 1,
    },
  })

  introPinTl
    .to('.intro-top-bar', { y: -40, opacity: 0, duration: 0.25 }, 0)
    .to('.intro-bottom-action', { y: 40, opacity: 0, duration: 0.25 }, 0)
    .to(
      '.intro-center-hero',
      {
        scale: 3.2,
        opacity: 0,
        filter: 'blur(12px)',
        duration: 0.85,
        ease: 'power2.in',
      },
      0.05
    )
    .to(
      '.intro-glow-aura',
      {
        scale: 2.8,
        opacity: 0.8,
        duration: 0.8,
      },
      0.05
    )
    .to(
      '#intro-screen',
      {
        opacity: 0,
        duration: 0.35,
      },
      0.65
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
  // Commute preset cards navigate to main map with route params
  document.querySelectorAll<HTMLElement>('[data-commute-route]').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault()
      const routeData = card.dataset.commuteRoute
      if (routeData) {
        window.location.href = `/map?route=${encodeURIComponent(routeData)}`
      }
    })
  })
}

