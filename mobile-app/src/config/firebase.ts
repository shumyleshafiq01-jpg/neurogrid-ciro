import { Platform } from 'react-native';

const BACKEND_URL = 'http://localhost:4000/api/db';

export interface Heartbeat {
  latitude: number;
  longitude: number;
  timestamp: number;
  active: boolean;
}

export interface Alert {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  force?: number;
  status: 'pending' | 'resolved';
}

export interface Crisis {
  id: string;
  status: 'pending' | 'resolved';
  decision: string;
  classification: string;
  severity: string;
  confidence: number;
  responders: string[];
  publicSms: string;
  dispatchLog: string;
  timestamp: number;
}

export class ClientDB {
  static async writeHeartbeat(deviceId: string, latitude: number, longitude: number, active: boolean) {
    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'heartbeats',
          subKey: deviceId,
          value: { latitude, longitude, timestamp: Date.now(), active }
        })
      });
      return response.ok;
    } catch (e) {
      // Graceful fallback during offline stress tests
      return false;
    }
  }

  static async writeAlert(alertId: string, deviceId: string, latitude: number, longitude: number, force?: number) {
    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'alerts',
          subKey: alertId,
          value: { id: alertId, deviceId, latitude, longitude, timestamp: Date.now(), force, status: 'pending' }
        })
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  static async getCrises(): Promise<{ [id: string]: Crisis }> {
    try {
      const response = await fetch(BACKEND_URL);
      if (response.ok) {
        const db = await response.json();
        return db.crises || {};
      }
    } catch (e) {
      // Return empty during offline simulation
    }
    return {};
  }
}
