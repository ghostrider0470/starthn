# Globe Visualization

Breathtaking 3D globe visualization with cinematic post-processing and atmospheric effects.

## Structure

```
globe/
├── GlobeVisualization.tsx       # Main entry point (70 lines)
├── shaders/                     # Custom shader materials
│   ├── WireframeGlowMaterial.ts # Metallic wireframe with specular ⭐ UPGRADED
│   ├── AtmosphereGlowMaterial.ts# Enhanced fresnel atmosphere ⭐ UPGRADED
│   ├── HolographicMaterial.ts   # Iridescent holographic effect ⭐ NEW
│   └── index.ts                 # Shader exports
└── components/                  # Scene components
    ├── Scene.tsx                # Main scene setup with lights
    ├── Globe.tsx                # Globe mesh with continents
    ├── SpaceBackground.tsx      # Milky Way gradient & nebula clouds ⭐ NEW
    ├── Starfield.tsx            # Twinkling stars (5,000 stars) ⭐ NEW
    ├── DataCenterMarkers.tsx    # Upgraded megacity markers ⭐ UPGRADED
    ├── DataConnections.tsx      # Animated connection lines
    ├── OrbitingParticles.tsx    # Dynamic 3-layer particle system ⭐ UPGRADED
    ├── PostProcessing.tsx       # Bloom, vignette, chromatic aberration
    ├── EnhancedAtmosphere.tsx   # Multi-layered atmospheric glow ⭐ NEW
    └── AuroraBorealis.tsx       # Aurora effects at poles ⭐ NEW
```

## ✨ Visual Features

### Enhanced Materials ⭐ NEW
Advanced shader materials with futuristic effects:
- **Holographic Surface**: Iridescent color-shifting overlay on globe
  - Angle-dependent colors (orange → pink → purple)
  - Animated scan lines for hologram effect
  - Fresnel edge glow (power: 2.5)
  - Synchronized pulsing with all elements
- **Metallic Wireframe**: Specular highlights on lat/lng grid
  - 0.9 metallic factor
  - High-power specular (32.0)
  - Creates shimmering metal effect
- **Enhanced Atmosphere Fresnel**: Stronger edge glow
  - Progressive fresnel power per layer (2.2 → 2.4 → 2.6 → 2.8)
  - Exponential edge glow boost
  - Synchronized breathing with `sin(time * 2.0)`
- **Universal Pulse Sync**: All materials breathe together (pulsePhase: 0)

### Space Background ⭐ NEW
Breathtaking cosmic environment placing globe in deep space:
- **Milky Way Gradient**: 80-unit skybox with purple-to-dark gradient
- **Nebula Band**: Subtle purple/orange horizontal band simulating galactic plane
- **800 Nebula Particles**: Large soft particles (0.5-2.0 size) drifting slowly
- **5,000 Twinkling Stars**: Two layers (3,000 near, 2,000 distant)
- **Star Variety**: White, warm, cool blue-white, pink, purple tints
- **Size Distribution**: Bright (5%), medium (15%), dim stars (80%)
- **Twinkling Animation**: Stars pulse at different rates for realism
- Creates stunning depth and cosmic atmosphere

### Multi-Layered Atmosphere ⭐ NEW
Four distinct atmospheric layers creating stunning depth:
- **Layer 1**: Deep purple (inner, closest to globe)
- **Layer 2**: Hot pink/magenta
- **Layer 3**: Vibrant orange
- **Layer 4**: Amber/gold (outer, maximum depth)

Each layer pulses independently, creating a living, breathing atmosphere.

### Aurora Borealis ⭐ NEW
Swirling particle ribbons at both poles:
- 400 particles per pole
- Gradient colors (purple, pink, cyan, green)
- Wavy, flowing motion like real auroras
- Counter-rotating north/south for visual interest

### Dynamic Particle System ⭐ UPGRADED
Living, breathing particle cloud with multiple layers:
- **3 distinct layers** at different distances (near: 2.5-3.0, mid: 3.0-4.0, far: 4.0-5.5)
- **300 total particles** (80 near, 120 mid, 100 far)
- **1,500 trail particles** (5 trails per particle) creating shooting star effects
- **Variable speeds** per layer (near: 0.15, mid: 0.1, far: 0.05)
- **Size variation** based on importance (0.3-1.0 factor)
- **Bright flashes** simulating data bursts (5% of particles bursting at any time)
- **Color shifts** based on height (purple at top → orange at bottom)
- **Independent rotation** speeds for each particle
- Creates stunning depth perception with layered movement

### Upgraded Data Centers ⭐ NEW
Glowing megacities visible from space:
- **Large bright cores** (4x bigger) with HDR colors
- **Vertical light beams** shooting upward into space (2.5 units tall)
- **Three expanding ring waves** pulsing outward at different speeds
- **Lens flare effects** with cross pattern (horizontal + vertical)
- **Multiple glow layers** (core, inner glow, outer pulse)
- **Additive blending** for maximum brightness
- Each city pulses and breathes independently

