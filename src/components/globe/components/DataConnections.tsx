import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DATA_CENTER_MARKERS, getDataCenterPosition, type DataCenterMarker } from '@/data/worldGeography'
import type { GlobeConfig } from '../GlobeVisualization'

// ─── Helpers ──────────────────────────────────────────────────

function createArcCurve(start: THREE.Vector3, end: THREE.Vector3, arcHeight: number): THREE.CatmullRomCurve3 {
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  mid.normalize().multiplyScalar(2.0 + arcHeight)
  return new THREE.CatmullRomCurve3([start, mid, end])
}

const POINTS_PER_HOP = 32

// City dot color (bright cyan — visible on both dark/light backgrounds)
const C = '#22d3ee'

// ─── World capitals & major cities (~380) ─────────────────────
// At least one capital per country, plus major non-capital cities

const CITY_SOURCES: DataCenterMarker[] = [
  // ─── Europe ────────────────────────────────────────────────
  { lat: 51.5074, lng: -0.1278, name: 'London', type: 'aws', color: C },
  { lat: 48.8566, lng: 2.3522, name: 'Paris', type: 'aws', color: C },
  { lat: 52.5200, lng: 13.4050, name: 'Berlin', type: 'aws', color: C },
  { lat: 40.4168, lng: -3.7038, name: 'Madrid', type: 'aws', color: C },
  { lat: 41.9028, lng: 12.4964, name: 'Rome', type: 'aws', color: C },
  { lat: 38.7223, lng: -9.1393, name: 'Lisbon', type: 'aws', color: C },
  { lat: 52.3676, lng: 4.9041, name: 'Amsterdam', type: 'aws', color: C },
  { lat: 50.8503, lng: 4.3517, name: 'Brussels', type: 'aws', color: C },
  { lat: 46.9480, lng: 7.4474, name: 'Bern', type: 'aws', color: C },
  { lat: 48.2082, lng: 16.3738, name: 'Vienna', type: 'aws', color: C },
  { lat: 52.2297, lng: 21.0122, name: 'Warsaw', type: 'aws', color: C },
  { lat: 50.0755, lng: 14.4378, name: 'Prague', type: 'aws', color: C },
  { lat: 48.1486, lng: 17.1077, name: 'Bratislava', type: 'aws', color: C },
  { lat: 47.4979, lng: 19.0402, name: 'Budapest', type: 'aws', color: C },
  { lat: 44.4268, lng: 26.1025, name: 'Bucharest', type: 'aws', color: C },
  { lat: 42.6977, lng: 23.3219, name: 'Sofia', type: 'aws', color: C },
  { lat: 37.9838, lng: 23.7275, name: 'Athens', type: 'aws', color: C },
  { lat: 59.3293, lng: 18.0686, name: 'Stockholm', type: 'aws', color: C },
  { lat: 59.9139, lng: 10.7522, name: 'Oslo', type: 'aws', color: C },
  { lat: 55.6761, lng: 12.5683, name: 'Copenhagen', type: 'aws', color: C },
  { lat: 60.1699, lng: 24.9384, name: 'Helsinki', type: 'aws', color: C },
  { lat: 64.1466, lng: -21.9426, name: 'Reykjavik', type: 'aws', color: C },
  { lat: 53.3498, lng: -6.2603, name: 'Dublin', type: 'aws', color: C },
  { lat: 54.6872, lng: 25.2797, name: 'Vilnius', type: 'aws', color: C },
  { lat: 56.9496, lng: 24.1052, name: 'Riga', type: 'aws', color: C },
  { lat: 59.4370, lng: 24.7536, name: 'Tallinn', type: 'aws', color: C },
  { lat: 50.4501, lng: 30.5234, name: 'Kyiv', type: 'aws', color: C },
  { lat: 53.9006, lng: 27.5590, name: 'Minsk', type: 'aws', color: C },
  { lat: 55.7558, lng: 37.6173, name: 'Moscow', type: 'aws', color: C },
  { lat: 47.0105, lng: 28.8638, name: 'Chișinău', type: 'aws', color: C },
  { lat: 44.7866, lng: 20.4489, name: 'Belgrade', type: 'aws', color: C },
  { lat: 45.8150, lng: 15.9819, name: 'Zagreb', type: 'aws', color: C },
  { lat: 43.8563, lng: 18.4131, name: 'Sarajevo', type: 'aws', color: C },
  { lat: 42.4304, lng: 19.2594, name: 'Podgorica', type: 'aws', color: C },
  { lat: 41.9973, lng: 21.4280, name: 'Skopje', type: 'aws', color: C },
  { lat: 41.3275, lng: 19.8187, name: 'Tirana', type: 'aws', color: C },
  { lat: 46.0569, lng: 14.5058, name: 'Ljubljana', type: 'aws', color: C },
  { lat: 35.8989, lng: 14.5146, name: 'Valletta', type: 'aws', color: C },
  { lat: 49.6117, lng: 6.1300, name: 'Luxembourg', type: 'aws', color: C },
  { lat: 35.1856, lng: 33.3823, name: 'Nicosia', type: 'aws', color: C },
  { lat: 45.4642, lng: 9.1900, name: 'Milan', type: 'aws', color: C },
  { lat: 41.3874, lng: 2.1686, name: 'Barcelona', type: 'aws', color: C },
  { lat: 47.3769, lng: 8.5417, name: 'Zurich', type: 'aws', color: C },
  { lat: 50.1109, lng: 8.6821, name: 'Frankfurt', type: 'aws', color: C },
  { lat: 53.5511, lng: 9.9937, name: 'Hamburg', type: 'aws', color: C },
  { lat: 48.1351, lng: 11.5820, name: 'Munich', type: 'aws', color: C },
  { lat: 59.9343, lng: 30.3351, name: 'Saint Petersburg', type: 'aws', color: C },

  // ─── Asia ──────────────────────────────────────────────────
  { lat: 35.6762, lng: 139.6503, name: 'Tokyo', type: 'aws', color: C },
  { lat: 34.6937, lng: 135.5023, name: 'Osaka', type: 'aws', color: C },
  { lat: 37.5665, lng: 126.9780, name: 'Seoul', type: 'aws', color: C },
  { lat: 39.9042, lng: 116.4074, name: 'Beijing', type: 'aws', color: C },
  { lat: 31.2304, lng: 121.4737, name: 'Shanghai', type: 'aws', color: C },
  { lat: 22.3193, lng: 114.1694, name: 'Hong Kong', type: 'aws', color: C },
  { lat: 22.5431, lng: 114.0579, name: 'Shenzhen', type: 'aws', color: C },
  { lat: 23.1291, lng: 113.2644, name: 'Guangzhou', type: 'aws', color: C },
  { lat: 30.5728, lng: 104.0668, name: 'Chengdu', type: 'aws', color: C },
  { lat: 25.0320, lng: 121.5654, name: 'Taipei', type: 'aws', color: C },
  { lat: 28.6139, lng: 77.2090, name: 'New Delhi', type: 'aws', color: C },
  { lat: 19.0760, lng: 72.8777, name: 'Mumbai', type: 'aws', color: C },
  { lat: 12.9716, lng: 77.5946, name: 'Bangalore', type: 'aws', color: C },
  { lat: 13.0827, lng: 80.2707, name: 'Chennai', type: 'aws', color: C },
  { lat: 22.5726, lng: 88.3639, name: 'Kolkata', type: 'aws', color: C },
  { lat: 33.6844, lng: 73.0479, name: 'Islamabad', type: 'aws', color: C },
  { lat: 24.8607, lng: 67.0011, name: 'Karachi', type: 'aws', color: C },
  { lat: 23.8103, lng: 90.4125, name: 'Dhaka', type: 'aws', color: C },
  { lat: 6.9271, lng: 79.8612, name: 'Colombo', type: 'aws', color: C },
  { lat: 27.7172, lng: 85.3240, name: 'Kathmandu', type: 'aws', color: C },
  { lat: 27.4728, lng: 89.6393, name: 'Thimphu', type: 'aws', color: C },
  { lat: 13.7563, lng: 100.5018, name: 'Bangkok', type: 'aws', color: C },
  { lat: 21.0278, lng: 105.8342, name: 'Hanoi', type: 'aws', color: C },
  { lat: 10.8231, lng: 106.6297, name: 'Ho Chi Minh City', type: 'aws', color: C },
  { lat: 11.5564, lng: 104.9282, name: 'Phnom Penh', type: 'aws', color: C },
  { lat: 17.9757, lng: 102.6331, name: 'Vientiane', type: 'aws', color: C },
  { lat: 19.7633, lng: 96.0785, name: 'Naypyidaw', type: 'aws', color: C },
  { lat: 14.5995, lng: 120.9842, name: 'Manila', type: 'aws', color: C },
  { lat: -6.2088, lng: 106.8456, name: 'Jakarta', type: 'aws', color: C },
  { lat: 3.1390, lng: 101.6869, name: 'Kuala Lumpur', type: 'aws', color: C },
  { lat: 1.3521, lng: 103.8198, name: 'Singapore', type: 'aws', color: C },
  { lat: 4.9031, lng: 114.9398, name: 'Bandar Seri Begawan', type: 'aws', color: C },
  { lat: -8.5569, lng: 125.5603, name: 'Dili', type: 'aws', color: C },
  { lat: 47.9184, lng: 106.9177, name: 'Ulaanbaatar', type: 'aws', color: C },
  { lat: 51.1694, lng: 71.4491, name: 'Astana', type: 'aws', color: C },
  { lat: 41.2995, lng: 69.2401, name: 'Tashkent', type: 'aws', color: C },
  { lat: 42.8746, lng: 74.5698, name: 'Bishkek', type: 'aws', color: C },
  { lat: 38.5598, lng: 68.7740, name: 'Dushanbe', type: 'aws', color: C },
  { lat: 37.9601, lng: 58.3261, name: 'Ashgabat', type: 'aws', color: C },
  { lat: 34.5553, lng: 69.2075, name: 'Kabul', type: 'aws', color: C },
  { lat: 35.6892, lng: 51.3890, name: 'Tehran', type: 'aws', color: C },
  { lat: 33.3152, lng: 44.3661, name: 'Baghdad', type: 'aws', color: C },
  { lat: 33.5138, lng: 36.2765, name: 'Damascus', type: 'aws', color: C },
  { lat: 33.8938, lng: 35.5018, name: 'Beirut', type: 'aws', color: C },
  { lat: 31.9454, lng: 35.9284, name: 'Amman', type: 'aws', color: C },
  { lat: 31.7683, lng: 35.2137, name: 'Jerusalem', type: 'aws', color: C },
  { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv', type: 'aws', color: C },
  { lat: 24.7136, lng: 46.6753, name: 'Riyadh', type: 'aws', color: C },
  { lat: 23.5880, lng: 58.3829, name: 'Muscat', type: 'aws', color: C },
  { lat: 15.3694, lng: 44.1910, name: 'Sanaa', type: 'aws', color: C },
  { lat: 29.3759, lng: 47.9774, name: 'Kuwait City', type: 'aws', color: C },
  { lat: 25.2854, lng: 51.5310, name: 'Doha', type: 'aws', color: C },
  { lat: 24.4539, lng: 54.3773, name: 'Abu Dhabi', type: 'aws', color: C },
  { lat: 25.2048, lng: 55.2708, name: 'Dubai', type: 'aws', color: C },
  { lat: 26.2285, lng: 50.5860, name: 'Manama', type: 'aws', color: C },
  { lat: 41.0082, lng: 28.9784, name: 'Istanbul', type: 'aws', color: C },
  { lat: 39.9334, lng: 32.8597, name: 'Ankara', type: 'aws', color: C },
  { lat: 41.7151, lng: 44.8271, name: 'Tbilisi', type: 'aws', color: C },
  { lat: 40.1792, lng: 44.4991, name: 'Yerevan', type: 'aws', color: C },
  { lat: 40.4093, lng: 49.8671, name: 'Baku', type: 'aws', color: C },

  // ─── Africa ────────────────────────────────────────────────
  { lat: 30.0444, lng: 31.2357, name: 'Cairo', type: 'aws', color: C },
  { lat: 31.2001, lng: 29.9187, name: 'Alexandria', type: 'aws', color: C },
  { lat: 32.9024, lng: 13.1800, name: 'Tripoli', type: 'aws', color: C },
  { lat: 36.8065, lng: 10.1815, name: 'Tunis', type: 'aws', color: C },
  { lat: 36.7538, lng: 3.0588, name: 'Algiers', type: 'aws', color: C },
  { lat: 34.0209, lng: -6.8416, name: 'Rabat', type: 'aws', color: C },
  { lat: 33.5731, lng: -7.5898, name: 'Casablanca', type: 'aws', color: C },
  { lat: 18.0735, lng: -15.9582, name: 'Nouakchott', type: 'aws', color: C },
  { lat: 14.7167, lng: -17.4677, name: 'Dakar', type: 'aws', color: C },
  { lat: 12.6392, lng: -8.0029, name: 'Bamako', type: 'aws', color: C },
  { lat: 12.3714, lng: -1.5197, name: 'Ouagadougou', type: 'aws', color: C },
  { lat: 13.5127, lng: 2.1128, name: 'Niamey', type: 'aws', color: C },
  { lat: 12.1348, lng: 15.0557, name: "N'Djamena", type: 'aws', color: C },
  { lat: 9.0579, lng: 7.4951, name: 'Abuja', type: 'aws', color: C },
  { lat: 6.5244, lng: 3.3792, name: 'Lagos', type: 'aws', color: C },
  { lat: 5.6037, lng: -0.1870, name: 'Accra', type: 'aws', color: C },
  { lat: 6.1256, lng: 1.2254, name: 'Lomé', type: 'aws', color: C },
  { lat: 6.3703, lng: 2.3912, name: 'Porto-Novo', type: 'aws', color: C },
  { lat: 6.3156, lng: -10.8074, name: 'Monrovia', type: 'aws', color: C },
  { lat: 8.4657, lng: -13.2317, name: 'Freetown', type: 'aws', color: C },
  { lat: 9.6412, lng: -13.5784, name: 'Conakry', type: 'aws', color: C },
  { lat: 11.8037, lng: -15.1804, name: 'Bissau', type: 'aws', color: C },
  { lat: 13.4549, lng: -16.5790, name: 'Banjul', type: 'aws', color: C },
  { lat: 14.9330, lng: -23.5133, name: 'Praia', type: 'aws', color: C },
  { lat: 9.0250, lng: 38.7469, name: 'Addis Ababa', type: 'aws', color: C },
  { lat: 15.3229, lng: 38.9251, name: 'Asmara', type: 'aws', color: C },
  { lat: 11.5721, lng: 43.1456, name: 'Djibouti City', type: 'aws', color: C },
  { lat: 2.0469, lng: 45.3182, name: 'Mogadishu', type: 'aws', color: C },
  { lat: -1.2921, lng: 36.8219, name: 'Nairobi', type: 'aws', color: C },
  { lat: 0.3476, lng: 32.5825, name: 'Kampala', type: 'aws', color: C },
  { lat: -1.9403, lng: 29.8739, name: 'Kigali', type: 'aws', color: C },
  { lat: -3.3614, lng: 29.3599, name: 'Bujumbura', type: 'aws', color: C },
  { lat: -4.4419, lng: 15.2663, name: 'Kinshasa', type: 'aws', color: C },
  { lat: -4.2634, lng: 15.2429, name: 'Brazzaville', type: 'aws', color: C },
  { lat: 0.4162, lng: 9.4673, name: 'Libreville', type: 'aws', color: C },
  { lat: 3.8480, lng: 11.5021, name: 'Yaoundé', type: 'aws', color: C },
  { lat: 3.7504, lng: 8.7371, name: 'Malabo', type: 'aws', color: C },
  { lat: 4.3612, lng: 18.5550, name: 'Bangui', type: 'aws', color: C },
  { lat: -8.8390, lng: 13.2894, name: 'Luanda', type: 'aws', color: C },
  { lat: -15.3875, lng: 28.3228, name: 'Lusaka', type: 'aws', color: C },
  { lat: -17.8292, lng: 31.0522, name: 'Harare', type: 'aws', color: C },
  { lat: -13.9626, lng: 33.7741, name: 'Lilongwe', type: 'aws', color: C },
  { lat: -25.9692, lng: 32.5732, name: 'Maputo', type: 'aws', color: C },
  { lat: -6.7924, lng: 39.2083, name: 'Dar es Salaam', type: 'aws', color: C },
  { lat: -18.8792, lng: 47.5079, name: 'Antananarivo', type: 'aws', color: C },
  { lat: -22.5597, lng: 17.0832, name: 'Windhoek', type: 'aws', color: C },
  { lat: -24.6282, lng: 25.9231, name: 'Gaborone', type: 'aws', color: C },
  { lat: -25.7479, lng: 28.2293, name: 'Pretoria', type: 'aws', color: C },
  { lat: -26.2041, lng: 28.0473, name: 'Johannesburg', type: 'aws', color: C },
  { lat: -33.9249, lng: 18.4241, name: 'Cape Town', type: 'aws', color: C },
  { lat: -29.3167, lng: 27.4833, name: 'Maseru', type: 'aws', color: C },
  { lat: -26.3054, lng: 31.1367, name: 'Mbabane', type: 'aws', color: C },
  { lat: 4.8517, lng: 31.5825, name: 'Juba', type: 'aws', color: C },
  { lat: 15.5007, lng: 32.5599, name: 'Khartoum', type: 'aws', color: C },
  { lat: 5.3600, lng: -4.0083, name: 'Abidjan', type: 'aws', color: C },

  // ─── North & Central America ───────────────────────────────
  { lat: 38.9072, lng: -77.0369, name: 'Washington DC', type: 'aws', color: C },
  { lat: 40.7128, lng: -74.0060, name: 'New York', type: 'aws', color: C },
  { lat: 34.0522, lng: -118.2437, name: 'Los Angeles', type: 'aws', color: C },
  { lat: 41.8781, lng: -87.6298, name: 'Chicago', type: 'aws', color: C },
  { lat: 29.7604, lng: -95.3698, name: 'Houston', type: 'aws', color: C },
  { lat: 37.7749, lng: -122.4194, name: 'San Francisco', type: 'aws', color: C },
  { lat: 25.7617, lng: -80.1918, name: 'Miami', type: 'aws', color: C },
  { lat: 47.6062, lng: -122.3321, name: 'Seattle', type: 'aws', color: C },
  { lat: 45.4215, lng: -75.6972, name: 'Ottawa', type: 'aws', color: C },
  { lat: 43.6532, lng: -79.3832, name: 'Toronto', type: 'aws', color: C },
  { lat: 45.5017, lng: -73.5673, name: 'Montreal', type: 'aws', color: C },
  { lat: 49.2827, lng: -123.1207, name: 'Vancouver', type: 'aws', color: C },
  { lat: 19.4326, lng: -99.1332, name: 'Mexico City', type: 'aws', color: C },
  { lat: 14.6349, lng: -90.5069, name: 'Guatemala City', type: 'aws', color: C },
  { lat: 14.0723, lng: -87.1921, name: 'Tegucigalpa', type: 'aws', color: C },
  { lat: 13.6929, lng: -89.2182, name: 'San Salvador', type: 'aws', color: C },
  { lat: 12.1150, lng: -86.2362, name: 'Managua', type: 'aws', color: C },
  { lat: 9.9281, lng: -84.0907, name: 'San José', type: 'aws', color: C },
  { lat: 8.9824, lng: -79.5199, name: 'Panama City', type: 'aws', color: C },
  { lat: 23.1136, lng: -82.3666, name: 'Havana', type: 'aws', color: C },
  { lat: 18.1096, lng: -77.2975, name: 'Kingston', type: 'aws', color: C },
  { lat: 18.5944, lng: -72.3074, name: 'Port-au-Prince', type: 'aws', color: C },
  { lat: 18.4861, lng: -69.9312, name: 'Santo Domingo', type: 'aws', color: C },
  { lat: 25.0480, lng: -77.3554, name: 'Nassau', type: 'aws', color: C },
  { lat: 10.5000, lng: -61.3167, name: 'Port of Spain', type: 'aws', color: C },
  { lat: 17.2511, lng: -88.7590, name: 'Belmopan', type: 'aws', color: C },

  // ─── South America ─────────────────────────────────────────
  { lat: 4.7110, lng: -74.0721, name: 'Bogotá', type: 'aws', color: C },
  { lat: -12.0464, lng: -77.0428, name: 'Lima', type: 'aws', color: C },
  { lat: -0.1807, lng: -78.4678, name: 'Quito', type: 'aws', color: C },
  { lat: 10.4806, lng: -66.9036, name: 'Caracas', type: 'aws', color: C },
  { lat: 6.8013, lng: -58.1551, name: 'Georgetown', type: 'aws', color: C },
  { lat: 5.8520, lng: -55.2038, name: 'Paramaribo', type: 'aws', color: C },
  { lat: -15.7975, lng: -47.8919, name: 'Brasília', type: 'aws', color: C },
  { lat: -23.5505, lng: -46.6333, name: 'São Paulo', type: 'aws', color: C },
  { lat: -22.9068, lng: -43.1729, name: 'Rio de Janeiro', type: 'aws', color: C },
  { lat: -16.4897, lng: -68.1193, name: 'La Paz', type: 'aws', color: C },
  { lat: -25.2637, lng: -57.5759, name: 'Asunción', type: 'aws', color: C },
  { lat: -34.9011, lng: -56.1645, name: 'Montevideo', type: 'aws', color: C },
  { lat: -34.6037, lng: -58.3816, name: 'Buenos Aires', type: 'aws', color: C },
  { lat: -33.4489, lng: -70.6693, name: 'Santiago', type: 'aws', color: C },

  // ─── Oceania ───────────────────────────────────────────────
  { lat: -35.2809, lng: 149.1300, name: 'Canberra', type: 'aws', color: C },
  { lat: -33.8688, lng: 151.2093, name: 'Sydney', type: 'aws', color: C },
  { lat: -37.8136, lng: 144.9631, name: 'Melbourne', type: 'aws', color: C },
  { lat: -27.4698, lng: 153.0251, name: 'Brisbane', type: 'aws', color: C },
  { lat: -31.9505, lng: 115.8605, name: 'Perth', type: 'aws', color: C },
  { lat: -41.2865, lng: 174.7762, name: 'Wellington', type: 'aws', color: C },
  { lat: -36.8485, lng: 174.7633, name: 'Auckland', type: 'aws', color: C },
  { lat: -6.3147, lng: 147.1803, name: 'Port Moresby', type: 'aws', color: C },
  { lat: -18.1416, lng: 178.4419, name: 'Suva', type: 'aws', color: C },
  { lat: -9.4438, lng: 159.9729, name: 'Honiara', type: 'aws', color: C },
  { lat: -13.8333, lng: -171.7500, name: 'Apia', type: 'aws', color: C },

  // ─── Additional cities — fill landmasses evenly ────────────

  // Africa — interior & secondary (biggest gap)
  { lat: 12.0000, lng: 8.5167, name: 'Kano', type: 'aws', color: C },
  { lat: 7.3776, lng: 3.9470, name: 'Ibadan', type: 'aws', color: C },
  { lat: 6.6885, lng: -1.6244, name: 'Kumasi', type: 'aws', color: C },
  { lat: 9.4035, lng: -0.8424, name: 'Tamale', type: 'aws', color: C },
  { lat: 11.1771, lng: -4.2979, name: 'Bobo-Dioulasso', type: 'aws', color: C },
  { lat: 4.0511, lng: 9.7679, name: 'Douala', type: 'aws', color: C },
  { lat: -11.6876, lng: 27.4833, name: 'Lubumbashi', type: 'aws', color: C },
  { lat: -6.1500, lng: 23.6000, name: 'Mbuji-Mayi', type: 'aws', color: C },
  { lat: 0.5153, lng: 25.1900, name: 'Kisangani', type: 'aws', color: C },
  { lat: -4.7761, lng: 11.8636, name: 'Pointe-Noire', type: 'aws', color: C },
  { lat: -4.0435, lng: 39.6682, name: 'Mombasa', type: 'aws', color: C },
  { lat: -6.1659, lng: 39.2026, name: 'Zanzibar', type: 'aws', color: C },
  { lat: -6.1630, lng: 35.7516, name: 'Dodoma', type: 'aws', color: C },
  { lat: -2.5167, lng: 32.9000, name: 'Mwanza', type: 'aws', color: C },
  { lat: -3.3869, lng: 36.6830, name: 'Arusha', type: 'aws', color: C },
  { lat: 0.5143, lng: 35.2698, name: 'Eldoret', type: 'aws', color: C },
  { lat: 7.9465, lng: 5.0120, name: 'Akure', type: 'aws', color: C },
  { lat: 10.3157, lng: -9.9453, name: 'Kankan', type: 'aws', color: C },
  { lat: 31.6295, lng: -8.0089, name: 'Marrakech', type: 'aws', color: C },
  { lat: 34.0331, lng: -5.0003, name: 'Fez', type: 'aws', color: C },
  { lat: 35.6969, lng: -0.6331, name: 'Oran', type: 'aws', color: C },
  { lat: 36.3650, lng: 6.6147, name: 'Constantine', type: 'aws', color: C },
  { lat: 25.6872, lng: 32.6396, name: 'Luxor', type: 'aws', color: C },
  { lat: 24.0889, lng: 32.8998, name: 'Aswan', type: 'aws', color: C },
  { lat: 13.4531, lng: 27.6000, name: 'El Obeid', type: 'aws', color: C },
  { lat: 11.8659, lng: 34.3869, name: 'Gedaref', type: 'aws', color: C },
  { lat: -29.8587, lng: 31.0218, name: 'Durban', type: 'aws', color: C },
  { lat: -33.0145, lng: 27.9116, name: 'East London', type: 'aws', color: C },
  { lat: -29.1211, lng: 26.2140, name: 'Bloemfontein', type: 'aws', color: C },
  { lat: -23.9045, lng: 29.4688, name: 'Polokwane', type: 'aws', color: C },
  { lat: -15.7861, lng: 35.0058, name: 'Blantyre', type: 'aws', color: C },
  { lat: -20.1609, lng: 28.5802, name: 'Bulawayo', type: 'aws', color: C },
  { lat: -19.8286, lng: 34.8389, name: 'Beira', type: 'aws', color: C },
  { lat: -12.2833, lng: 28.2833, name: 'Ndola', type: 'aws', color: C },
  { lat: 7.6910, lng: 36.8167, name: 'Jimma', type: 'aws', color: C },
  { lat: 9.3100, lng: 42.1200, name: 'Harar', type: 'aws', color: C },

  // South America — interior & secondary
  { lat: 6.2518, lng: -75.5636, name: 'Medellín', type: 'aws', color: C },
  { lat: 3.4516, lng: -76.5320, name: 'Cali', type: 'aws', color: C },
  { lat: 10.9639, lng: -74.7964, name: 'Barranquilla', type: 'aws', color: C },
  { lat: 7.1193, lng: -73.1227, name: 'Bucaramanga', type: 'aws', color: C },
  { lat: -19.5723, lng: -65.7550, name: 'Sucre', type: 'aws', color: C },
  { lat: -17.3895, lng: -66.1568, name: 'Cochabamba', type: 'aws', color: C },
  { lat: -17.7833, lng: -63.1822, name: 'Santa Cruz', type: 'aws', color: C },
  { lat: -13.1631, lng: -72.5450, name: 'Cusco', type: 'aws', color: C },
  { lat: -16.4090, lng: -71.5375, name: 'Arequipa', type: 'aws', color: C },
  { lat: -8.1116, lng: -79.0288, name: 'Trujillo', type: 'aws', color: C },
  { lat: 8.3000, lng: -62.7000, name: 'Ciudad Guayana', type: 'aws', color: C },
  { lat: 10.1800, lng: -67.9800, name: 'Valencia VE', type: 'aws', color: C },
  { lat: 10.6544, lng: -71.6406, name: 'Maracaibo', type: 'aws', color: C },
  { lat: -3.7172, lng: -38.5433, name: 'Fortaleza', type: 'aws', color: C },
  { lat: -8.0476, lng: -34.8770, name: 'Recife', type: 'aws', color: C },
  { lat: -2.5307, lng: -44.2826, name: 'São Luís', type: 'aws', color: C },
  { lat: -1.4558, lng: -48.5024, name: 'Belém', type: 'aws', color: C },
  { lat: -3.1190, lng: -60.0217, name: 'Manaus', type: 'aws', color: C },
  { lat: -19.9167, lng: -43.9345, name: 'Belo Horizonte', type: 'aws', color: C },
  { lat: -16.6799, lng: -49.2550, name: 'Goiânia', type: 'aws', color: C },
  { lat: -12.9714, lng: -38.5124, name: 'Salvador', type: 'aws', color: C },
  { lat: -25.4284, lng: -49.2733, name: 'Curitiba', type: 'aws', color: C },
  { lat: -30.0346, lng: -51.2177, name: 'Porto Alegre', type: 'aws', color: C },
  { lat: -22.3285, lng: -49.0718, name: 'Bauru', type: 'aws', color: C },
  { lat: -2.1894, lng: -79.8891, name: 'Guayaquil', type: 'aws', color: C },
  { lat: -31.4201, lng: -64.1888, name: 'Córdoba', type: 'aws', color: C },
  { lat: -32.9468, lng: -60.6393, name: 'Rosario', type: 'aws', color: C },
  { lat: -26.8083, lng: -65.2176, name: 'Tucumán', type: 'aws', color: C },
  { lat: -32.8895, lng: -68.8458, name: 'Mendoza', type: 'aws', color: C },
  { lat: -36.8201, lng: -73.0444, name: 'Concepción', type: 'aws', color: C },
  { lat: -33.0472, lng: -71.6127, name: 'Valparaíso', type: 'aws', color: C },
  { lat: -25.5163, lng: -54.6158, name: 'Ciudad del Este', type: 'aws', color: C },
  { lat: 4.6000, lng: -61.4000, name: 'Santa Elena', type: 'aws', color: C },

  // North & Central America — fill interior
  { lat: 33.7490, lng: -84.3880, name: 'Atlanta', type: 'aws', color: C },
  { lat: 42.3601, lng: -71.0589, name: 'Boston', type: 'aws', color: C },
  { lat: 39.7392, lng: -104.9903, name: 'Denver', type: 'aws', color: C },
  { lat: 32.7767, lng: -96.7970, name: 'Dallas', type: 'aws', color: C },
  { lat: 33.4484, lng: -112.0740, name: 'Phoenix', type: 'aws', color: C },
  { lat: 36.1627, lng: -86.7816, name: 'Nashville', type: 'aws', color: C },
  { lat: 44.9778, lng: -93.2650, name: 'Minneapolis', type: 'aws', color: C },
  { lat: 42.3314, lng: -83.0458, name: 'Detroit', type: 'aws', color: C },
  { lat: 39.9612, lng: -82.9988, name: 'Columbus OH', type: 'aws', color: C },
  { lat: 38.6270, lng: -90.1994, name: 'St Louis', type: 'aws', color: C },
  { lat: 29.9511, lng: -90.0715, name: 'New Orleans', type: 'aws', color: C },
  { lat: 35.2271, lng: -80.8431, name: 'Charlotte', type: 'aws', color: C },
  { lat: 40.4406, lng: -79.9959, name: 'Pittsburgh', type: 'aws', color: C },
  { lat: 27.9506, lng: -82.4572, name: 'Tampa', type: 'aws', color: C },
  { lat: 29.4241, lng: -98.4936, name: 'San Antonio', type: 'aws', color: C },
  { lat: 36.1699, lng: -115.1398, name: 'Las Vegas', type: 'aws', color: C },
  { lat: 45.5152, lng: -122.6784, name: 'Portland', type: 'aws', color: C },
  { lat: 40.7608, lng: -111.8910, name: 'Salt Lake City', type: 'aws', color: C },
  { lat: 32.2226, lng: -110.9747, name: 'Tucson', type: 'aws', color: C },
  { lat: 64.2008, lng: -149.4937, name: 'Fairbanks', type: 'aws', color: C },
  { lat: 61.2181, lng: -149.9003, name: 'Anchorage', type: 'aws', color: C },
  { lat: 21.3069, lng: -157.8583, name: 'Honolulu', type: 'aws', color: C },
  { lat: 51.0447, lng: -114.0719, name: 'Calgary', type: 'aws', color: C },
  { lat: 53.5461, lng: -113.4938, name: 'Edmonton', type: 'aws', color: C },
  { lat: 49.8951, lng: -97.1384, name: 'Winnipeg', type: 'aws', color: C },
  { lat: 44.6488, lng: -63.5752, name: 'Halifax', type: 'aws', color: C },
  { lat: 46.8139, lng: -71.2080, name: 'Quebec City', type: 'aws', color: C },
  { lat: 52.2690, lng: -113.8116, name: 'Red Deer', type: 'aws', color: C },
  { lat: 20.6597, lng: -103.3496, name: 'Guadalajara', type: 'aws', color: C },
  { lat: 25.6866, lng: -100.3161, name: 'Monterrey', type: 'aws', color: C },
  { lat: 19.0414, lng: -98.2063, name: 'Puebla', type: 'aws', color: C },
  { lat: 20.9674, lng: -89.5926, name: 'Mérida', type: 'aws', color: C },
  { lat: 32.5149, lng: -117.0382, name: 'Tijuana', type: 'aws', color: C },
  { lat: 21.1619, lng: -86.8515, name: 'Cancún', type: 'aws', color: C },
  { lat: 16.8634, lng: -99.8901, name: 'Acapulco', type: 'aws', color: C },

  // Asia — fill China interior, India, Russia, SE Asia
  { lat: 30.5928, lng: 114.3055, name: 'Wuhan', type: 'aws', color: C },
  { lat: 32.0603, lng: 118.7969, name: 'Nanjing', type: 'aws', color: C },
  { lat: 30.2741, lng: 120.1551, name: 'Hangzhou', type: 'aws', color: C },
  { lat: 25.0389, lng: 102.7183, name: 'Kunming', type: 'aws', color: C },
  { lat: 43.8256, lng: 87.6168, name: 'Urumqi', type: 'aws', color: C },
  { lat: 36.0611, lng: 103.8343, name: 'Lanzhou', type: 'aws', color: C },
  { lat: 29.5630, lng: 106.5516, name: 'Chongqing', type: 'aws', color: C },
  { lat: 34.2658, lng: 108.9541, name: 'Xian', type: 'aws', color: C },
  { lat: 45.7500, lng: 126.6500, name: 'Harbin', type: 'aws', color: C },
  { lat: 41.8057, lng: 123.4315, name: 'Shenyang', type: 'aws', color: C },
  { lat: 38.9140, lng: 121.6147, name: 'Dalian', type: 'aws', color: C },
  { lat: 36.6683, lng: 116.9972, name: 'Jinan', type: 'aws', color: C },
  { lat: 28.2280, lng: 112.9388, name: 'Changsha', type: 'aws', color: C },
  { lat: 26.0745, lng: 119.2965, name: 'Fuzhou', type: 'aws', color: C },
  { lat: 17.3850, lng: 78.4867, name: 'Hyderabad', type: 'aws', color: C },
  { lat: 26.9124, lng: 75.7873, name: 'Jaipur', type: 'aws', color: C },
  { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad', type: 'aws', color: C },
  { lat: 18.5204, lng: 73.8567, name: 'Pune', type: 'aws', color: C },
  { lat: 26.8467, lng: 80.9462, name: 'Lucknow', type: 'aws', color: C },
  { lat: 23.2599, lng: 77.4126, name: 'Bhopal', type: 'aws', color: C },
  { lat: 25.5941, lng: 85.1376, name: 'Patna', type: 'aws', color: C },
  { lat: 21.1702, lng: 72.8311, name: 'Surat', type: 'aws', color: C },
  { lat: 11.0168, lng: 76.9558, name: 'Coimbatore', type: 'aws', color: C },
  { lat: 17.6868, lng: 83.2185, name: 'Visakhapatnam', type: 'aws', color: C },
  { lat: 31.5204, lng: 74.3587, name: 'Lahore', type: 'aws', color: C },
  { lat: 31.4504, lng: 73.1350, name: 'Faisalabad', type: 'aws', color: C },
  { lat: 16.8661, lng: 96.1951, name: 'Yangon', type: 'aws', color: C },
  { lat: 18.7883, lng: 98.9853, name: 'Chiang Mai', type: 'aws', color: C },
  { lat: -7.7956, lng: 110.3695, name: 'Yogyakarta', type: 'aws', color: C },
  { lat: -7.2575, lng: 112.7521, name: 'Surabaya', type: 'aws', color: C },
  { lat: -8.6705, lng: 115.2126, name: 'Denpasar', type: 'aws', color: C },
  { lat: 10.3157, lng: 123.8854, name: 'Cebu', type: 'aws', color: C },
  { lat: 16.0544, lng: 108.2022, name: 'Da Nang', type: 'aws', color: C },
  { lat: 43.0618, lng: 141.3545, name: 'Sapporo', type: 'aws', color: C },
  { lat: 35.1815, lng: 136.9066, name: 'Nagoya', type: 'aws', color: C },
  { lat: 35.1796, lng: 129.0756, name: 'Busan', type: 'aws', color: C },
  { lat: 21.4225, lng: 39.8262, name: 'Jeddah', type: 'aws', color: C },
  { lat: 32.6546, lng: 51.6680, name: 'Isfahan', type: 'aws', color: C },
  { lat: 29.5918, lng: 52.5837, name: 'Shiraz', type: 'aws', color: C },
  { lat: 36.3219, lng: 43.1253, name: 'Mosul', type: 'aws', color: C },
  { lat: 43.2551, lng: 76.9126, name: 'Almaty', type: 'aws', color: C },
  { lat: 39.6542, lng: 66.9597, name: 'Samarkand', type: 'aws', color: C },
  // Russia — spread across landmass
  { lat: 56.8389, lng: 60.6057, name: 'Yekaterinburg', type: 'aws', color: C },
  { lat: 55.0084, lng: 82.9357, name: 'Novosibirsk', type: 'aws', color: C },
  { lat: 56.0153, lng: 92.8932, name: 'Krasnoyarsk', type: 'aws', color: C },
  { lat: 52.0317, lng: 113.5009, name: 'Chita', type: 'aws', color: C },
  { lat: 62.0280, lng: 129.7320, name: 'Yakutsk', type: 'aws', color: C },
  { lat: 48.4808, lng: 135.0823, name: 'Khabarovsk', type: 'aws', color: C },
  { lat: 43.1155, lng: 131.8855, name: 'Vladivostok', type: 'aws', color: C },
  { lat: 54.7388, lng: 55.9721, name: 'Ufa', type: 'aws', color: C },
  { lat: 51.7666, lng: 55.1004, name: 'Orenburg', type: 'aws', color: C },
  { lat: 53.1959, lng: 50.1002, name: 'Samara', type: 'aws', color: C },

  // Europe — just a few gap-fillers
  { lat: 55.9533, lng: -3.1883, name: 'Edinburgh', type: 'aws', color: C },
  { lat: 53.4808, lng: -2.2426, name: 'Manchester', type: 'aws', color: C },
  { lat: 43.2965, lng: 5.3698, name: 'Marseille', type: 'aws', color: C },
  { lat: 45.7640, lng: 4.8357, name: 'Lyon', type: 'aws', color: C },
  { lat: 40.8518, lng: 14.2681, name: 'Naples', type: 'aws', color: C },
  { lat: 39.4699, lng: -0.3763, name: 'Valencia', type: 'aws', color: C },

  // Oceania
  { lat: -34.9285, lng: 138.6007, name: 'Adelaide', type: 'aws', color: C },
  { lat: -12.4634, lng: 130.8456, name: 'Darwin', type: 'aws', color: C },
  { lat: -16.9186, lng: 145.7781, name: 'Cairns', type: 'aws', color: C },
  { lat: -19.2590, lng: 146.8169, name: 'Townsville', type: 'aws', color: C },
  { lat: -23.7000, lng: 133.8800, name: 'Alice Springs', type: 'aws', color: C },
  { lat: -43.5321, lng: 172.6362, name: 'Christchurch', type: 'aws', color: C },
  { lat: -45.8788, lng: 170.5028, name: 'Dunedin', type: 'aws', color: C },
]

function findNearestDCIdx(marker: DataCenterMarker): number {
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < DATA_CENTER_MARKERS.length; i++) {
    const dlat = DATA_CENTER_MARKERS[i].lat - marker.lat
    const dlng = DATA_CENTER_MARKERS[i].lng - marker.lng
    const d = dlat * dlat + dlng * dlng
    if (d < bestDist) { bestDist = d; bestIdx = i }
  }
  return bestIdx
}

function findCityNearDC(dcIdx: number, excludeCityIdx: number): number {
  const dc = DATA_CENTER_MARKERS[dcIdx]
  const distances: { idx: number; dist: number }[] = []
  for (let i = 0; i < CITY_SOURCES.length; i++) {
    if (i === excludeCityIdx) continue
    const dlat = CITY_SOURCES[i].lat - dc.lat
    const dlng = CITY_SOURCES[i].lng - dc.lng
    distances.push({ idx: i, dist: dlat * dlat + dlng * dlng })
  }
  distances.sort((a, b) => a.dist - b.dist)
  // Pick from top 5 nearest for variety
  const pick = Math.min(Math.floor(Math.random() * 5), distances.length - 1)
  return distances[pick].idx
}

// ─── Shared glow state (module-level, no React re-renders) ────
// Maps city index → glow intensity 0–1
const cityGlowMap = new Map<number, number>()

// ─── City dots with activation glow ──────────────────────────

function CityDots() {
  const dotsRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const basePositions = useRef<THREE.Vector3[]>([])
  const count = CITY_SOURCES.length
  const baseColor = useMemo(() => new THREE.Color('#22d3ee'), [])
  const activeColor = useMemo(() => new THREE.Color(4, 6, 6), []) // HDR bright cyan-white — triggers bloom
  const activeCities = useRef(new Set<number>())

  // Set initial positions
  useEffect(() => {
    if (!dotsRef.current) return
    const positions: THREE.Vector3[] = []
    for (let i = 0; i < count; i++) {
      const pos = getDataCenterPosition(CITY_SOURCES[i], 2.016)
      positions.push(pos.clone())
      dummy.position.set(pos.x, pos.y, pos.z)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      dotsRef.current.setMatrixAt(i, dummy.matrix)
      dotsRef.current.setColorAt(i, baseColor)
    }
    basePositions.current = positions
    dotsRef.current.instanceMatrix.needsUpdate = true
    if (dotsRef.current.instanceColor) dotsRef.current.instanceColor.needsUpdate = true
  }, [count, dummy, baseColor])

  // Per-frame: brighten active cities by lerping color toward white
  const tmpColor = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    if (!dotsRef.current || basePositions.current.length === 0) return

    let colorChanged = false

    // Brighten active cities (HDR color triggers bloom)
    for (const [i, intensity] of cityGlowMap) {
      tmpColor.lerpColors(baseColor, activeColor, intensity)
      dotsRef.current.setColorAt(i, tmpColor)
      activeCities.current.add(i)
      colorChanged = true
    }

    // Reset cities that are no longer active back to base
    for (const i of activeCities.current) {
      if (!cityGlowMap.has(i)) {
        dotsRef.current.setColorAt(i, baseColor)
        activeCities.current.delete(i)
        colorChanged = true
      }
    }

    if (colorChanged && dotsRef.current.instanceColor) {
      dotsRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={dotsRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.013, 6, 6]} />
      <meshBasicMaterial color="#22d3ee" toneMapped={false} />
    </instancedMesh>
  )
}

