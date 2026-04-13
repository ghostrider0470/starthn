// Data center marker definition
export interface DataCenterMarker {
  lat: number
  lng: number
  name: string
  type: 'aws' | 'azure' | 'gcp'
  color: string
}

// Pin text bubble content
export interface PinText {
  title: string
  subtitle: string
  stats?: string[]
}

// Provider brand colors
const AWS_COLOR = '#ff9900'
const AZURE_COLOR = '#00bcf2'
const GCP_COLOR = '#34a853'

// Real cloud data center regions (~45 major locations)
// Coordinates are metro-area centers where each region is physically hosted
export const DATA_CENTER_MARKERS: DataCenterMarker[] = [
  // ─── AWS Regions ───────────────────────────────────────────
  { lat: 39.0438, lng: -77.4874, name: 'US East (Virginia)',        type: 'aws',   color: AWS_COLOR },
  { lat: 45.5945, lng: -122.1562, name: 'US West (Oregon)',         type: 'aws',   color: AWS_COLOR },
  { lat: 53.3498, lng: -6.2603,  name: 'Europe (Ireland)',          type: 'aws',   color: AWS_COLOR },
  { lat: 35.6762, lng: 139.6503, name: 'Asia Pacific (Tokyo)',      type: 'aws',   color: AWS_COLOR },
  { lat: 1.3521,  lng: 103.8198, name: 'Asia Pacific (Singapore)',  type: 'aws',   color: AWS_COLOR },
  { lat: -23.5505,lng: -46.6333, name: 'South America (São Paulo)', type: 'aws',   color: AWS_COLOR },
  { lat: -33.8688,lng: 151.2093, name: 'Asia Pacific (Sydney)',     type: 'aws',   color: AWS_COLOR },
  { lat: 50.1109, lng: 8.6821,   name: 'Europe (Frankfurt)',        type: 'aws',   color: AWS_COLOR },
  { lat: 19.0760, lng: 72.8777,  name: 'Asia Pacific (Mumbai)',     type: 'aws',   color: AWS_COLOR },
  { lat: 45.5017, lng: -73.5673, name: 'Canada (Montreal)',         type: 'aws',   color: AWS_COLOR },
  { lat: 26.0667, lng: 50.5577,  name: 'Middle East (Bahrain)',     type: 'aws',   color: AWS_COLOR },
  { lat: 17.3850, lng: 78.4867,  name: 'Asia Pacific (Hyderabad)',  type: 'aws',   color: AWS_COLOR },
  { lat: -6.2088, lng: 106.8456, name: 'Asia Pacific (Jakarta)',    type: 'aws',   color: AWS_COLOR },
  { lat: 40.4168, lng: -3.7038,  name: 'Europe (Spain)',            type: 'aws',   color: AWS_COLOR },
  { lat: 47.3769, lng: 8.5417,   name: 'Europe (Zurich)',           type: 'aws',   color: AWS_COLOR },
  { lat: 32.0853, lng: 34.7818,  name: 'Israel (Tel Aviv)',         type: 'aws',   color: AWS_COLOR },
  { lat: -36.8485,lng: 174.7633, name: 'Asia Pacific (Auckland)',   type: 'aws',   color: AWS_COLOR },

  // ─── Azure Regions ─────────────────────────────────────────
  { lat: 37.3861, lng: -79.4431, name: 'East US (Virginia)',        type: 'azure', color: AZURE_COLOR },
  { lat: 52.3676, lng: 4.9041,   name: 'West Europe (Netherlands)', type: 'azure', color: AZURE_COLOR },
  { lat: 51.5074, lng: -0.1278,  name: 'UK South (London)',         type: 'azure', color: AZURE_COLOR },
  { lat: 37.5665, lng: 126.9780, name: 'Korea Central (Seoul)',     type: 'azure', color: AZURE_COLOR },
  { lat: 25.2048, lng: 55.2708,  name: 'UAE North (Dubai)',         type: 'azure', color: AZURE_COLOR },
  { lat: -26.2041,lng: 28.0473,  name: 'South Africa (Johannesburg)', type: 'azure', color: AZURE_COLOR },
  { lat: 47.6062, lng: -122.3321,name: 'West US (Washington)',      type: 'azure', color: AZURE_COLOR },
  { lat: 43.8563, lng: 18.4131,  name: 'Balkans Hub (Sarajevo)',    type: 'azure', color: AZURE_COLOR },
  { lat: 31.2304, lng: 121.4737, name: 'China East (Shanghai)',     type: 'azure', color: AZURE_COLOR },
  { lat: 48.8566, lng: 2.3522,   name: 'France Central (Paris)',    type: 'azure', color: AZURE_COLOR },
  { lat: 59.9139, lng: 10.7522,  name: 'Norway East (Oslo)',        type: 'azure', color: AZURE_COLOR },
  { lat: 59.3293, lng: 18.0686,  name: 'Sweden Central (Stockholm)',type: 'azure', color: AZURE_COLOR },
  { lat: 19.4326, lng: -99.1332, name: 'Mexico Central',            type: 'azure', color: AZURE_COLOR },
  { lat: 25.2854, lng: 51.5310,  name: 'Qatar Central (Doha)',      type: 'azure', color: AZURE_COLOR },
  { lat: 20.5937, lng: 78.9629,  name: 'Central India (Pune)',      type: 'azure', color: AZURE_COLOR },
  { lat: 35.6762, lng: 139.6503, name: 'Japan East (Tokyo)',        type: 'azure', color: AZURE_COLOR },

  // ─── GCP Regions ───────────────────────────────────────────
  { lat: 33.9425, lng: -118.4081,name: 'us-west2 (Los Angeles)',    type: 'gcp',   color: GCP_COLOR },
  { lat: 43.6532, lng: -79.3832, name: 'northamerica-ne1 (Toronto)',type: 'gcp',   color: GCP_COLOR },
  { lat: 60.1699, lng: 24.9384,  name: 'europe-north1 (Finland)',   type: 'gcp',   color: GCP_COLOR },
  { lat: 22.3193, lng: 114.1694, name: 'asia-east2 (Hong Kong)',    type: 'gcp',   color: GCP_COLOR },
  { lat: 13.7563, lng: 100.5018, name: 'asia-southeast2 (Bangkok)', type: 'gcp',   color: GCP_COLOR },
  { lat: -33.4489,lng: -70.6693, name: 'southamerica-w1 (Santiago)',type: 'gcp',   color: GCP_COLOR },
  { lat: 34.0522, lng: -97.9461, name: 'us-south1 (Dallas)',        type: 'gcp',   color: GCP_COLOR },
  { lat: 50.4501, lng: 30.5234,  name: 'europe-central2 (Warsaw)',  type: 'gcp',   color: GCP_COLOR },
  { lat: 35.4437, lng: 139.6380, name: 'asia-northeast1 (Osaka)',   type: 'gcp',   color: GCP_COLOR },
  { lat: -36.8485,lng: 174.7633, name: 'australia-se1 (Melbourne)', type: 'gcp',   color: GCP_COLOR },
  { lat: 52.5200, lng: 13.4050,  name: 'europe-west10 (Berlin)',    type: 'gcp',   color: GCP_COLOR },
  { lat: 28.6139, lng: 77.2090,  name: 'asia-south2 (Delhi)',       type: 'gcp',   color: GCP_COLOR },
  { lat: 39.9612, lng: -82.9988, name: 'us-east5 (Columbus)',       type: 'gcp',   color: GCP_COLOR },
  { lat: 45.4642, lng: 9.1900,   name: 'europe-west8 (Milan)',      type: 'gcp',   color: GCP_COLOR },
]

