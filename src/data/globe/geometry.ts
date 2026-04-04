/**
 * Globe geometry module - Re-export layer
 *
 * This file maintains backward compatibility by re-exporting
 * all geometry functions from the modular geometry subdirectory.
 *
 * For new code, prefer importing directly from '@/data/globe/geometry/*'
 */

export {
  fetchContinentData,
  fetchCountryData,
  createContinentGeometriesByRegion,
  createUnifiedContinentFills,
  createEnhancedWireframeGeometry,
  createCountryBordersGeometry
} from './geometry/index'