// ─── Multi-hop route data ────────────────────────────────────

interface RouteConfig {
  nodes: DataCenterMarker[]
  points: THREE.Vector3[]
  sourceCityIdx: number
  destCityIdx: number
  birthTime: number
  glowDelay: number
  speed: number
  routeColor: THREE.Color
  id: number
}

let routeIdCounter = 0

function createMultiHopPath(nodes: DataCenterMarker[]): THREE.Vector3[] {
  const allPoints: THREE.Vector3[] = []
  for (let i = 0; i < nodes.length - 1; i++) {
    const start = getDataCenterPosition(nodes[i], 2.02)
    const end = getDataCenterPosition(nodes[i + 1], 2.02)
    const dist = start.distanceTo(end)
    const arcHeight = Math.min(0.5, Math.max(0.08, dist * 0.12))
    const curve = createArcCurve(start, end, arcHeight)
    const segPoints = curve.getPoints(POINTS_PER_HOP)
    const startIdx = i === 0 ? 0 : 1
    for (let j = startIdx; j < segPoints.length; j++) {
      allPoints.push(segPoints[j])
    }
  }
  return allPoints
}

function generateRoute(birthTime: number): RouteConfig {
  const sourceCityIdx = Math.floor(Math.random() * CITY_SOURCES.length)
  const sourceCity = CITY_SOURCES[sourceCityIdx]
  const firstDCIdx = findNearestDCIdx(sourceCity)

  // Random walk through 1–3 DCs
  const dcIndices: number[] = [firstDCIdx]
  const hopCount = 1 + Math.floor(Math.random() * 2)
  for (let h = 0; h < hopCount; h++) {
    let nextIdx: number
    let attempts = 0
    do {
      nextIdx = Math.floor(Math.random() * DATA_CENTER_MARKERS.length)
      attempts++
    } while (dcIndices.includes(nextIdx) && attempts < 20)
    dcIndices.push(nextIdx)
  }

  const lastDCIdx = dcIndices[dcIndices.length - 1]
  const destCityIdx = findCityNearDC(lastDCIdx, sourceCityIdx)

  const nodes = [
    sourceCity,
    ...dcIndices.map(i => DATA_CENTER_MARKERS[i]),
    CITY_SOURCES[destCityIdx],
  ]
  const points = createMultiHopPath(nodes)
  const routeColor = new THREE.Color(DATA_CENTER_MARKERS[firstDCIdx].color)

  return {
    nodes,
    points,
    sourceCityIdx,
    destCityIdx,
    birthTime,
    glowDelay: 0.3 + Math.random() * 0.4,
    speed: 0.12 + Math.random() * 0.1,
    routeColor,
    id: routeIdCounter++,
  }
}

