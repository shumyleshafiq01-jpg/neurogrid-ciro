import * as fs from 'fs';
import * as path from 'path';

// Define DB Paths in JSON
export interface DatabaseSchema {
  heartbeats: { [deviceId: string]: { latitude: number; longitude: number; timestamp: number; active: boolean } };
  alerts: { [alertId: string]: { id: string; deviceId: string; latitude: number; longitude: number; timestamp: number; force?: number; status: 'pending' | 'resolved' } };
  mass_signals: { [signalId: string]: { id: string; coordinates: { latitude: number; longitude: number }; affectedDevices: number; timestamp: number } };
  crises: {
    [crisisId: string]: {
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
    };
  };
}

const DB_FILE_PATH = path.resolve(__dirname, '../../../../mock-db.json');

// Helper to initialize local DB file if missing
function initLocalDB() {
  if (!fs.existsSync(DB_FILE_PATH)) {
    const defaultDB: DatabaseSchema = {
      heartbeats: {},
      alerts: {},
      mass_signals: {},
      crises: {}
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
  }
}

export class ResilientDB {
  static get(): DatabaseSchema {
    initLocalDB();
    try {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      // Avoid corruption crashes
      return { heartbeats: {}, alerts: {}, mass_signals: {}, crises: {} };
    }
  }

  static write(data: DatabaseSchema) {
    initLocalDB();
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }

  static reset() {
    const defaultDB: DatabaseSchema = {
      heartbeats: {},
      alerts: {},
      mass_signals: {},
      crises: {}
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
    console.log('🧹 Mock Database cleared and reset!');
  }

  static updatePath<K extends keyof DatabaseSchema>(key: K, subKey: string, value: any) {
    const db = this.get();
    if (!db[key]) {
      db[key] = {} as any;
    }
    (db[key] as any)[subKey] = value;
    this.write(db);
  }

  static deletePath<K extends keyof DatabaseSchema>(key: K, subKey: string) {
    const db = this.get();
    if (db[key] && (db[key] as any)[subKey]) {
      delete (db[key] as any)[subKey];
      this.write(db);
    }
  }
}
