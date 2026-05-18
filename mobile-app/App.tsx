import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { HeartbeatService } from './src/services/HeartbeatService';
import EmergencyScreen from './src/screens/EmergencyScreen';
import StakeholderDashboard from './src/components/StakeholderDashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<'VICTIM' | 'COMMANDER'>('VICTIM');

  useEffect(() => {
    // Start transmitting healthy heartbeats to the database
    HeartbeatService.startBeaming();

    return () => {
      HeartbeatService.stopBeaming();
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {currentView === 'VICTIM' ? (
        <EmergencyScreen onSwitchToCommander={() => setCurrentView('COMMANDER')} />
      ) : (
        <StakeholderDashboard onBackToVictim={() => setCurrentView('VICTIM')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0E12',
  },
});
