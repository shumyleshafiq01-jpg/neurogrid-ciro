import { ResilientDB } from '../config/firebaseAdmin';
import { SocialMediaMock } from './SocialMediaMock';
import { ReasoningCore } from './ReasoningCore';
import { ResourceAllocator } from './ResourceAllocator';
import { NotificationEngine } from './NotificationEngine';

export class CiroAgent {
  private static intervalId: NodeJS.Timeout | null = null;
  private static active = false;

  static start() {
    if (this.active) return;
    this.active = true;
    console.log('🚀 ========================================================');
    console.log('🚀 [CIRO Agent] Active and listening for crisis signals...');
    console.log('🚀 ========================================================');

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.log('ℹ️ No GEMINI_API_KEY found. CIRO launching with Intelligent Mock Reasoning Core.');
    }

    // Start background polling every 500ms for sub-second reactive latency
    this.intervalId = setInterval(() => {
      this.poll();
    }, 500);
  }

  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.active = false;
    console.log('🛑 [CIRO Agent] Deactivated all database listeners.');
  }

  static async poll() {
    const db = ResilientDB.get();
    const now = Date.now();

    // 1. Process pending gyro alerts (Layer 1 sensor breaches)
    const pendingAlerts = Object.entries(db.alerts).filter(([_, alert]) => alert.status === 'pending');
    for (const [id, alert] of pendingAlerts) {
      console.log(`\n🚨 [CIRO Agent] Processing high-gyro impact alert: ${id}...`);

      // Gather local context
      const coords = { latitude: alert.latitude, longitude: alert.longitude };
      const weather = SocialMediaMock.getWeather(coords);
      const feed = SocialMediaMock.getFeed(coords);

      // Perform cognitive reasoning
      const result = await ReasoningCore.reason(coords, weather, feed, alert.force || 3.0);

      if (result.isTrueCrisis && result.classification !== 'FALSE_ALARM') {
        const allocations = ResourceAllocator.allocate(coords, result.classification as any, result.severity);
        const broadcast = NotificationEngine.generate(coords, result.classification as any, result.severity, allocations);

        // Commit crisis transaction ledger to DB
        ResilientDB.updatePath('crises', id, {
          id,
          status: 'resolved',
          decision: '✅ TRUE CRISIS',
          classification: result.classification,
          severity: result.severity,
          confidence: result.confidence,
          responders: allocations.map(a => `${a.dispatchCount}x ${a.facilityName} (${a.distanceKm}km)`),
          publicSms: broadcast.publicSms,
          dispatchLog: broadcast.dispatchLog,
          timestamp: now
        });

        // Resolve alert
        alert.status = 'resolved';
        ResilientDB.updatePath('alerts', id, alert);
        console.log(`💾 Successfully logged transaction ledger to /crises/${id}`);
      } else {
        // Resolve as false alarm
        alert.status = 'resolved';
        ResilientDB.updatePath('alerts', id, alert);
        console.log(`🔒 Confirmed False Alarm. Suppressing responder activation for ${id}.`);
      }
    }

    // 2. Process pending mass signals (Layer 2 clustered silences)
    const pendingSignals = Object.entries(db.mass_signals);
    for (const [id, signal] of pendingSignals) {
      // Check if already processed (exists in crises)
      if (db.crises[id]) continue;

      console.log(`\n🔌 [CIRO Agent] Processing Layer 2 mass blackout signal: ${id}...`);

      const coords = signal.coordinates;
      const weather = SocialMediaMock.getWeather(coords);
      const feed = SocialMediaMock.getFeed(coords);

      const result = await ReasoningCore.reason(coords, weather, feed);

      if (result.isTrueCrisis && result.classification !== 'FALSE_ALARM') {
        const allocations = ResourceAllocator.allocate(coords, result.classification as any, result.severity);
        const broadcast = NotificationEngine.generate(coords, result.classification as any, result.severity, allocations);

        ResilientDB.updatePath('crises', id, {
          id,
          status: 'resolved',
          decision: '✅ TRUE CRISIS',
          classification: result.classification,
          severity: result.severity,
          confidence: result.confidence,
          responders: allocations.map(a => `${a.dispatchCount}x ${a.facilityName} (${a.distanceKm}km)`),
          publicSms: broadcast.publicSms,
          dispatchLog: broadcast.dispatchLog,
          timestamp: now
        });

        console.log(`💾 Successfully logged transaction ledger to /crises/${id}`);
      }
    }
  }
}
