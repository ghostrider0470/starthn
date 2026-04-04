import * as THREE from 'three'
import { CONTINENT_BOUNDS, GLOBE_RADII } from './constants'
import type { DataCenterMarker } from './markers'

/**
 * Convert lat/lng to 3D coordinates on a sphere
 * @param lat Latitude in degrees (-90 to 90)
 * @param lng Longitude in degrees (-180 to 180)
 * @param radius Sphere radius (default: 2)
 * @returns Three.js Vector3 position
 */
export function latLngToVector3(lat: number, lng: number, radius: number = GLOBE_RADII.base): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)

  return new THREE.Vector3(x, y, z)
}

/**
 * Determine which continent a coordinate belongs to
 * @param lat Latitude in degrees
 * @param lng Longitude in degrees
 * @returns Continent name or null if not within any defined bounds
 */
export function getContinentFromCoordinate(lat: number, lng: number): string | null {
  for (const [continent, bounds] of Object.entries(CONTINENT_BOUNDS)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat &&
        lng >= bounds.minLng && lng <= bounds.maxLng) {
      return continent
    }
  }
  return null
}

/**
 * Get 3D position for a data center marker
 * @param marker Data center marker object
 * @param radius Sphere radius (default: markers radius)
 * @returns Three.js Vector3 position
 */
export function getDataCenterPosition(marker: DataCenterMarker, radius: number = GLOBE_RADII.markers): THREE.Vector3 {
  return latLngToVector3(marker.lat, marker.lng, radius)
}

/**
 * Create curved arc between two points on globe
 * @param start Starting position
 * @param end Ending position
 * @param arcHeight Height of the arc (default: 0.5)
 * @returns Three.js CatmullRomCurve3
 */
export function createArcCurve(start: THREE.Vector3, end: THREE.Vector3, arcHeight: number = 0.5): THREE.CatmullRomCurve3 {
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  mid.normalize().multiplyScalar(GLOBE_RADII.base + arcHeight)
  return new THREE.CatmullRomCurve3([start, mid, end])
}