// ─── Route renderer ──────────────────────────────────────────

function RouteConnection({ route }: { route: RouteConfig }) {
  const lineRef = useRef<any>(null)
  const headRef = useRef<THREE.Mesh>(null)

  const positionArray = useMemo(
    () => new Float32Array(route.points.flatMap(p => [p.x, p.y, p.z])),
    [route.points]
  )
  const colorArray = useMemo(
    () => new Float32Array(route.points.length * 3),
    [route.points.length]
  )

  useEffect(() => {
    return () => {
      cityGlowMap.delete(route.sourceCityIdx)
      cityGlowMap.delete(route.destCityIdx)
    }
  }, [route.sourceCityIdx, route.destCityIdx])

  const colorFrozen = useRef(false)

  useFrame(() => {
    const now = performance.now() / 1000
    const age = now - route.birthTime
    const { glowDelay, speed, sourceCityIdx, destCityIdx, routeColor } = route
    const travelDuration = 1 / speed
    const arrivalHold = 0.5
    const fadeOutDur = 0.5
    const totalLifetime = glowDelay + travelDuration + arrivalHold + fadeOutDur

    // Phase 1: Source city glow-up — line is invisible, skip color writes
    if (age < glowDelay) {
      const phase = age / glowDelay
      cityGlowMap.set(sourceCityIdx, Math.sin(phase * Math.PI * 0.5))
      if (lineRef.current?.material) lineRef.current.material.opacity = 0
      if (headRef.current) (headRef.current.material as any).opacity = 0
      return
    }

    // Phase 2: Pulse travels
    const travelAge = age - glowDelay
    const progress = Math.min(1, travelAge / travelDuration)

    if (travelAge < 1.0) {
      cityGlowMap.set(sourceCityIdx, Math.max(0, 1 - travelAge))
    } else {
      cityGlowMap.delete(sourceCityIdx)
    }

    if (progress > 0.85) {
      const arrivalPhase = (progress - 0.85) / 0.15
      cityGlowMap.set(destCityIdx, Math.sin(arrivalPhase * Math.PI * 0.5))
    }

    // Phase 3: Arrival hold
    if (travelAge > travelDuration && travelAge < travelDuration + arrivalHold) {
      const holdAge = travelAge - travelDuration
      const holdFade = holdAge < 0.5 ? 1 : Math.max(0, 1 - (holdAge - 0.5) / (arrivalHold - 0.5))
      cityGlowMap.set(destCityIdx, holdFade)
    } else if (travelAge >= travelDuration + arrivalHold) {
      cityGlowMap.delete(destCityIdx)
    }

    // Global fade
    const fadeIn = Math.min(1, travelAge / 0.6)
    const fadeOut = age > totalLifetime - fadeOutDur
      ? Math.max(0, (totalLifetime - age) / fadeOutDur)
      : 1
    const fadeFactor = fadeIn * fadeOut

    // Skip color array writes once travel is complete (frozen gradient)
    if (!colorFrozen.current) {
      // Update line colors with pulse — HDR values for bloom on the trail head
      const trailLen = 0.2
      const r = routeColor.r, g = routeColor.g, b = routeColor.b

      for (let i = 0; i < route.points.length; i++) {
        const t = i / (route.points.length - 1)
        const dist = progress - t
        const glow = (dist > 0 && dist < trailLen)
          ? Math.pow(1 - dist / trailLen, 2.0)
          : 0
        const baseDim = 0.25
        const brightness = (baseDim + glow * 2.5) * fadeFactor

        colorArray[i * 3] = r * brightness
        colorArray[i * 3 + 1] = g * brightness
        colorArray[i * 3 + 2] = b * brightness
      }

      if (lineRef.current) {
        const geom = lineRef.current.geometry
        const colorAttr = geom.getAttribute('color')
        if (colorAttr) {
          colorAttr.array.set(colorArray)
          colorAttr.needsUpdate = true
        }
      }

      // Freeze colors once travel is complete and fade is stable
      if (progress >= 1 && travelAge > travelDuration + arrivalHold) {
        colorFrozen.current = true
      }
    }

    if (lineRef.current?.material) {
      lineRef.current.material.opacity = 0.8 * fadeFactor
    }

    if (headRef.current) {
      const idx = Math.min(
        Math.floor(progress * (route.points.length - 1)),
        route.points.length - 1
      )
      headRef.current.position.copy(route.points[idx])
      const mat = headRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = progress < 1 ? 0.7 * fadeFactor : 0
    }
  })

  return (
    <group>
      <line ref={lineRef}>
        <bufferGeometry>
          {/* @ts-expect-error r3f bufferAttribute args */}
          <bufferAttribute attach="attributes-position" count={route.points.length} array={positionArray} itemSize={3} />
          {/* @ts-expect-error r3f bufferAttribute args */}
          <bufferAttribute attach="attributes-color" count={route.points.length} array={colorArray} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.8}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </line>

      <mesh ref={headRef}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshBasicMaterial
          color={`#${route.routeColor.getHexString()}`}
          transparent
          opacity={0.7}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// ─── Main component ──────────────────────────────────────────

interface DataConnectionsProps {
  config: GlobeConfig
}

export function DataConnections({ config }: DataConnectionsProps) {
  const maxRoutes = config.connectionCount || 50
  const [routes, setRoutes] = useState<RouteConfig[]>([])
  const routesRef = useRef<RouteConfig[]>([])

  useEffect(() => {
    const now = performance.now() / 1000
    const initial: RouteConfig[] = []
    for (let i = 0; i < maxRoutes; i++) {
      const route = generateRoute(now)
      const totalLife = route.glowDelay + (1 / route.speed) + 0.5 + 0.5
      route.birthTime = now - Math.random() * totalLife * 0.8
      initial.push(route)
    }
    routesRef.current = initial
    setRoutes(initial)
  }, [maxRoutes])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now() / 1000
      const current = routesRef.current
      let changed = false

      for (let i = 0; i < current.length; i++) {
        const r = current[i]
        const totalLife = r.glowDelay + (1 / r.speed) + 0.5 + 0.5
        if (now - r.birthTime >= totalLife) {
          current[i] = generateRoute(now)
          changed = true
        }
      }

      if (changed) {
        routesRef.current = [...current]
        setRoutes([...current])
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [maxRoutes])

  return (
    <group>
      <CityDots />
      {routes.map(route => (
        <RouteConnection key={route.id} route={route} />
      ))}
    </group>
  )
}
