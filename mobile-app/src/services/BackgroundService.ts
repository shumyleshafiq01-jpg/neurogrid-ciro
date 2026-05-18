import { AppState, Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { ClientDB } from '../config/firebase';
import { SensorService } from './SensorService';
import { LocationService } from './LocationService';

const BACKGROUND_LOCATION_TASK = 'CIRO_BACKGROUND_LOCATION_TASK';
const DEVICE_ID = 'DEV-ALPHA-99';

// Configure Notifications default handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Define task globally
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('⚠️ [Background Service] Task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const location = locations[0];
      const { latitude, longitude } = location.coords;
      console.log(`🌍 [Background Service] Ping captured at (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`);
      
      // Perform background heartbeat write
      await ClientDB.writeHeartbeat(DEVICE_ID, latitude, longitude, true);
    }
  }
});

export class BackgroundService {
  private static isServiceRunning = false;
  private static appStateSubscription: any = null;
  private static backgroundCountdownTimer: any = null;
  private static backgroundCountdownSeconds = 10;

  static async isRunning(): Promise<boolean> {
    try {
      const active = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      this.isServiceRunning = active;
      return active;
    } catch {
      return false;
    }
  }

  static async startBackgroundServiceAsync(onSensorBreachForeground: (magnitude: number) => void): Promise<boolean> {
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        console.warn('⚠️ Foreground location access denied.');
        return false;
      }

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        console.warn('⚠️ Background location access denied.');
        return false;
      }

      const { status: notifStatus } = await Notifications.requestPermissionsAsync();
      if (notifStatus !== 'granted') {
        console.warn('⚠️ Notification permission denied.');
        return false;
      }

      // Configure persistent notification channel (Android specific)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('ciro-protection', {
          name: 'CIRO Protection Active',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF2453',
        });
      }

      // Start continuous background updates (Registers Android Foreground Service)
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // 30s heartbeat intervals
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: 'CIRO Protection Active',
          notificationBody: 'CIRO is protecting you in the background.',
          notificationColor: '#FF2453',
        },
        pausesUpdatesAutomatically: false,
      });

      this.isServiceRunning = true;
      console.log('✅ [Background Service] Persistent foreground task initiated successfully!');

      // Listen to gyroscope anomalies (both in foreground and background)
      SensorService.stopListening(); // Clear any existing listener
      SensorService.startListening((magnitude) => {
        this.handleSensorBreach(magnitude, onSensorBreachForeground);
      });

      // Track app state changes to detect backgrounding
      if (this.appStateSubscription) this.appStateSubscription.remove();
      this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        console.log(`📱 App switched to State: ${nextAppState}`);
      });

      return true;
    } catch (e) {
      console.error('❌ Failed to launch background service:', e);
      return false;
    }
  }

  static async stopBackgroundServiceAsync(): Promise<void> {
    try {
      const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (running) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
      SensorService.stopListening();
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }
      this.clearBackgroundCountdown();
      this.isServiceRunning = false;
      console.log('🛑 [Background Service] Stopped protection successfully.');
    } catch (e) {
      console.error('❌ Failed to stop background service:', e);
    }
  }

  private static async handleSensorBreach(magnitude: number, onSensorBreachForeground: (magnitude: number) => void) {
    const currentAppState = AppState.currentState;
    console.log(`⚡ Gyro Breach Magnitude: ${magnitude.toFixed(2)} rad/s | State: ${currentAppState}`);

    if (currentAppState === 'active') {
      // App is open - trigger normal foreground countdown modal
      onSensorBreachForeground(magnitude);
    } else {
      // App is minimized or backgrounded! Trigger urgent push notification
      await this.triggerUrgentBackgroundNotification(magnitude);
    }
  }

  private static async triggerUrgentBackgroundNotification(magnitude: number) {
    this.clearBackgroundCountdown();
    this.backgroundCountdownSeconds = 10;

    // Send urgent system notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ CRITICAL IMPACT DETECTED!',
        body: 'CIRO logged a severe kinetic shock. Tapping this will open the app. Direct SOS dispatching in 10s.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });

    // Start 10s countdown in the background
    this.backgroundCountdownTimer = setInterval(async () => {
      this.backgroundCountdownSeconds -= 1;
      console.log(`⏱️ [Background SOS Timer] Countdown: ${this.backgroundCountdownSeconds}s`);

      if (this.backgroundCountdownSeconds <= 0) {
        this.clearBackgroundCountdown();
        
        // Transmit emergency beacon from the background!
        const coords = await LocationService.getCurrentLocation();
        const alertId = 'alt-bg-' + Math.random().toString(36).substring(2, 6);
        console.log(`🚨 [Background SOS Timer] Countdown finished! Sending crisis alert ${alertId} from background...`);
        
        await ClientDB.writeAlert(alertId, DEVICE_ID, coords.latitude, coords.longitude, magnitude);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 EMERGENCY SOS TRANSMITTED',
            body: 'Your GPS coordinates and sensor dispatches have been broadcast to municipal responder networks.',
            sound: true,
          },
          trigger: null,
        });
      }
    }, 1000);
  }

  private static clearBackgroundCountdown() {
    if (this.backgroundCountdownTimer) {
      clearInterval(this.backgroundCountdownTimer);
      this.backgroundCountdownTimer = null;
    }
  }
}
