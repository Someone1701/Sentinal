/**
 * Coordinate parser and formatting utilities.
 * Handles diverse user inputs: decimal degrees, inverted order, DMS, Google Maps URLs.
 */

export interface Coordinate {
  lat: number
  lon: number
  formatted: string
  nearCampus: boolean
}

/** Bounds roughly around Vellore district / campus (lat: ~12.97, lon: ~79.16) */
const CAMPUS_BOX = {
  minLat: 12.90,
  maxLat: 13.05,
  minLon: 79.10,
  maxLon: 79.25,
}

export function isNearCampus(lat: number, lon: number): boolean {
  return lat >= CAMPUS_BOX.minLat && lat <= CAMPUS_BOX.maxLat &&
         lon >= CAMPUS_BOX.minLon && lon <= CAMPUS_BOX.maxLon
}

export function formatCoordinates(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(5)}° ${ns}, ${Math.abs(lon).toFixed(5)}° ${ew}`
}

/**
 * Parses coordinates from free-form user text, search query, or URL.
 */
export function parseCoordinates(raw: string): Coordinate | null {
  const text = raw.trim()
  if (!text || text.length < 5) return null

  // 1. Check for URL patterns (e.g. google maps ?q=12.97,79.16 or @12.97,79.16)
  const urlMatch = text.match(/[@?&]q?=([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)/i)
  if (urlMatch && urlMatch[1] && urlMatch[2]) {
    const lat = parseFloat(urlMatch[1])
    const lon = parseFloat(urlMatch[2])
    return buildCoordinate(lat, lon)
  }

  // 2. Check for DMS or directional letters: e.g. 12.9716N, 79.1634E or 12°58'17"N 79°9'48"E
  const dirMatch = text.match(/([+-]?\d+(?:\.\d+)?)\s*(?:°)?\s*([NS])\s*[,;\s]+\s*([+-]?\d+(?:\.\d+)?)\s*(?:°)?\s*([EW])/i)
  if (dirMatch && dirMatch[1] && dirMatch[2] && dirMatch[3] && dirMatch[4]) {
    let lat = parseFloat(dirMatch[1])
    let lon = parseFloat(dirMatch[3])
    if (dirMatch[2].toUpperCase() === 'S') lat = -lat
    if (dirMatch[4].toUpperCase() === 'W') lon = -lon
    return buildCoordinate(lat, lon)
  }

  // 3. Check for standard decimal pairs: e.g. "12.9716, 79.1634" or "12.9716 79.1634"
  // Avoid matching single numbers or pure room codes like "327"
  const pairMatch = text.match(/^([+-]?\d{1,2}(?:\.\d+)?)[,\s/]+([+-]?\d{1,3}(?:\.\d+)?)$/)
  if (pairMatch && pairMatch[1] && pairMatch[2]) {
    let first = parseFloat(pairMatch[1])
    let second = parseFloat(pairMatch[2])

    // Intelligent auto-detection of swapped lon/lat:
    // In India/Vellore, longitude is ~79.x and latitude is ~12.x.
    // If user wrote "79.1634, 12.9716", auto-correct first as lon and second as lat.
    if ((first > 60 && first < 100) && (second > 0 && second < 40)) {
      const temp = first
      first = second
      second = temp
    }

    return buildCoordinate(first, second)
  }

  return null
}

function buildCoordinate(lat: number, lon: number): Coordinate | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  // Basic earth latitude/longitude bounds validation
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null

  return {
    lat,
    lon,
    formatted: formatCoordinates(lat, lon),
    nearCampus: isNearCampus(lat, lon),
  }
}
