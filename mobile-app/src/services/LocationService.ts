import * as Location from 'expo-location';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
}

// Fallback target coordinates (Karachi city center)
export const KARACHI_CENTER: GeoLocation = {
  latitude: 24.8607,
  longitude: 67.0011,
  accuracy: 0,
  altitude: 10,
};

export class LocationService {
  /**
   * Request GPS permissions and fetch current location.
   * If permission is denied or location fetch fails, falls back gracefully to Karachi city center coordinates.
   */
  static async getCurrentLocation(): Promise<GeoLocation> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('⚠️ Location permission denied. Defaulting to Karachi center.');
        return KARACHI_CENTER;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
      };
    } catch (error) {
      console.log('⚠️ Location fetch failed. Falling back to Karachi center coordinates.', error);
      return KARACHI_CENTER;
    }
  }
}
