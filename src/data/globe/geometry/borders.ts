/**
 * Country border geometry
 * Creates line segments for country boundaries
 */

import * as THREE from 'three'
import { GLOBE_RADII } from '../constants'
import { latLngToVector3 } from '../utils'
import { fetchCountryData } from './loaders'

/**
 * Create country border lines
 */
export async function createCountryBordersGeometry(): Promise<THREE.BufferGeometry> {
  const geometry = new THREE.BufferGeometry()
  const vertices: number[] = []

  try {
    const worldData = await fetchCountryData()

    if (worldData && worldData.features) {
      worldData.features.forEach((feature: any) => {
        if (feature.geometry && feature.geometry.coordinates) {
          const coordinates = feature.geometry.coordinates

          const processPolygon = (polygon: number[][][]) => {
            const ring = polygon[0]
            for (let i = 0; i < ring.length - 1; i++) {
              const [lng1, lat1] = ring[i]
              const [lng2, lat2] = ring[i + 1]

              // Skip invalid coordinates
              if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) continue
              if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90) continue
              if (Math.abs(lng1) > 180 || Math.abs(lng2) > 180) continue

              const pos1 = latLngToVector3(lat1, lng1, GLOBE_RADII.borders)
              const pos2 = latLngToVector3(lat2, lng2, GLOBE_RADII.borders)

              vertices.push(pos1.x, pos1.y, pos1.z)
              vertices.push(pos2.x, pos2.y, pos2.z)
            }
          }

          if (feature.geometry.type === 'Polygon') {
            processPolygon(coordinates)
          } else if (feature.geometry.type === 'MultiPolygon') {
            coordinates.forEach((polygon: number[][][]) => {
              processPolygon(polygon)
            })
          }
        }
      })
    }

    console.log('Loaded country borders:', vertices.length / 6, 'line segments')
  } catch (error) {
    console.warn('Error creating country borders:', error)
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  return geometry
}
