import { GeoCoordinate } from './PowerLossDetector';
import { AllocationResult } from './ResourceAllocator';

export interface NotificationBroadcast {
  publicSms: string;
  dispatchLog: string;
}

export class NotificationEngine {
  static generate(
    coords: GeoCoordinate,
    classification: 'ACCIDENT' | 'FLOOD' | 'POWER_OUTAGE',
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
    allocations: AllocationResult[]
  ): NotificationBroadcast {
    console.log('📢 [NotificationEngine] Generating rule-based stakeholder notifications...');

    const gpsStr = `(${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
    const assetsStr = allocations.map(a => `${a.dispatchCount}x ${a.facilityName}`).join(', ');

    let publicSms = '';
    let dispatchLog = '';

    if (classification === 'ACCIDENT') {
      publicSms = `⚠️ CITIZEN SAFETY ALERT: A traffic accident has occurred at coordinates ${gpsStr}. Emergency responders are active on site. Please avoid this route to prevent traffic gridlock. Drive safely.`;
      dispatchLog = `🚨 DISPATCH DIRECTIVE | PRIORITY: ${severity} | TARGET: ACCIDENT AT GPS ${gpsStr}. Dispatched assets: ${assetsStr}. Primary Objective: Secure the scene, treat casualties, and transfer victims to nearest hospitals. Response Time ETA: ${allocations[0]?.etaMinutes || 5} minutes.`;
    } else if (classification === 'POWER_OUTAGE') {
      publicSms = `⚠️ INFRASTRUCTURE WARNING: A regional power breakdown has been detected in your area at coordinates ${gpsStr}. Technical repair squads have been notified and are responding. We appreciate your patience.`;
      dispatchLog = `🚨 TECH DISPATCH | PRIORITY: ${severity} | TARGET: POWER BLACKOUT AT GPS ${gpsStr}. Dispatched assets: ${assetsStr}. Primary Objective: Locate grid trip point, replace blown fuses, and restore regional power distribution safely.`;
    } else {
      // FLOOD
      publicSms = `⚠️ CIRO URGENT WARNING: A flood event is being managed near coordinates ${gpsStr}. Severity: ${severity}. Please stay indoors, remain calm, and follow instruction guides from emergency workers.`;
      dispatchLog = `🚨 CRITICAL COMMAND | PRIORITY: ${severity} | EVENT: FLOOD AT GPS ${gpsStr}. Dispatched assets: ${assetsStr}. Primary Objective: Coordinate local search, rescue, and stabilization.`;
    }

    console.log('📢 Crafted stakeholder alerts:');
    console.log(`   - Public SMS: "${publicSms}"`);
    console.log(`   - Dispatch Log: "${dispatchLog}"`);

    return { publicSms, dispatchLog };
  }
}
