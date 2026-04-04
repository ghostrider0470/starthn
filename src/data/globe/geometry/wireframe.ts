/**
 * Wireframe grid geometry
 * Creates latitude/longitude grid lines for the globe
 */

import * as THREE from 'three'
import { latLngToVector3 } from '../utils'

/**
 * Create enhanced wireframe grid
 */
export function createEnhancedWireframeGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const vertices: number[] = []

  // Latitude lines
  for (let lat = -80; lat <= 80; lat += 15) {
    for (let lng = -180; lng < 180; lng += 3) {
      const pos1 = latLngToVector3(lat, lng)
      const pos2 = latLngToVector3(lat, lng + 3)
      vertices.push(pos1.x, pos1.y, pos1.z)
      vertices.push(pos2.x, pos2.y, pos2.z)
    }
  }

  // Longitude lines
  for (let lng = -180; lng <= 180; lng += 20) {
    for (let lat = -80; lat < 80; lat += 3) {
      const pos1 = latLngToVector3(lat, lng)
      const pos2 = latLngToVector3(lat + 3, lng)
      vertices.push(pos1.x, pos1.y, pos1.z)
      vertices.push(pos2.x, pos2.y, pos2.z)
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  return geometry
}
