// @ts-nocheck
/**
 * Continent fill using a canvas texture painted onto the globe sphere.
 * Canvas 2D natively handles complex polygon fills — no earcut triangulation needed.
 */

import * as THREE from 'three'
import { CONTINENT_BOUNDS, COUNTRY_TO_CONTINENT } from '../constants'
import { getContinentFromCoordinate } from '../utils'
import { fetchCountryData } from './loaders'

const TEX_W = 2048
const TEX_H = 1024

// Land colors per theme
// Light mode uses brighter azure for strong separation from the ocean.
const LAND_COLOR_DARK = '#1a1a2e'
const LAND_COLOR_LIGHT = '#4f92cf'

/** Convert lng/lat to pixel coords on equirectangular canvas */
function lngLatToPixel(lng: number, lat: number): [number, number] {
  const x = ((lng + 180) / 360) * TEX_W
  const y = ((90 - lat) / 180) * TEX_H
  return [x, y]
}

/** Draw a polygon ring on the canvas */
function drawRing(ctx: CanvasRenderingContext2D, ring: number[][]) {
  if (ring.length < 3) return
  const [x0, y0] = lngLatToPixel(ring[0][0], ring[0][1])
  ctx.moveTo(x0, y0)
  for (let i = 1; i < ring.length; i++) {
    const [x, y] = lngLatToPixel(ring[i][0], ring[i][1])
    ctx.lineTo(x, y)
  }
  ctx.closePath()
}

/**
 * Create a globe texture with colored continent fills.
 * Returns a CanvasTexture ready to apply to a sphere material.
 */
export async function createContinentFillTexture(isDark = true): Promise<THREE.CanvasTexture | null> {
  try {
    const worldData = await fetchCountryData()
    if (!worldData || !worldData.features) return null

    const canvas = document.createElement('canvas')
    canvas.width = TEX_W
    canvas.height = TEX_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Start fully transparent (ocean will be handled by the ocean sphere)
    ctx.clearRect(0, 0, TEX_W, TEX_H)

    // Group features by continent
    const continentFeatures: Record<string, any[]> = {}
    Object.keys(CONTINENT_BOUNDS).forEach(c => { continentFeatures[c] = [] })

    for (const feature of worldData.features) {
      const countryId = String(feature.id || feature.properties?.id || '')
      // Skip Antarctica
      if (countryId === '010') continue
      let continent = COUNTRY_TO_CONTINENT[countryId]
      if (!continent && feature.geometry?.coordinates) {
        const coords = feature.geometry.type === 'MultiPolygon'
          ? feature.geometry.coordinates[0]?.[0]
          : feature.geometry.coordinates[0]
        if (coords?.length > 0) {
          const [lng, lat] = coords[0]
          continent = getContinentFromCoordinate(lat, lng) ?? undefined
        }
      }
      if (continent && continentFeatures[continent]) {
        continentFeatures[continent].push(feature)
      }
    }

    // Draw all land in a single color
    ctx.fillStyle = isDark ? LAND_COLOR_DARK : LAND_COLOR_LIGHT
    for (const [, features] of Object.entries(continentFeatures)) {
      for (const feature of features) {
        if (!feature.geometry?.coordinates) continue

        const drawPolygon = (coords: number[][][]) => {
          ctx.beginPath()
          // Exterior ring
          drawRing(ctx, coords[0])
          // Holes (drawn with opposite winding, canvas handles this via evenodd)
          for (let h = 1; h < coords.length; h++) {
            drawRing(ctx, coords[h])
          }
          ctx.fill('evenodd')
        }

        if (feature.geometry.type === 'Polygon') {
          drawPolygon(feature.geometry.coordinates)
        } else if (feature.geometry.type === 'MultiPolygon') {
          for (const polygon of feature.geometry.coordinates) {
            drawPolygon(polygon)
          }
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter

    return texture
  } catch (error) {
    console.warn('Error creating continent fill texture:', error)
    return null
  }
}

/**
 * Legacy API — now returns empty geometries since we use texture-based fills.
 * Kept for backward compatibility with existing imports.
 */
export async function createUnifiedContinentFills(): Promise<{[key: string]: THREE.BufferGeometry}> {
  const continentGeometries: {[key: string]: THREE.BufferGeometry} = {}
  Object.keys(CONTINENT_BOUNDS).forEach(continent => {
    continentGeometries[continent] = new THREE.BufferGeometry()
  })
  return continentGeometries
}