## Post-Processing Effects

The globe uses cinematic post-processing for breathtaking visuals:

### Bloom Effect
- **Intensity**: 2.0 (strong HDR glow)
- **Threshold**: 0.2 (glows start at low brightness)
- Makes all neon elements glow dramatically

### Chromatic Aberration
- **Offset**: 0.001 (subtle color separation)
- Adds cinematic lens distortion at edges

### Vignette
- **Offset**: 0.3 (large clear center area)
- **Darkness**: 0.6 (moderate edge darkening)
- Draws focus to the globe center

## Customization

### Enhanced Materials
Edit `HolographicMaterial.ts`:
```tsx
// Color shift palette
color1: new THREE.Color('#ff6b35')  // First color
color2: new THREE.Color('#ec4899')  // Second color
color3: new THREE.Color('#a855f7')  // Third color

// Fresnel strength
fresnelPower: { value: 3.0 }  // Higher = sharper edge glow

// Scan line speed
sin(vUv.y * 50.0 + time * 2.0)  // Multiply time for faster scan
```

Edit `WireframeGlowMaterial.ts`:
```tsx
// Metallic intensity
metallic: 0.8  // 0.0-1.0 range

// Specular sharpness
pow(max(dot(vNormal, halfVector), 0.0), 32.0)  // Higher = tighter highlights
```

Edit `Globe.tsx` for synchronized pulsing:
```tsx
// Change pulse phase for offset timing
materialRef.current.pulsePhase = 0  // 0 = synchronized, π/2 = quarter offset
```

### Space Background & Starfield
Edit `SpaceBackground.tsx`:
```tsx
// Nebula particle count
const count = 800  // More = denser nebula

// Nebula particle size
sizes[i] = 0.5 + Math.random() * 1.5  // Larger = bigger clouds

// Drift speed
velocities[i * 3] = (Math.random() - 0.5) * 0.002  // Higher = faster
```

Edit `Starfield.tsx`:
```tsx
// Star counts
const count = 3000  // Near stars (increase for more density)
const count = 2000  // Distant stars

// Star brightness
const brightness = 0.6 + Math.random() * 0.4  // 0.0-1.0 range

// Twinkle speed
Math.sin(time * 0.5 + phase)  // Higher multiplier = faster twinkling
```

### Adjusting Atmosphere Layers
Edit `EnhancedAtmosphere.tsx`:
```tsx
// Change colors
glowColor="#a855f7"  // Any hex color

// Change scale (spread)
scale={[1.09, 1.09, 1.09]}  // Larger = more spread

// Change intensity
intensity={1.0}  // 0.0-1.5 range (boosted for stronger glow)

// Fresnel power (edge glow strength)
fresnelPower={2.8}  // Higher = sharper edge glow (2.0-4.0 recommended)

// Synchronized pulsing
pulsePhase={0}  // 0 = synchronized with all elements
```

### Particle System
Edit `OrbitingParticles.tsx`:
```tsx
// Layer configuration
count: 120  // Particles per layer
radiusMin: 3.0  // Inner radius
radiusMax: 4.0  // Outer radius
speed: 0.1  // Rotation speed

// Burst frequency
burstTime > 0.95  // Lower = more bursts (e.g., 0.9 = 10% bursting)

// Trail length
const trailCount = 8  // Default: 5
```

### Aurora Intensity
Edit `AuroraBorealis.tsx`:
```tsx
const particleCount = 400  // More = denser aurora
size={0.04}  // Particle size
opacity={0.6}  // 0.0-1.0 transparency
```

### Data Center Markers
Edit `DataCenterMarkers.tsx`:
```tsx
// Core size
args={[0.04, 16, 16]}  // Sphere radius

// Beam height
args={[0.02, 0.05, 2.5, 12, 1, true]}  // [top radius, bottom radius, height]

// Ring expansion speed
time * 1.5  // Faster = quicker expansion

// Lens flare size
args={[0.3, 0.01]}  // [width, thickness]
```

### Adjusting Glow Intensity
Edit `PostProcessing.tsx`:
```tsx
<Bloom
  intensity={2.0}  // 1.0-3.0 range
  luminanceThreshold={0.2}  // Lower = more glow
/>
```

### Changing Colors
Edit `Globe.tsx` - `CONTINENT_COLORS` object

### Animation Speed
Edit `Scene.tsx` - `autoRotateSpeed` in OrbitControls

## Performance

- Adaptive quality via `performance={{ min: 0.5 }}`
- Mipmapped bloom for better performance
- Total particle count: ~7,600 particles
  - 5,000 stars (two layers)
  - 800 nebula particles
  - 300 orbiting particles + 1,500 trails
- Efficient buffer geometries with dynamic updates
- Additive blending for HDR glow without overdraw
- Layered rendering for optimal depth perception
