import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

export const WireframeGlowMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color('#00ffff'),
    glowIntensity: 1.0,
  },
  // Vertex shader
  `
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    uniform float time;

    void main() {
      vPosition = position;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

      vec3 pos = position;
      // Stronger breathing effect
      pos *= 1.0 + sin(time * 0.5) * 0.03;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform vec3 color;
    uniform float glowIntensity;
    uniform float time;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    void main() {
      // View-dependent glow using radial direction (lines have no normals)
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 radialDir = normalize(vWorldPosition);
      float viewAngle = dot(viewDir, radialDir);
      // Silhouette lines (edge of globe) glow brighter
      float intensity = pow(max(0.0, 0.5 - viewAngle * 0.3), 2.0);

      // Stronger animated pulse (50% variation instead of 30%)
      float pulse = sin(time * 2.0) * 0.5 + 0.5;
      intensity *= glowIntensity * (0.5 + pulse * 0.5);

      // Distance-based fade: lines farther from camera fade slightly
      float distFromCenter = length(vWorldPosition - cameraPosition);
      float distanceFade = smoothstep(12.0, 5.0, distFromCenter);
      intensity *= mix(0.6, 1.0, distanceFade);

      gl_FragColor = vec4(color, intensity);
    }
  `
)
