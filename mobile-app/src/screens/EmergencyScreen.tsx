import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Animated, Easing } from 'react-native';
import { LocationService, GeoLocation } from '../services/LocationService';
import { SensorService } from '../services/SensorService';
import { BackgroundService } from '../services/BackgroundService';
import { ClientDB } from '../config/firebase';
import * as Haptics from 'expo-haptics';

interface EmergencyScreenProps {
  onSwitchToCommander: () => void;
}

export default function EmergencyScreen({ onSwitchToCommander }: EmergencyScreenProps) {
  const [coords, setCoords] = useState<GeoLocation | null>(null);
  const [isAlerting, setIsAlerting] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [statusText, setStatusText] = useState('Locking Sensors...');
  const [isBackgroundProtected, setIsBackgroundProtected] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Initial Location & Service Check
  useEffect(() => {
    LocationService.getCurrentLocation().then(loc => {
      setCoords(loc);
    });

    // Check if background service is already running
    BackgroundService.isRunning().then(running => {
      setIsBackgroundProtected(running);
      if (running) {
        setStatusText('Background Protection Active');
        BackgroundService.startBackgroundServiceAsync(triggerEmergency);
      } else {
        setStatusText('Monitoring Active (Local Only)');
        SensorService.startListening((magnitude) => {
          triggerEmergency(magnitude);
        });
      }
    });

    return () => {
      SensorService.stopListening();
      BackgroundService.stopBackgroundServiceAsync();
    };
  }, []);

  // SOS Pulse Animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Countdown timer logic
  useEffect(() => {
    let timer: any;
    if (isAlerting && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        // Animate circular countdown progress
        Animated.timing(progressAnim, {
          toValue: (countdown - 1) / 10,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }, 1000);
    } else if (isAlerting && countdown === 0) {
      sendEmergencySignal();
    }
    return () => clearTimeout(timer);
  }, [isAlerting, countdown]);

  const triggerEmergency = (force: number) => {
    if (isAlerting) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setIsAlerting(true);
    setCountdown(10);
    setStatusText('Impact Detected!');
    progressAnim.setValue(1);
  };

  const cancelEmergency = () => {
    setIsAlerting(false);
    setStatusText(isBackgroundProtected ? 'Background Protection Active' : 'Monitoring Active (Local Only)');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const sendEmergencySignal = async () => {
    setIsAlerting(false);
    setStatusText('SOS Signal Transmitted!');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    const alertId = 'alt-sim-' + Math.random().toString(36).substring(2, 6);
    const loc = coords || { latitude: 24.8607, longitude: 67.0011, accuracy: 0, altitude: 10 };
    await ClientDB.writeAlert(alertId, 'DEV-ALPHA-99', loc.latitude, loc.longitude, 3.85);
  };

  const toggleBackgroundProtection = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isBackgroundProtected) {
      await BackgroundService.stopBackgroundServiceAsync();
      setIsBackgroundProtected(false);
      setStatusText('Monitoring Active (Local Only)');
      
      // Fallback to local listening
      SensorService.startListening((magnitude) => {
        triggerEmergency(magnitude);
      });
    } else {
      setStatusText('Activating Protection...');
      const success = await BackgroundService.startBackgroundServiceAsync(triggerEmergency);
      if (success) {
        setIsBackgroundProtected(true);
        setStatusText('Background Protection Active');
      } else {
        setStatusText('Activation Failed');
        // Fallback to local
        SensorService.startListening((magnitude) => {
          triggerEmergency(magnitude);
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Background radial glow */}
      <View style={styles.glow} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>CIRO</Text>
        <Text style={styles.subtitle}>Crisis Sensor Node</Text>
      </View>

      {/* Status Deck */}
      <View style={styles.statusCard}>
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
        <View style={styles.circleContent}>
          <Text style={styles.statusLabel}>STATUS</Text>
          <Text style={styles.statusVal}>{statusText}</Text>
        </View>
      </View>

      {/* Background Protection Switch Panel */}
      <View style={styles.protectionCard}>
        <View style={styles.protectionInfo}>
          <Text style={styles.protectionTitle}>🛡️ Persistent Protection</Text>
          <Text style={styles.protectionDesc}>Runs background sensors & heartbeats when minimized.</Text>
        </View>
        <TouchableOpacity 
          style={[styles.toggleSwitch, isBackgroundProtected ? styles.toggleOn : styles.toggleOff]} 
          onPress={toggleBackgroundProtection}
          activeOpacity={0.8}
        >
          <View style={[styles.toggleThumb, isBackgroundProtected ? styles.thumbOn : styles.thumbOff]} />
        </TouchableOpacity>
      </View>

      {/* Coordinates Deck */}
      <View style={styles.telemetryCard}>
        <Text style={styles.telemetryTitle}>🛰️ High-Accuracy Telemetry</Text>
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryKey}>Latitude</Text>
          <Text style={styles.telemetryVal}>{coords?.latitude.toFixed(6) || 'Locking...'}</Text>
        </View>
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryKey}>Longitude</Text>
          <Text style={styles.telemetryVal}>{coords?.longitude.toFixed(6) || 'Locking...'}</Text>
        </View>
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryKey}>Altitude</Text>
          <Text style={styles.telemetryVal}>{coords?.altitude ? `${coords.altitude.toFixed(1)}m` : 'Locking...'}</Text>
        </View>
      </View>

      {/* Manual Trigger SOS Button */}
      <TouchableOpacity 
        style={styles.sosButton} 
        onPress={() => triggerEmergency(5.0)}
        activeOpacity={0.8}
      >
        <Text style={styles.sosText}>MANUAL SOS</Text>
      </TouchableOpacity>

      {/* Switch to Commander Tab Button */}
      <TouchableOpacity style={styles.commanderButton} onPress={onSwitchToCommander}>
        <Text style={styles.commanderText}>🛡️ Open Commander Deck</Text>
      </TouchableOpacity>

      {/* Circular Glowing Countdown Modal */}
      <Modal transparent visible={isAlerting} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalWarningTitle}>⚠️ EMERGENCY SOS ACTIVE</Text>
            <Text style={styles.modalWarningDesc}>A high-G kinetic shock was logged. Emitting crisis beacon automatically in:</Text>

            {/* Glowing Circular Timer */}
            <View style={styles.circularTimerContainer}>
              <Animated.View 
                style={[
                  styles.timerProgressBar, 
                  {
                    transform: [{
                      scale: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      })
                    }]
                  }
                ]} 
              />
              <Text style={styles.timerNumber}>{countdown}</Text>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={cancelEmergency} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>CANCEL EMERGENCY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0E12',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#FF2453',
    opacity: 0.15,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FF2453',
    letterSpacing: 8,
    textShadowColor: 'rgba(255, 36, 83, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 14,
    color: '#8A8D9B',
    letterSpacing: 2,
    marginTop: 8,
  },
  statusCard: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#212431',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: '#12141C',
  },
  pulseCircle: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 36, 83, 0.1)',
  },
  circleContent: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 10,
    color: '#8A8D9B',
    letterSpacing: 2,
    marginBottom: 8,
  },
  statusVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  protectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#12141C',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#212431',
    marginBottom: 20,
  },
  protectionInfo: {
    flex: 1,
    paddingRight: 16,
  },
  protectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  protectionDesc: {
    fontSize: 12,
    color: '#8A8D9B',
    lineHeight: 16,
  },
  toggleSwitch: {
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 4,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: '#FF2453',
  },
  toggleOff: {
    backgroundColor: '#212431',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  thumbOn: {
    transform: [{ translateX: 20 }],
  },
  thumbOff: {
    transform: [{ translateX: 0 }],
  },
  telemetryCard: {
    width: '100%',
    backgroundColor: '#12141C',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#212431',
    marginBottom: 20,
  },
  telemetryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  telemetryKey: {
    color: '#8A8D9B',
  },
  telemetryVal: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  sosButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#FF2453',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#FF2453',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  sosText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  commanderButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#12141C',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#212431',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commanderText: {
    color: '#8A8D9B',
    fontSize: 15,
    fontWeight: '600',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#12141C',
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: '#FF2453',
    alignItems: 'center',
  },
  modalWarningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF2453',
    marginBottom: 12,
  },
  modalWarningDesc: {
    color: '#8A8D9B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  circularTimerContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0E12',
    borderWidth: 2,
    borderColor: '#212431',
    marginBottom: 40,
  },
  timerProgressBar: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: 'rgba(255, 36, 83, 0.15)',
    borderColor: '#FF2453',
    borderWidth: 2,
  },
  timerNumber: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFF',
  },
  cancelBtn: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#0D0E12',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
