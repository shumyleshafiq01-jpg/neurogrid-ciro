import { ResilientDB } from '../config/firebaseAdmin';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

// Haversine formula to compute distance in km
export function haversineDistance(coords1: GeoCoordinate, coords2: GeoCoordinate): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coords2.latitude - coords1.latitude) * Math.PI) / 180;
  const dLon = ((coords2.longitude - coords1.longitude) * Math.PI) / 180;
  const lat1 = (coords1.latitude * Math.PI) / 180;
  const lat2 = (coords2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class PowerLossDetector {
  static scan() {
    console.log('🔍 [PowerLossDetector] Initiating active heartbeat clustering scan...');
    const db = ResilientDB.get();
    const now = Date.now();
    const SILENCE_THRESHOLD_MS = 2.5 * 60 * 1000; // 2.5 minutes
    const CLUSTER_DISTANCE_KM = 1.5; // 1.5 km

    // Find devices that were active but are now silent
    const allDevices = Object.entries(db.heartbeats);
    const offlineDevices = allDevices.filter(([_, dev]) => {
      return dev.active && (now - dev.timestamp >= SILENCE_THRESHOLD_MS);
    });

    console.log(`📊 [PowerLossDetector] Devices recently offline: ${offlineDevices.length} / Total active logged: ${allDevices.length}`);

    if (offlineDevices.length === 0) return null;

    // Cluster offline devices using a basic density/proximity grouping
    const clusters: Array<{
      devices: Array<{ id: string; lat: number; lon: number }>;
      centroid: GeoCoordinate;
    }> = [];

    for (const [id, dev] of offlineDevices) {
      let added = false;
      for (const cluster of clusters) {
        // Check if device is within distance to cluster centroid
        const dist = haversineDistance(cluster.centroid, { latitude: dev.latitude, longitude: dev.longitude });
        if (dist <= CLUSTER_DISTANCE_KM) {
          cluster.devices.push({ id, lat: dev.latitude, lon: dev.longitude });
          // Recalculate centroid
          const latSum = cluster.devices.reduce((sum, d) => sum + d.lat, 0);
          const lonSum = cluster.devices.reduce((sum, d) => sum + d.lon, 0);
          cluster.centroid = {
            latitude: latSum / cluster.devices.length,
            longitude: lonSum / cluster.devices.length
          };
          added = true;
          break;
        }
      }

      if (!added) {
        clusters.push({
          devices: [{ id, lat: dev.latitude, lon: dev.longitude }],
          centroid: { latitude: dev.latitude, longitude: dev.longitude }
        });
      }
    }

    // Filter clusters with >= 3 devices
    const criticalClusters = clusters.filter(c => c.devices.length >= 3);

    for (const cluster of criticalClusters) {
      // Generate a unique signal ID
      const signalId = 'ms-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      
      // Update database status of these devices to inactive (representing power lost)
      for (const dev of cluster.devices) {
        if (db.heartbeats[dev.id]) {
          db.heartbeats[dev.id].active = false;
        }
      }
      ResilientDB.write(db);

      // Create mass outage alert
      ResilientDB.updatePath('mass_signals', signalId, {
        id: signalId,
        coordinates: cluster.centroid,
        affectedDevices: cluster.devices.length,
        timestamp: now
      });

      console.log(`🚨 [PowerLossDetector] CRITICAL BLACKOUT DETECTED! Created Signal ${signalId} affecting ${cluster.devices.length} devices.`);
      return { signalId, centroid: cluster.centroid, count: cluster.devices.length };
    }

    return null;
  }
}
