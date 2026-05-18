import { LocationService } from './LocationService';
import { ClientDB } from '../config/firebase';

export class HeartbeatService {
  private static timerId: any = null;
  private static deviceId = 'DEV-ALPHA-99'; // Default mock ID for developer testing

  static startBeaming(customDeviceId?: string) {
    if (this.timerId) return;

    if (customDeviceId) {
      this.deviceId = customDeviceId;
    }

    // Ping immediately
    this.beam();

    // Beam keep-alive every 30 seconds
    this.timerId = setInterval(() => {
      this.beam();
    }, 30); // 30 seconds (using a smaller timer during testing/simulation if desired, but 30s is default)
  }

  static async beam() {
    const location = await LocationService.getCurrentLocation();
    await ClientDB.writeHeartbeat(
      this.deviceId,
      location.latitude,
      location.longitude,
      true
    );
  }

  static stopBeaming() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
