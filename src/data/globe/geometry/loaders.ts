// @ts-nocheck
/**
 * Data loaders for globe geometry
 * Uses world-atlas TopoJSON data (Natural Earth v4.1.0)
 *
 * world-atlas provides pre-built TopoJSON from Natural Earth at multiple scales.
 * TopoJSON is ~10x smaller than GeoJSON due to topology encoding.
 * https://github.com/topojson/world-atlas
 */

import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'

// Import TopoJSON data from world-atlas
// Using 110m detail to keep the visualization lightweight while preserving global structure.
import worldData from 'world-atlas/countries-110m.json'
import landData from 'world-atlas/land-110m.json'

/**
 * Load continent coastline data from world-atlas
 * Converts TopoJSON land boundaries to GeoJSON MultiLineString
 */
export async function fetchContinentData(): Promise<any> {
  try {
    // Extract land boundaries from TopoJSON
    const topology = landData as unknown as Topology
    const land = topology.objects.land as GeometryCollection

    // Convert TopoJSON to GeoJSON feature with land polygons
    const landFeature = topojson.feature(topology, land)

    // Extract exterior boundaries as LineStrings from the polygons
    const features: any[] = []

    if (landFeature.type === 'FeatureCollection') {
      landFeature.features.forEach((feature: any) => {
        if (feature.geometry) {
          const extractBoundaries = (coords: any, type: string) => {
            if (type === 'Polygon') {
              // Take only the exterior ring (first array)
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: coords[0]
                },
                properties: {}
              })
            } else if (type === 'MultiPolygon') {
              coords.forEach((polygon: any) => {
                features.push({
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: polygon[0]
                  },
                  properties: {}
                })
              })
            }
          }

          extractBoundaries(feature.geometry.coordinates, feature.geometry.type)
        }
      })
    } else if (landFeature.geometry) {
      // Single feature case
      const extractBoundaries = (coords: any, type: string) => {
        if (type === 'Polygon') {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coords[0]
            },
            properties: {}
          })
        } else if (type === 'MultiPolygon') {
          coords.forEach((polygon: any) => {
            features.push({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: polygon[0]
              },
              properties: {}
            })
          })
        }
      }

      extractBoundaries(landFeature.geometry.coordinates, landFeature.geometry.type)
    }

    return {
      type: 'FeatureCollection',
      features
    }
  } catch (error) {
    console.warn('Failed to load continent coastline data from world-atlas:', error)
    return null
  }
}

/**
 * Load country border data from world-atlas
 * Converts TopoJSON country boundaries to GeoJSON
 */
export async function fetchCountryData(): Promise<any> {
  try {
    // Extract country boundaries from TopoJSON
    const topology = worldData as unknown as Topology
    const countries = topology.objects.countries as GeometryCollection

    // Convert TopoJSON to GeoJSON FeatureCollection
    const geojson = topojson.feature(topology, countries)

    return geojson
  } catch (error) {
    console.warn('Failed to load country data from world-atlas:', error)
    return null
  }
}

/**
 * Load land polygons from world-atlas
 * Useful for filling continents with solid colors
 */
export async function fetchLandPolygons(): Promise<any> {
  try {
    // Extract land polygons from TopoJSON
    const topology = landData as unknown as Topology
    const land = topology.objects.land as GeometryCollection

    // Convert TopoJSON to GeoJSON FeatureCollection
    const geojson = topojson.feature(topology, land)

    return geojson
  } catch (error) {
    console.warn('Failed to load land polygons from world-atlas:', error)
    return null
  }
}
