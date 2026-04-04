import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Holographic material with angle-dependent color shifting
 * - Very subtle iridescent effect (edge-only)
 * - Synchronized pulsing
 * - Minimal opacity to avoid blocking globe
 */
export const HolographicMaterial = shaderMaterial(
  {
    time: 0,
    color1: new THREE.Color('#ff6b35'), // Orange
    color2: new THREE.Color('#ec4899'), // Pink
    color3: new THREE.Color('#a855f7'), // Purple
  },
  // Vertex shader
  `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;
    uniform vec3 color3;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    void main() {
      // Fresnel - ONLY show at edges
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 4.0);

      // Only render if fresnel is strong enough (edge-only)
      if (fresnel < 0.3) discard;

      // Angle-dependent color shifting
      float angle = dot(vNormal, viewDir);
      float colorPhase = (angle + 1.0) * 0.5 + vUv.y * 0.5;

      // Simple color interpolation
      vec3 holographicColor;
      if (colorPhase < 0.5) {
        holographicColor = mix(color1, color2, colorPhase * 2.0);
      } else {
        holographicColor = mix(color2, color3, (colorPhase - 0.5) * 2.0);
      }

      // Synchronized pulse
      float pulse = sin(time * 2.0) * 0.3 + 0.7;

      // Scan lines (subtle)
      float scanline = sin(vUv.y * 40.0 + time * 2.0) * 0.15 + 0.85;

      // Final color
      vec3 finalColor = holographicColor * scanline * pulse;

      // Very low opacity - only visible at edges
      float opacity = fresnel * 0.2;

      gl_FragColor = vec4(finalColor, opacity);
    }
  `
)
