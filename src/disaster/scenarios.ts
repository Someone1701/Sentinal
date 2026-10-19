import type { DisasterScenario, HazardZone } from './types'
import { createCirclePolygon } from './spatial'

/**
 * Verified Ground Truth Chokepoints at VIT Vellore:
 * The railway line bisects the campus into South (Academic / LH) and North (Hostels).
 * 
 * 1. Central Canal Underpass (Edge 185):
 *    Low-lying canal-type underpass next to Mother Teresa Block / TT Annexe connecting
 *    directly to Just Bake / E-Block / K-Block. Submerged during heavy downpours.
 * 
 * 2. West Boundary Canal Underpass (Edges 119, 176):
 *    Perimeter canal underpass next to Anna Audi courts connecting to A-Block / One Food World.
 *    Prone to storm runoff blockage.
 * 
 * 3. H & J Block Main Tunnel (Edges 204, 492):
 *    Reinforced high-clearance tunnel between TT Fountain Garden and H/J Blocks. Safe during storms.
 * 
 * 4. Pearl Research Park (PRP) Main Tunnel (Edges 434, 727, 724, 627):
 *    Major grade-separated arterial underpass connecting PRP and Gate 11A. Highly resilient.
 */

export const GROUND_TRUTH_CHOKEPOINTS = {
  centralCanalUnderpass: {
    id: 'hz-central-canal',
    name: 'Central Canal Underpass (Mother Teresa ↔ Just Bake)',
    center: [79.160364, 12.971462] as [number, number],
    edges: [185],
    radiusMetres: 12,
    elevationDipM: 2.4,
    drainageCapacity: 0.22,
  },
  westCanalUnderpass: {
    id: 'hz-west-canal',
    name: 'West Boundary Canal Underpass (Anna Audi ↔ A-Block)',
    center: [79.15654, 12.97146] as [number, number],
    edges: [119, 176],
    radiusMetres: 14,
    elevationDipM: 2.1,
    drainageCapacity: 0.28,
  },
  hjBlockTunnel: {
    id: 'hz-hj-tunnel',
    name: 'H & J Block Main Tunnel (TT ↔ H/J Blocks)',
    center: [79.158316, 12.971424] as [number, number],
    edges: [204, 492],
    radiusMetres: 12,
    elevationDipM: 0.8,
    drainageCapacity: 0.92,
  },
  prpMainTunnel: {
    id: 'hz-prp-tunnel',
    name: 'Pearl Research Park (PRP) Main Tunnel',
    center: [79.16540, 12.97145] as [number, number],
    edges: [434, 727, 724, 627],
    radiusMetres: 16,
    elevationDipM: 0.5,
    drainageCapacity: 0.95,
  },
}

export function buildMonsoonHazards(): HazardZone[] {
  const now = new Date().toISOString()
  return [
    {
      id: GROUND_TRUTH_CHOKEPOINTS.centralCanalUnderpass.id,
      title: '🚨 Central Canal Underpass Flooded & Closed',
      type: 'flood',
      severity: 'critical',
      status: 'confirmed_closed',
      blockedEdges: GROUND_TRUTH_CHOKEPOINTS.centralCanalUnderpass.edges,
      affectedEdges: [185],
      center: GROUND_TRUTH_CHOKEPOINTS.centralCanalUnderpass.center,
      polygon: createCirclePolygon(GROUND_TRUTH_CHOKEPOINTS.centralCanalUnderpass.center, 12),
      radiusMetres: 12,
      waterDepthCm: 48,
      roadName: 'Mother Teresa Block ↔ Just Bake Link Canal',
      description:
        'Confirmed complete road blockage: Standing flood water accumulated under the railway culvert. Completely impassable for walking.',
      source: 'Campus Security Incident Feed & Topographic Runoff Model',
      url: 'https://vit.ac.in',
      timestamp: now,
      isSimulated: true,
    },
    {
      id: GROUND_TRUTH_CHOKEPOINTS.westCanalUnderpass.id,
      title: '🚨 West Boundary Canal Underpass Flooded & Closed',
      type: 'flood',
      severity: 'critical',
      status: 'confirmed_closed',
      blockedEdges: GROUND_TRUTH_CHOKEPOINTS.westCanalUnderpass.edges,
      affectedEdges: [119, 176],
      center: GROUND_TRUTH_CHOKEPOINTS.westCanalUnderpass.center,
      polygon: createCirclePolygon(GROUND_TRUTH_CHOKEPOINTS.westCanalUnderpass.center, 14),
      radiusMetres: 14,
      waterDepthCm: 52,
      roadName: 'Anna Audi Courts ↔ A-Block Perimeter Road',
      description:
        'Confirmed road closure: Runoff from western boundary fields has submerged the low-clearance canal underpass under stormwater.',
      source: 'Campus Security Incident Feed & Topographic Runoff Model',
      url: 'https://vit.ac.in',
      timestamp: now,
      isSimulated: true,
    },
    {
      id: 'hz-lake-caution',
      title: '⚠️ Waterlogging Caution near SJT / Lake Promenade',
      type: 'waterlogging',
      severity: 'warning',
      status: 'caution_passable',
      blockedEdges: [],
      affectedEdges: [197, 202, 187],
      center: [79.16335, 12.97150],
      polygon: createCirclePolygon([79.16335, 12.97150], 35),
      radiusMetres: 35,
      waterDepthCm: 18,
      roadName: 'SJT South East Service Road',
      description:
        'Moderate waterlogging (15-20cm water). Passable with caution; navigation applies a risk detour cost penalty.',
      source: 'Drainage Monitoring Sensor',
      timestamp: now,
      isSimulated: true,
    },
  ]
}

