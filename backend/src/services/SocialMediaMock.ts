import { GeoCoordinate } from './PowerLossDetector';

export interface WeatherData {
  temp: number;
  humidity: number;
  description: string;
  rainVolume?: number; // in mm
}

export interface SocialMediaPost {
  username: string;
  content: string;
  hashtags: string[];
  timestamp: number;
}

export class SocialMediaMock {
  static getFeed(coords: GeoCoordinate): SocialMediaPost[] {
    // If coordinates are in Karachi (around lat 24.8-25.0, lon 67.0-67.2)
    if (coords.latitude >= 24.0 && coords.latitude <= 25.2 && coords.longitude >= 66.8 && coords.longitude <= 67.2) {
      return [
        {
          username: "@karachi_traffic",
          content: "Avoid Gulistan-e-Johar Block 16. Water levels are rising rapidly! Major gridlock.",
          hashtags: ["Karachi", "Monsoon", "Flood"],
          timestamp: Date.now() - 50000
        },
        {
          username: "@citizen_shumyle",
          content: "Drains are completely choked here in Johar. The street is a literal river right now, power went out 10 minutes ago!",
          hashtags: ["Karachi", "PowerOutage", "Rain"],
          timestamp: Date.now() - 120000
        }
      ];
    }

    // Islamabad (around G-10 area, lat 33.68, lon 73.01)
    if (coords.latitude >= 33.5 && coords.latitude <= 33.8 && coords.longitude >= 72.8 && coords.longitude <= 73.2) {
      return [
        {
          username: "@isb_observer",
          content: "Sector G-10 is pitch dark. No cellular signals either. Anyone else experiencing a total blackout?",
          hashtags: ["Islamabad", "Blackout", "IESCO"],
          timestamp: Date.now() - 80000
        }
      ];
    }

    // Lahore (Johar Town, lat 31.48, lon 74.28)
    if (coords.latitude >= 31.3 && coords.latitude <= 31.6 && coords.longitude >= 74.1 && coords.longitude <= 74.4) {
      return [
        {
          username: "@lahori_pulse",
          content: "Heard a massive bang near Johar Town grid station. Sparks flew everywhere!",
          hashtags: ["Lahore", "Outage", "GridStation"],
          timestamp: Date.now() - 90000
        }
      ];
    }

    return [
      {
        username: "@citizen_safe",
        content: "Routine weather here, everything looks normal.",
        hashtags: ["Routine", "Weather"],
        timestamp: Date.now() - 300000
      }
    ];
  }

  static getWeather(coords: GeoCoordinate): WeatherData {
    // Karachi (Monsoon/Heavy Rain)
    if (coords.latitude >= 24.0 && coords.latitude <= 25.2 && coords.longitude >= 66.8 && coords.longitude <= 67.2) {
      return {
        temp: 29,
        humidity: 95,
        description: "Heavy Monsoon Downpours",
        rainVolume: 45 // 45mm heavy rain
      };
    }

    // Islamabad
    if (coords.latitude >= 33.5 && coords.latitude <= 33.8 && coords.longitude >= 72.8 && coords.longitude <= 73.2) {
      return {
        temp: 22,
        humidity: 80,
        description: "Thunderstorms & Lightning",
        rainVolume: 15
      };
    }

    // Default (Clear weather for Lahore or other zones unless overridden by tests)
    return {
      temp: 34,
      humidity: 40,
      description: "Clear & Hot Sky"
    };
  }
}
