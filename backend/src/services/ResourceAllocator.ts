import { GeoCoordinate, haversineDistance } from './PowerLossDetector';

export interface EmergencyFacility {
  name: string;
  type: 'HOSPITAL' | 'RESCUE_HQ' | 'UTILITY';
  latitude: number;
  longitude: number;
  city: 'KARACHI' | 'LAHORE' | 'ISLAMABAD';
}

export const EMERGENCY_FACILITIES: EmergencyFacility[] = [
  // --- KARACHI FACILITIES ---
  { name: "Jinnah Hospital Karachi", type: "HOSPITAL", latitude: 24.8596, longitude: 67.0104, city: "KARACHI" },
  { name: "Aga Khan Hospital", type: "HOSPITAL", latitude: 24.8918, longitude: 67.0820, city: "KARACHI" },
  { name: "Karachi Trauma Institute", type: "HOSPITAL", latitude: 24.9008, longitude: 67.1450, city: "KARACHI" },
  { name: "Edhi Foundation Karachi", type: "RESCUE_HQ", latitude: 24.8553, longitude: 67.0104, city: "KARACHI" },
  { name: "Rangers HQ Karachi", type: "RESCUE_HQ", latitude: 24.8722, longitude: 67.0300, city: "KARACHI" },

  // --- LAHORE FACILITIES ---
  { name: "Doctors Hospital Johar Town", type: "HOSPITAL", latitude: 31.4806, longitude: 74.2812, city: "LAHORE" },
  { name: "Mayo Hospital Lahore", type: "HOSPITAL", latitude: 31.5722, longitude: 74.3122, city: "LAHORE" },
  { name: "Rescue 1122 Head Office Lahore", type: "RESCUE_HQ", latitude: 31.5002, longitude: 74.3414, city: "LAHORE" },
  { name: "LESCO Central Utility Division", type: "UTILITY", latitude: 31.5497, longitude: 74.3224, city: "LAHORE" },

  // --- ISLAMABAD FACILITIES ---
  { name: "PIMS Hospital Islamabad", type: "HOSPITAL", latitude: 33.7122, longitude: 73.0531, city: "ISLAMABAD" },
  { name: "Shifa International Hospital", type: "HOSPITAL", latitude: 33.6845, longitude: 73.0890, city: "ISLAMABAD" },
  { name: "IESCO Grid Operations Division", type: "UTILITY", latitude: 33.6835, longitude: 73.0184, city: "ISLAMABAD" }
];

export interface AllocationResult {
  facilityName: string;
  distanceKm: number;
  etaMinutes: number;
  dispatchCount: number;
}

export class ResourceAllocator {
  static allocate(
    coords: GeoCoordinate,
    classification: 'ACCIDENT' | 'FLOOD' | 'POWER_OUTAGE',
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  ): AllocationResult[] {
    console.log(`🚒 [ResourceAllocator] Calculating optimal dispatches for ${severity} ${classification.toLowerCase()}...`);

    // Determine target city based on coordinates
    let targetCity: 'KARACHI' | 'LAHORE' | 'ISLAMABAD' = 'LAHORE';
    if (coords.latitude >= 24.0 && coords.latitude <= 25.2) {
      targetCity = 'KARACHI';
    } else if (coords.latitude >= 33.0 && coords.latitude <= 34.0) {
      targetCity = 'ISLAMABAD';
    }

    // Filter facilities in target city
    const localFacilities = EMERGENCY_FACILITIES.filter(f => f.city === targetCity);

    // Compute distance
    const facilitiesWithDist = localFacilities.map(f => {
      const dist = haversineDistance(coords, { latitude: f.latitude, longitude: f.longitude });
      return {
        facility: f,
        distanceKm: dist,
        // Assume average emergency speed of 45 km/h -> 1.33 min per km + base time
        etaMinutes: Math.round(dist * 1.33 + 3)
      };
    });

    // Sort by distance
    facilitiesWithDist.sort((a, b) => a.distanceKm - b.distanceKm);

    // Formulate dispatches depending on type
    const dispatches: AllocationResult[] = [];

    if (classification === 'POWER_OUTAGE') {
      // Dispatch utilities
      const utilities = facilitiesWithDist.filter(f => f.facility.type === 'UTILITY');
      if (utilities.length > 0) {
        dispatches.push({
          facilityName: utilities[0].facility.name,
          distanceKm: parseFloat(utilities[0].distanceKm.toFixed(2)),
          etaMinutes: utilities[0].etaMinutes,
          dispatchCount: severity === 'CRITICAL' ? 3 : 1
        });
      }
    } else if (classification === 'FLOOD') {
      // Dispatch rescue HQs & hospitals
      const rescues = facilitiesWithDist.filter(f => f.facility.type === 'RESCUE_HQ');
      const hospitals = facilitiesWithDist.filter(f => f.facility.type === 'HOSPITAL');

      if (rescues.length > 0) {
        dispatches.push({
          facilityName: rescues[0].facility.name,
          distanceKm: parseFloat(rescues[0].distanceKm.toFixed(2)),
          etaMinutes: rescues[0].etaMinutes,
          dispatchCount: severity === 'CRITICAL' ? 4 : 2
        });
      }

      if (hospitals.length > 0) {
        dispatches.push({
          facilityName: hospitals[0].facility.name,
          distanceKm: parseFloat(hospitals[0].distanceKm.toFixed(2)),
          etaMinutes: hospitals[0].etaMinutes,
          dispatchCount: severity === 'CRITICAL' ? 3 : 1
        });
      }
    } else {
      // ACCIDENT
      // Dispatch hospital and rescue
      const hospitals = facilitiesWithDist.filter(f => f.facility.type === 'HOSPITAL');
      const rescues = facilitiesWithDist.filter(f => f.facility.type === 'RESCUE_HQ' || f.facility.type === 'UTILITY');

      if (hospitals.length > 0) {
        dispatches.push({
          facilityName: hospitals[0].facility.name,
          distanceKm: parseFloat(hospitals[0].distanceKm.toFixed(2)),
          etaMinutes: hospitals[0].etaMinutes,
          dispatchCount: severity === 'CRITICAL' ? 3 : 1
        });
      }

      // If no local rescue, default to first hospital or rescue from list
      if (rescues.length > 0) {
        dispatches.push({
          facilityName: rescues[0].facility.name,
          distanceKm: parseFloat(rescues[0].distanceKm.toFixed(2)),
          etaMinutes: rescues[0].etaMinutes,
          dispatchCount: 1
        });
      } else if (hospitals.length > 1) {
        dispatches.push({
          facilityName: hospitals[1].facility.name,
          distanceKm: parseFloat(hospitals[1].distanceKm.toFixed(2)),
          etaMinutes: hospitals[1].etaMinutes,
          dispatchCount: 1
        });
      }
    }

    console.log(`✅ [ResourceAllocator] Optimal dispatch planned: ${dispatches.length} facilities activated.`);
    return dispatches;
  }
}
