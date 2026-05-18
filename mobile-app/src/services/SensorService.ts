import { Gyroscope } from 'expo-sensors';

export class SensorService {
  private static subscription: any = null;
  private static rollingMagnitude = 0;
  private static alpha = 0.2; // filter constant
  private static threshold = 3.5; // rad/s (tuned to prevent false-positives)
  private static sustainedStartTime = 0;
  private static sustainedDurationMs = 300; // sustained for 300ms (tuned to prevent false-positives)

  static startListening(onBreach: (magnitude: number) => void) {
    if (this.subscription) return;

    Gyroscope.setUpdateInterval(50); // 50ms polling rate

    this.subscription = Gyroscope.addListener(data => {
      const { x, y, z } = data;
      // Calculate angular velocity magnitude
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Low-pass filter rolling magnitude
      this.rollingMagnitude = this.alpha * magnitude + (1 - this.alpha) * this.rollingMagnitude;

      if (this.rollingMagnitude > this.threshold) {
        if (this.sustainedStartTime === 0) {
          this.sustainedStartTime = Date.now();
        } else {
          const duration = Date.now() - this.sustainedStartTime;
          if (duration >= this.sustainedDurationMs) {
            // sustained breach!
            onBreach(this.rollingMagnitude);
            this.sustainedStartTime = 0; // reset
          }
        }
      } else {
        this.sustainedStartTime = 0; // reset
      }
    });
  }

  static stopListening() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}