// Map data centers to landing page sections
export const DATA_CENTER_TO_SECTION: Record<string, string> = {
  'Balkans Hub (Sarajevo)': 'hero',
  'US East (Virginia)': 'solutions',
  'UK South (London)': 'credibility',
  'Asia Pacific (Singapore)': 'partners',
  'South America (São Paulo)': 'faq',
}

// Section type
type SectionId = 'hero' | 'solutions' | 'credibility' | 'partners' | 'faq'

// Pin text data for each section showing relevant information about the focused region
export const SECTION_PIN_TEXTS: Record<SectionId, PinText> = {
  hero: {
    title: 'Global Cloud Infrastructure',
    subtitle: 'Multi-Cloud Network Across 45+ Regions',
    stats: ['AWS', 'Microsoft Azure', 'Google Cloud'],
  },
  solutions: {
    title: 'Technology Solutions',
    subtitle: 'End-to-End Development',
    stats: ['Enterprise Software', 'AI/ML & BI'],
  },
  credibility: {
    title: 'Global Reach',
    subtitle: 'Serving 3 Continents',
    stats: ['150+ Projects Delivered', '50+ Happy Clients', '99.9% Uptime', '2M+ Lines of Code'],
  },
  partners: {
    title: 'Technology Stack',
    subtitle: 'Industry-Leading Platforms',
    stats: ['Microsoft Azure', 'AWS & GCP', 'React & .NET', 'Docker & Kubernetes', 'AI/ML Tools'],
  },
  faq: {
    title: 'Enterprise Ready',
    subtitle: 'Production-Optimized',
    stats: ['ISO 27001 Certified', 'GDPR Compliant', 'Agile Certified', 'DevSecOps'],
  },
}
