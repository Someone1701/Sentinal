/**
 * Zero-dependency, client-side EXIF GPS metadata extractor.
 * Operates purely on binary ArrayBuffers in the browser (< 5ms execution).
 */

export interface ExifLocation {
  lat: number
  lon: number
  altitude?: number
  timestamp?: string
  filename?: string
}

/**
 * Extracts GPS location from an image File or Blob.
 */
export async function extractExifGps(file: File | Blob): Promise<ExifLocation | null> {
  const filename = file instanceof File ? file.name : undefined
  const buffer = await file.arrayBuffer()
  const view = new DataView(buffer)

  // 1. Check for JPEG SOI marker (0xFFD8)
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return null
  }

  // 2. Scan for APP1 marker (0xFFE1)
  let offset = 2
  while (offset < view.byteLength - 4) {
    const marker = view.getUint16(offset)
    offset += 2

    if (marker === 0xffe1) {
      // APP1 found
      const length = view.getUint16(offset)
      const app1Data = new DataView(buffer, offset + 2, length - 2)
      const res = parseApp1(app1Data)
      if (res) {
        return { ...res, filename }
      }
      break
    } else if ((marker & 0xff00) === 0xff00) {
      // Other JPEG segment, skip its payload
      if (marker === 0xffda || marker === 0xffd9) {
        // Start of Scan or End of Image
        break
      }
      const len = view.getUint16(offset)
      offset += len
    } else {
      break
    }
  }

  return null
}

function parseApp1(view: DataView): Omit<ExifLocation, 'filename'> | null {
  // Check for 'Exif\0\0' header (0x45786966 0x0000)
  if (view.byteLength < 14) return null
  const exifHeader = view.getUint32(0)
  const exifZero = view.getUint16(4)
  if (exifHeader !== 0x45786966 || exifZero !== 0x0000) {
    return null
  }

  // TIFF Header starts at offset 6
  const tiffOffset = 6
  const byteOrder = view.getUint16(tiffOffset)
  let littleEndian = false

  if (byteOrder === 0x4949) {
    // 'II' Little Endian
    littleEndian = true
  } else if (byteOrder === 0x4d4d) {
    // 'MM' Big Endian
    littleEndian = false
  } else {
    return null
  }

  // Check 42 magic number (0x002A)
  if (view.getUint16(tiffOffset + 2, littleEndian) !== 0x002a) {
    return null
  }

  // Offset to 0th IFD
  const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian)
  if (firstIfdOffset < 8 || tiffOffset + firstIfdOffset >= view.byteLength) {
    return null
  }

  // Find GPS IFD Pointer (Tag 0x8825)
  const gpsOffset = findGpsIfdOffset(view, tiffOffset, firstIfdOffset, littleEndian)
  if (gpsOffset == null || tiffOffset + gpsOffset >= view.byteLength) {
    return null
  }

  return parseGpsIfd(view, tiffOffset, gpsOffset, littleEndian)
}

function findGpsIfdOffset(
  view: DataView,
  tiffBase: number,
  ifdRelOffset: number,
  littleEndian: boolean,
): number | null {
  const start = tiffBase + ifdRelOffset
  if (start + 2 > view.byteLength) return null

  const numEntries = view.getUint16(start, littleEndian)
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = start + 2 + i * 12
    if (entryOffset + 12 > view.byteLength) break

    const tag = view.getUint16(entryOffset, littleEndian)
    if (tag === 0x8825) {
      // GPS IFD tag pointer
      return view.getUint32(entryOffset + 8, littleEndian)
    }
  }

  return null
}

function parseGpsIfd(
  view: DataView,
  tiffBase: number,
  gpsRelOffset: number,
  littleEndian: boolean,
): Omit<ExifLocation, 'filename'> | null {
  const start = tiffBase + gpsRelOffset
  if (start + 2 > view.byteLength) return null

  const numEntries = view.getUint16(start, littleEndian)
  let latRef = 'N'
  let lonRef = 'E'
  let latRaw: number[] | null = null
  let lonRaw: number[] | null = null
  let altitude: number | undefined

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = start + 2 + i * 12
    if (entryOffset + 12 > view.byteLength) break

    const tag = view.getUint16(entryOffset, littleEndian)
    const count = view.getUint32(entryOffset + 4, littleEndian)

    if (tag === 0x0001) {
      // GPSLatitudeRef
      const charCode = view.getUint8(entryOffset + 8)
      latRef = String.fromCharCode(charCode).toUpperCase() || 'N'
    } else if (tag === 0x0002 && count === 3) {
      // GPSLatitude (3 rational numbers: degrees, minutes, seconds)
      const valOffset = view.getUint32(entryOffset + 8, littleEndian)
      latRaw = readRationals(view, tiffBase + valOffset, 3, littleEndian)
    } else if (tag === 0x0003) {
      // GPSLongitudeRef
      const charCode = view.getUint8(entryOffset + 8)
      lonRef = String.fromCharCode(charCode).toUpperCase() || 'E'
    } else if (tag === 0x0004 && count === 3) {
      // GPSLongitude (3 rational numbers: degrees, minutes, seconds)
      const valOffset = view.getUint32(entryOffset + 8, littleEndian)
      lonRaw = readRationals(view, tiffBase + valOffset, 3, littleEndian)
    } else if (tag === 0x0006 && count === 1) {
      // GPSAltitude
      const valOffset = view.getUint32(entryOffset + 8, littleEndian)
      const altVals = readRationals(view, tiffBase + valOffset, 1, littleEndian)
      if (altVals && altVals[0] != null) altitude = Math.round(altVals[0])
    }
  }

  if (!latRaw || !lonRaw || latRaw.length < 3 || lonRaw.length < 3) {
    return null
  }

  const dLat = (latRaw[0] ?? 0) + (latRaw[1] ?? 0) / 60 + (latRaw[2] ?? 0) / 3600
  const dLon = (lonRaw[0] ?? 0) + (lonRaw[1] ?? 0) / 60 + (lonRaw[2] ?? 0) / 3600

  let lat = dLat
  let lon = dLon

  if (latRef === 'S') lat = -lat
  if (lonRef === 'W') lon = -lon

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
    return null
  }

  return { lat, lon, altitude }
}

function readRationals(
  view: DataView,
  offset: number,
  count: number,
  littleEndian: boolean,
): number[] | null {
  if (offset + count * 8 > view.byteLength) return null
  const out: number[] = []

  for (let i = 0; i < count; i++) {
    const num = view.getUint32(offset + i * 8, littleEndian)
    const den = view.getUint32(offset + i * 8 + 4, littleEndian)
    if (den === 0) {
      out.push(0)
    } else {
      out.push(num / den)
    }
  }

  return out
}
