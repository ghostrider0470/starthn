/// <reference types="vite/client" />

// Allow importing JSON files with proper typing
declare module '*.json' {
  const value: any
  export default value
}

// Specific declarations for world-atlas TopoJSON files
declare module 'world-atlas/countries-50m.json' {
  import type { Topology } from 'topojson-specification'
  const data: Topology
  export default data
}

declare module 'world-atlas/land-50m.json' {
  import type { Topology } from 'topojson-specification'
  const data: Topology
  export default data
}

declare module 'world-atlas/countries-110m.json' {
  import type { Topology } from 'topojson-specification'
  const data: Topology
  export default data
}

declare module 'world-atlas/land-110m.json' {
  import type { Topology } from 'topojson-specification'
  const data: Topology
  export default data
}

declare module 'world-atlas/countries-10m.json' {
  import type { Topology } from 'topojson-specification'
  const data: Topology
  export default data
}

declare module 'world-atlas/land-10m.json' {
  import type { Topology } from 'topojson-specification'
  const data: Topology
  export default data
}

// Allow importing CSS files with ?url suffix for use in <link> tags
declare module '*.css?url' {
  const url: string
  export default url
}
