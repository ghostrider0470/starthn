import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

export const AtmosphereGlowMaterial = shaderMaterial(
  {
    time: 0,
    glowColor: new THREE.Color('#06b6d4'),
    intensity: 1.0,
  },
  // Vertex shader
  `
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    uniform float time;

    void main() {
      // Compute world-space position and normal for correct fresnel
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);

      vec3 pos = position;
      pos *= 1.0 + sin(time * 0.8) * 0.02;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment shader
  `
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    uniform vec3 glowColor;
    uniform float intensity;
    uniform float time;

    void main() {
      // Fresnel in world space — glow strongest at sphere edges
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, vWorldNormal)), 4.0);

      // Warm tint shift at the edges
      vec3 warmTint = glowColor + vec3(0.1, 0.05, -0.05);
      vec3 finalColor = mix(glowColor, warmTint, fresnel);

      // Subtle wave
      float wave = sin(vWorldPosition.y * 5.0 + time * 2.0) * 0.15 + 0.85;
      float turbulence = sin(vWorldPosition.x * 8.0 + time * 1.5) * 0.05;

      float alpha = fresnel * intensity * (wave + turbulence);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
)
