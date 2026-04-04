/**
 * Coastline geometry creation
 * Generates continent coastline geometries from GeoJSON data
 */

import * as THREE from 'three'
import { CONTINENT_BOUNDS, GLOBE_RADII } from '../constants'
import { latLngToVector3, getContinentFromCoordinate } from '../utils'
import { fetchContinentData } from './loaders'

/**
 * Create separate geometries for each continent's coastline
 */
export async function createContinentGeometriesByRegion(): Promise<{[key: string]: THREE.BufferGeometry}> {
  const continentGeometries: {[key: string]: THREE.BufferGeometry} = {}

  // Initialize geometries for each continent
  Object.keys(CONTINENT_BOUNDS).forEach(continent => {
    continentGeometries[continent] = new THREE.BufferGeometry()
  })

  try {
    const continentData = await fetchContinentData()

    if (continentData && continentData.features) {
      const continentVertices: {[key: string]: number[]} = {}

      // Initialize vertex arrays for each continent
      Object.keys(CONTINENT_BOUNDS).forEach(continent => {
        continentVertices[continent] = []
      })

      continentData.features.forEach((feature: any) => {
        if (feature.geometry && feature.geometry.coordinates) {
          const coordinates = feature.geometry.coordinates

          const processCoastline = (coords: number[][]) => {
            for (let i = 0; i < coords.length - 1; i++) {
              const [lng1, lat1] = coords[i]
              const [lng2, lat2] = coords[i + 1]

              // Skip invalid coordinates
              if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) continue
              if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90) continue
              if (Math.abs(lng1) > 180 || Math.abs(lng2) > 180) continue

              // Determine which continent this coastline segment belongs to
              const continent1 = getContinentFromCoordinate(lat1, lng1)
              const continent2 = getContinentFromCoordinate(lat2, lng2)

              // Use the first valid continent found
              const continent = continent1 || continent2

              if (continent && continentVertices[continent]) {
                const pos1 = latLngToVector3(lat1, lng1, GLOBE_RADII.coastlines)
                const pos2 = latLngToVector3(lat2, lng2, GLOBE_RADII.coastlines)

                continentVertices[continent].push(pos1.x, pos1.y, pos1.z)
                continentVertices[continent].push(pos2.x, pos2.y, pos2.z)
              }
            }
          }

          if (feature.geometry.type === 'LineString') {
            processCoastline(coordinates)
          } else if (feature.geometry.type === 'MultiLineString') {
            coordinates.forEach((line: number[][]) => {
              processCoastline(line)
            })
          }
        }
      })

      // Create geometries for each continent
      Object.keys(CONTINENT_BOUNDS).forEach(continent => {
        if (continentVertices[continent].length > 0) {
          continentGeometries[continent].setAttribute(
            'position',
            new THREE.Float32BufferAttribute(continentVertices[continent], 3)
          )
          console.log(`Loaded ${continent} coastline:`, continentVertices[continent].length / 6, 'line segments')
        }
      })
    }
  } catch (error) {
    console.warn('Error creating continent geometries:', error)
  }

  return continentGeometries
}
