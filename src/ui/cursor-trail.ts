import gsap from 'gsap'

/**
 * GSAP Fluid Cursor Trail Component
 * Inspired by https://demos.gsap.com/demo/cursor-trail/
 * Features:
 * - Precision tracking dot with cyan neon aura
 * - Trailing physics node chain (12 nodes) with diminishing size & gradient decay
 * - Magnetic interactive scaling on buttons, links, and cards
 * - Zero touch-device overhead & respects prefers-reduced-motion
 */

interface TrailNode {
  el: HTMLDivElement
  x: number
  y: number
  scale: number
  alpha: number
}

export function initCursorTrail(): () => void {
  // Graceful degradation: skip on touch devices or if reduced motion is requested
  if (
    typeof window === 'undefined' ||
    !window.matchMedia('(pointer: fine)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return () => {}
  }

  // Check if container already exists
  let root = document.getElementById('gsap-cursor-trail-root')
  if (root) root.remove()

  root = document.createElement('div')
  root.id = 'gsap-cursor-trail-root'
  root.className = 'cursor-trail-container'
  root.setAttribute('aria-hidden', 'true')
  document.body.appendChild(root)

  // 1. Center Precision Dot & Ring
  const ring = document.createElement('div')
  ring.className = 'cursor-trail-ring'
  root.appendChild(ring)

  const dot = document.createElement('div')
  dot.className = 'cursor-trail-dot'
  root.appendChild(dot)

  // 2. Trailing Node Chain
  const NODE_COUNT = 14
  const nodes: TrailNode[] = []

  // Color gradient palette across the trail: cyan -> neon lime -> indigo -> violet
  const colors = [
    'rgba(34, 211, 238, 0.9)',
    'rgba(34, 211, 238, 0.8)',
    'rgba(56, 189, 248, 0.75)',
    'rgba(99, 102, 241, 0.7)',
    'rgba(129, 140, 248, 0.65)',
    'rgba(168, 85, 247, 0.6)',
    'rgba(192, 132, 252, 0.55)',
    'rgba(230, 245, 54, 0.5)',
    'rgba(34, 211, 238, 0.45)',
    'rgba(99, 102, 241, 0.4)',
    'rgba(99, 102, 241, 0.3)',
    'rgba(147, 51, 234, 0.25)',
    'rgba(34, 211, 238, 0.2)',
    'rgba(34, 211, 238, 0.1)',
  ]

  for (let i = 0; i < NODE_COUNT; i++) {
    const el = document.createElement('div')
    el.className = 'cursor-trail-node'
    const color = colors[i % colors.length] ?? 'rgba(34, 211, 238, 0.8)'
    el.style.backgroundColor = color
    el.style.boxShadow = `0 0 ${12 - i * 0.6}px ${color}`
    root.appendChild(el)

    nodes.push({
      el,
      x: -100,
      y: -100,
      scale: 1 - (i / NODE_COUNT) * 0.75,
      alpha: 1 - (i / NODE_COUNT) * 0.85,
    })
  }

  // Mouse Coordinates & Target Positions
  let mouseX = -100
  let mouseY = -100
  let isMoving = false
  let idleTimer: number | null = null
  let isHovered = false

  // GSAP quickTo setters for instant 120 FPS hardware acceleration
  const setRingX = gsap.quickTo(ring, 'x', { duration: 0.18, ease: 'power3.out' })
  const setRingY = gsap.quickTo(ring, 'y', { duration: 0.18, ease: 'power3.out' })
  const setDotX = gsap.quickTo(dot, 'x', { duration: 0.05, ease: 'none' })
  const setDotY = gsap.quickTo(dot, 'y', { duration: 0.05, ease: 'none' })

  // Initialize off-screen
  gsap.set([dot, ring], { xPercent: -50, yPercent: -50, x: -100, y: -100, opacity: 0 })
  nodes.forEach((n) => gsap.set(n.el, { xPercent: -50, yPercent: -50, x: -100, y: -100, opacity: 0 }))

  let hasEntered = false

  const onMouseMove = (e: MouseEvent) => {
    mouseX = e.clientX
    mouseY = e.clientY

    if (!hasEntered) {
      hasEntered = true
      gsap.to([dot, ring], { opacity: 1, duration: 0.3 })
      nodes.forEach((n) => gsap.to(n.el, { opacity: n.alpha, duration: 0.3 }))
    }

    setDotX(mouseX)
    setDotY(mouseY)
    setRingX(mouseX)
    setRingY(mouseY)

    isMoving = true

    if (idleTimer) window.clearTimeout(idleTimer)
    idleTimer = window.setTimeout(() => {
      isMoving = false
    }, 1500)
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })

  // Interactive Hover Targets (Buttons, Links, Cards)
  const hoverSelectors =
    'a, button, [role="button"], input, select, textarea, .commute-card, .bento-card, .underpass-card, .gallery-card, .telemetry-card'

  const onMouseOver = (e: MouseEvent) => {
    const target = (e.target as HTMLElement)?.closest(hoverSelectors)
    if (target && !isHovered) {
      isHovered = true
      ring.classList.add('cursor-ring-active')
      dot.classList.add('cursor-dot-active')
      gsap.to(ring, {
        scale: 1.85,
        duration: 0.3,
        ease: 'back.out(2)',
        borderColor: 'rgba(34, 211, 238, 0.85)',
      })
      gsap.to(dot, {
        scale: 0.6,
        duration: 0.25,
      })
    }
  }

  const onMouseOut = (e: MouseEvent) => {
    const target = (e.target as HTMLElement)?.closest(hoverSelectors)
    if (target && isHovered) {
      isHovered = false
      ring.classList.remove('cursor-ring-active')
      dot.classList.remove('cursor-dot-active')
      gsap.to(ring, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
        borderColor: 'rgba(34, 211, 238, 0.4)',
      })
      gsap.to(dot, {
        scale: 1,
        duration: 0.25,
      })
    }
  }

  const onMouseDown = () => {
    gsap.to(ring, { scale: 0.75, duration: 0.15, ease: 'power2.in' })
    gsap.to(dot, { scale: 1.3, duration: 0.15 })
  }

  const onMouseUp = () => {
    gsap.to(ring, { scale: isHovered ? 1.85 : 1, duration: 0.3, ease: 'back.out(2)' })
    gsap.to(dot, { scale: isHovered ? 0.6 : 1, duration: 0.25 })
  }

  document.addEventListener('mouseover', onMouseOver, { passive: true })
  document.addEventListener('mouseout', onMouseOut, { passive: true })
  document.addEventListener('mousedown', onMouseDown, { passive: true })
  document.addEventListener('mouseup', onMouseUp, { passive: true })

  // Smooth Physics RAF Loop for the Trailing Nodes
  let rafId = 0

  const renderTrail = () => {
    // Lead node chases the mouse directly with high damping
    if (nodes.length > 0) {
      const lead = nodes[0]!
      lead.x += (mouseX - lead.x) * 0.45
      lead.y += (mouseY - lead.y) * 0.45
      gsap.set(lead.el, { x: lead.x, y: lead.y })

      // Subsequent nodes follow the node ahead in the chain (Euler spring lag)
      for (let i = 1; i < nodes.length; i++) {
        const curr = nodes[i]!
        const prev = nodes[i - 1]!
        const friction = 0.32 - i * 0.012

        curr.x += (prev.x - curr.x) * friction
        curr.y += (prev.y - curr.y) * friction

        gsap.set(curr.el, {
          x: curr.x,
          y: curr.y,
          scale: curr.scale,
          opacity: isMoving ? curr.alpha : curr.alpha * 0.3,
        })
      }
    }

    rafId = requestAnimationFrame(renderTrail)
  }

  rafId = requestAnimationFrame(renderTrail)

  // Return Cleanup Function
  return () => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseover', onMouseOver)
    document.removeEventListener('mouseout', onMouseOut)
    document.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('mouseup', onMouseUp)
    if (idleTimer) window.clearTimeout(idleTimer)
    root?.remove()
  }
}