export function buildTotalIsolationHazards(): HazardZone[] {
  const now = new Date().toISOString()
  const monsoonHazards = buildMonsoonHazards()

  // In this worst-case disaster scenario, ALL crossing tunnels are completely closed
  const isolationHazards: HazardZone[] = [
    ...monsoonHazards,
    {
      id: 'hz-hj-closed',
      title: '🚨 H & J Block Main Tunnel Structural Closure',
      type: 'closure',
      severity: 'critical',
      status: 'confirmed_closed',
      blockedEdges: GROUND_TRUTH_CHOKEPOINTS.hjBlockTunnel.edges,
      affectedEdges: GROUND_TRUTH_CHOKEPOINTS.hjBlockTunnel.edges,
      center: GROUND_TRUTH_CHOKEPOINTS.hjBlockTunnel.center,
      polygon: createCirclePolygon(GROUND_TRUTH_CHOKEPOINTS.hjBlockTunnel.center, 12),
      radiusMetres: 12,
      waterDepthCm: 60,
      roadName: 'Technology Tower ↔ H/J Block Arterial Tunnel',
      description:
        'Emergency closure: Railway drainage backflow has overwhelmed the storm pump. Tunnel blocked by emergency order.',
      source: 'Emergency Response Command Center',
      timestamp: now,
      isSimulated: true,
    },
    {
      id: 'hz-prp-closed',
      title: '🚨 PRP Main Tunnel Emergency Barrier',
      type: 'closure',
      severity: 'critical',
      status: 'confirmed_closed',
      blockedEdges: GROUND_TRUTH_CHOKEPOINTS.prpMainTunnel.edges,
      affectedEdges: GROUND_TRUTH_CHOKEPOINTS.prpMainTunnel.edges,
      center: GROUND_TRUTH_CHOKEPOINTS.prpMainTunnel.center,
      polygon: createCirclePolygon(GROUND_TRUTH_CHOKEPOINTS.prpMainTunnel.center, 40),
      radiusMetres: 40,
      waterDepthCm: 55,
      roadName: 'Pearl Research Park Underpass',
      description:
        'Emergency barrier deployed: Mudslide and electrical hazard at the east subway entrance. No pedestrian or vehicle access.',
      source: 'Emergency Response Command Center',
      timestamp: now,
      isSimulated: true,
    },
  ]

  return isolationHazards
}

export const PRESET_SCENARIOS: DisasterScenario[] = [
  {
    id: 'monsoon_flood',
    name: 'Demonstration 1: Monsoon Flash Flood (2 Canal Underpasses Blocked)',
    description:
      'Heavy rainfall triggers flash waterlogging at the 2 vulnerable canal underpasses (Mother Teresa ↔ Just Bake and Anna Audi ↔ A-Block). Navigation automatically diverts to the H&J and PRP tunnels.',
    simulatedRainfallMmH: 48,
    hazards: buildMonsoonHazards(),
  },
  {
    id: 'all_blocked',
    name: 'Demonstration 2: Complete Campus Isolation (All Tunnels Impassable)',
    description:
      'Catastrophic storm event where all 4 railway crossings are impassable. The navigation system warns the user that no verified accessible path exists and advises shelter in place.',
    simulatedRainfallMmH: 95,
    hazards: buildTotalIsolationHazards(),
  },
]
