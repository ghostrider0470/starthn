import { extend } from '@react-three/fiber'
import { WireframeGlowMaterial } from './WireframeGlowMaterial'
import { AtmosphereGlowMaterial } from './AtmosphereGlowMaterial'
import { HolographicMaterial } from './HolographicMaterial'

// Extend Three.js with custom shader materials
extend({ WireframeGlowMaterial, AtmosphereGlowMaterial, HolographicMaterial })

// Type declarations for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      wireframeGlowMaterial: any
      atmosphereGlowMaterial: any
      holographicMaterial: any
    }
  }
}

export { WireframeGlowMaterial, AtmosphereGlowMaterial, HolographicMaterial }
