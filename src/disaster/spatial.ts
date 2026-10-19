import type { EnvironmentalReading, HazardStatus } from './types'

const R_EARTH = 6371008.8
const rad = (d: number) => (d * Math.PI) / 180

/**
 * Calculates great-circle distance between two geographic coordinates in metres.
 */
export function distanceMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R_EARTH * Math.asin(Math.sqrt(s))
}

/**
 * Generates an approximated polygon for a circular buffer in [lon, lat] coordinates.
 */
export function createCirclePolygon(
  center: [number, number],
  radiusMetres: number,
  segments = 24,
): [number, number][] {
  const [lon, lat] = center
  const coords: [number, number][] = []
  const latR = rad(lat)
  const dLat = radiusMetres / R_EARTH
  const dLon = radiusMetres / (R_EARTH * Math.cos(latR))

  for (let i = 0; i <= segments; i++) {
    const theta = (i * 2 * Math.PI) / segments
    const pLat = lat + (dLat * Math.sin(theta) * 180) / Math.PI
    const pLon = lon + (dLon * Math.cos(theta) * 180) / Math.PI
    coords.push([+pLon.toFixed(6), +pLat.toFixed(6)])
  }
  return coords
}

/**
 * Tests if point [lon, lat] is inside polygon [[lon, lat], ...] using ray-casting.
 */
export function pointInPolygon(
  point: [number, number],
  polygon: [number, number][],
): boolean {
  const [px, py] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]!
    const [xj, yj] = polygon[j]!
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Tests if a line segment between (lat1, lon1) and (lat2, lon2) passes within radiusMetres of center.
 */
export function segmentIntersectsBuffer(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  centerLat: number,
  centerLon: number,
  radiusMetres: number,
): boolean {
  // Check endpoints first
  if (distanceMetres(lat1, lon1, centerLat, centerLon) <= radiusMetres) return true
  if (distanceMetres(lat2, lon2, centerLat, centerLon) <= radiusMetres) return true

  // Check midpoint and quarter points for cheap, robust approximation
  const midLat = (lat1 + lat2) / 2
  const midLon = (lon1 + lon2) / 2
  if (distanceMetres(midLat, midLon, centerLat, centerLon) <= radiusMetres) return true

  const q1Lat = (lat1 + midLat) / 2
  const q1Lon = (lon1 + midLon) / 2
  if (distanceMetres(q1Lat, q1Lon, centerLat, centerLon) <= radiusMetres) return true

  const q3Lat = (midLat + lat2) / 2
  const q3Lon = (lon1 + midLon) / 2
  if (distanceMetres(q3Lat, q3Lon, centerLat, centerLon) <= radiusMetres) return true

  return false
}

/**
 * Hydrological & Topographic Risk Assessment Model:
 * Evaluates flood probability and estimated water depth at a road chokepoint based on:
 * - Current rainfall intensity (mm/hr)
 * - 3-hour cumulative rainfall (mm)
 * - Soil water saturation index (0..100%)
 * - Relative elevation depression dip (metres below surrounding roads)
 * - Local culvert / storm pump drainage capacity (0..1)
 */
export function evaluateTunnelFloodRisk(
  reading: EnvironmentalReading,
  elevationDipM: number,
  drainageCapacity: number,
): {
  floodProbability: number
  estimatedDepthCm: number
  status: HazardStatus
} {
  const rainRate = reading.currentRainfallRate
  const accumRain = reading.accumulated3hRainfall
  const soil = reading.soilMoisturePercent / 100

  // Runoff volume factor (mm equivalents)
  const runoffFactor = rainRate * 0.75 + accumRain * 0.45 * (0.5 + soil * 0.5)

  // Topographic accumulation factor: water naturally drains down into low elevation dips
  const topographyMultiplier = 1.0 + Math.max(0, elevationDipM) * 0.9

  // Drainage alleviation factor: pump capacity removes water
  const netWaterLoad = (runoffFactor * topographyMultiplier) / Math.max(0.15, drainageCapacity)

  // Estimated accumulated depth in centimetres
  const estimatedDepthCm = Math.max(0, Math.round(netWaterLoad * 0.42))

  // Logistic probability function
  // Critical passability threshold for pedestrians/cyclists is ~25-30 cm
  const z = (estimatedDepthCm - 28) / 7.5
  const floodProbability = 1 / (1 + Math.exp(-z))

  let status: HazardStatus = 'unknown'
  if (estimatedDepthCm >= 30) {
    status = 'confirmed_closed'
  } else if (estimatedDepthCm >= 12) {
    status = 'caution_passable'
  } else {
    status = 'safe_corridor'
  }

  return {
    floodProbability: +floodProbability.toFixed(3),
    estimatedDepthCm,
    status,
  }
}

/**
 * Finds all graph edges within radiusMetres of a coordinate.
 */
export function findEdgesWithinRadius(
  centerLat: number,
  centerLon: number,
  radiusMetres: number,
  graph: { lat: number[]; lon: number[]; edges: [number, number, ...any[]][] },
): number[] {
  const blocked: number[] = []
  for (let i = 0; i < graph.edges.length; i++) {
    const [a, b] = graph.edges[i]!
    const latA = graph.lat[a]!
    const lonA = graph.lon[a]!
    const latB = graph.lat[b]!
    const lonB = graph.lon[b]!
    if (segmentIntersectsBuffer(latA, lonA, latB, lonB, centerLat, centerLon, radiusMetres)) {
      blocked.push(i)
    }
  }
  return blocked
}
