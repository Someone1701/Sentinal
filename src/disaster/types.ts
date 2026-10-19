export type HazardSeverity = 'info' | 'caution' | 'warning' | 'severe' | 'critical'

export type HazardType = 'flood' | 'waterlogging' | 'landslide' | 'storm' | 'closure' | 'accident'

export type HazardStatus = 'confirmed_closed' | 'caution_passable' | 'safe_corridor' | 'unknown'

export interface HazardZone {
  id: string
  title: string
  type: HazardType
  severity: HazardSeverity
  status: HazardStatus
  /** Graph edge indices that are completely blocked (impassable) */
  blockedEdges: number[]
  /** Graph edge indices that have a high risk penalty multiplier */
  affectedEdges: number[]
  center: [number, number] // [lon, lat]
  polygon?: [number, number][] // [[lon, lat], ...]
  radiusMetres?: number
  waterDepthCm?: number
  description: string
  roadName: string
  source: string
  url?: string
  photoDataUrl?: string
  timestamp: string
  isSimulated: boolean
}

export interface WeatherForecastHourly {
  time: string
  temperatureC: number
  precipitationMm: number
  precipitationProbability: number
  weatherCode: number
  weatherDescription: string
  windSpeedKmh: number
  soilMoisturePercent: number
  floodRiskLevel: 'low' | 'moderate' | 'high' | 'critical'
}

export interface GlofasFloodReading {
  riverDischargeM3s: number
  riverDischargeMaxM3s: number
  riverDischargeMedianM3s: number
  basinRunoffRisk: 'normal' | 'elevated' | 'severe' | 'extreme'
  fetchedAt: string
}

export interface EnvironmentalReading {
  timestamp: string
  temperatureC: number
  apparentTemperatureC?: number
  currentRainfallRate: number // mm/hr
  accumulated3hRainfall: number // mm
  relativeHumidityPercent?: number
  surfacePressureHpa?: number
  cloudCoverPercent?: number
  weatherCode: number
  weatherDescription: string
  soilMoisturePercent: number
  soilMoistureSubsurfacePercent?: number
  windSpeedKmh: number
  windGustsKmh?: number
  windDirectionDeg?: number
  isLive: boolean
  source: string
  lastFetchedAt: string
  hourlyForecast?: WeatherForecastHourly[]
  glofasDischarge?: GlofasFloodReading
}

export interface UserFieldReport {
  id: string
  timestamp: string
  lat: number
  lon: number
  roadName: string
  hazardType: HazardType
  severity: HazardSeverity
  waterDepthCm?: number
  photoDataUrl?: string
  photoFileName?: string
  notes: string
  reportedBy: string
  accuracyMetres?: number
}

export interface WorkflowStep {
  stepNumber: number
  title: string
  shortTag: string
  summary: string
  details: string
  status: 'active' | 'completed' | 'standby'
  metricLabel?: string
  metricValue?: string
  formula?: string
}

export type DisasterScenarioId = 'normal' | 'live' | 'monsoon_flood' | 'severe_cyclone' | 'all_blocked'

export interface DisasterScenario {
  id: DisasterScenarioId
  name: string
  description: string
  simulatedRainfallMmH: number
  hazards: HazardZone[]
}

export interface RouteSafetyReport {
  status: 'SAFE' | 'HAZARD_AVOIDED' | 'IMPASSABLE' | 'UNVERIFIED'
  hazardsEncountered: HazardZone[]
  blockedEdgesEncountered: number[]
  explanation: string
  distanceDeltaMetres: number
  timeDeltaSeconds: number
  originalMetres?: number
  originalSeconds?: number
  safeMetres?: number
  safeSeconds?: number
}
