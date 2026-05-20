// StakeholderDashboard.tsx - Simplified UI for non‑technical users (Police, Hospital staff, NGOs)
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert as RNAlert } from 'react-native';
import { ClientDB, Crisis } from '../config/firebase';
import * as Font from 'expo-font';
import { AppLoading } from 'expo';

// Helper hook to load Inter font (nice modern typography)
const useInterFont = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      await Font.loadAsync({
        Inter: require('../../assets/fonts/Inter-Regular.ttf'),
        'Inter-Bold': require('../../assets/fonts/Inter-Bold.ttf'),
      });
      setFontsLoaded(true);
    })();
  }, []);
  return fontsLoaded;
};

// Helper to map severity to colour and readable label
const severityMap = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
      return { color: '#FF2453', label: 'Critical' }; // red
    case 'HIGH':
      return { color: '#FF9500', label: 'High' }; // orange
    default:
      return { color: '#4CD964', label: 'Low' }; // green
  }
};

// Emergency card – large coloured status bar, bold crisis type, plain location, resource list, ETA
const EmergencyCard = ({ crisis }: { crisis: Crisis }) => {
  const { color, label } = severityMap(crisis.severity);
  return (
    <View style={[styles.simpleCard, { borderColor: color }]}>
      <View style={[styles.statusBar, { backgroundColor: color }]} />
      <Text style={styles.largeLabel}>{crisis.classification?.toUpperCase() ?? 'UNKNOWN'}</Text>
      <Text style={styles.mediumText}>Location: {crisis.locationName ?? 'Unknown'}</Text>
      <Text style={styles.mediumText}>Severity: {label}</Text>
      <Text style={styles.mediumText}>Resources Dispatched:</Text>
      {crisis.responders && crisis.responders.length > 0 ? (
        crisis.responders.map((r, i) => (
          <Text key={i} style={styles.listItem}>• {r}</Text>
        ))
      ) : (
        <Text style={styles.listItem}>None</Text>
      )}
      <Text style={styles.largeNumber}>ETA: {crisis.eta ?? 'N/A'} min</Text>
    </View>
  );
};

// Hospital card – colour‑coded capacity bar, big bed‑available number
const HospitalCard = ({ capacity }: { capacity: number }) => {
  const colour = capacity > 85 ? '#FF2453' : capacity > 60 ? '#FF9500' : '#4CD964';
  const label = capacity > 85 ? 'Full' : capacity > 60 ? 'Filling' : 'OK';
  const available = Math.max(0, 100 - capacity);
  return (
    <View style={[styles.simpleCard, { borderColor: colour }]}>
      <View style={[styles.statusBar, { backgroundColor: colour }]} />
      <Text style={styles.largeLabel}>City Hospital</Text>
      <Text style={styles.largeNumber}>{available}% Beds Available</Text>
      <Text style={styles.mediumText}>Capacity: {capacity}% ({label})</Text>
    </View>
  );
};

// NGO card – static list of verified evacuation zones
const NGOCards = () => (
  <View style={styles.simpleCard}>
    <View style={[styles.statusBar, { backgroundColor: '#4CD964' }]} />
    <Text style={styles.largeLabel}>Verified Evacuation Zones</Text>
    <Text style={styles.listItem}>• Zone Alpha – Karachi Center (Clear)</Text>
    <Text style={styles.listItem}>• Zone Beta – Johar Town (Clear)</Text>
    <Text style={styles.listItem}>• Safe Zone 1 – Edhi HQ (Ready)</Text>
    <Text style={styles.listItem}>• Safe Zone 2 – Rangers Post (Ready)</Text>
  </View>
);

// Volunteer enrollment form (simple, two fields)
const VolunteerForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const handleSubmit = () => {
    if (!name || !phone) {
      RNAlert.alert('Incomplete Form', 'Please enter your name and phone number.');
      return;
    }
    RNAlert.alert('Registration Successful', `Thank you, ${name}. A CIRO volunteer officer will contact you shortly.`);
    setName('');
    setPhone('');
    onSuccess();
  };
  return (
    <View style={styles.volunteerCard}>
      <Text style={styles.volunteerTitle}>🤝 Volunteer Dispatch Enrollment</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#8A8D9B"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        placeholderTextColor="#8A8D9B"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
        <Text style={styles.submitBtnText}>ENROLL DISPATCH</Text>
      </TouchableOpacity>
    </View>
  );
};

interface Props {
  onBackToVictim: () => void;
}

export default function StakeholderDashboard({ onBackToVictim }: Props) {
  const fontsLoaded = useInterFont();
  const [activeTab, setActiveTab] = useState<'EMERGENCY' | 'HOSPITAL' | 'NGO'>('EMERGENCY');
  const [crises, setCrises] = useState<{ [id: string]: Crisis }>({});
  const [bedCapacity, setBedCapacity] = useState(65);

  // Poll Firebase every 1.5 seconds (as required by existing logic)
  useEffect(() => {
    const fetch = async () => {
      const data = await ClientDB.getCrises();
      setCrises(data);
    };
    fetch();
    const interval = setInterval(fetch, 1500);
    return () => clearInterval(interval);
  }, []);

  // Helper to get the most critical crisis (CRITICAL > HIGH > MEDIUM > LOW)
  const getMostCritical = () => {
    const list = Object.values(crises);
    if (list.length === 0) return null;
    const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    list.sort((a, b) => (order[b.severity] || 0) - (order[a.severity] || 0));
    return list[0];
  };

  if (!fontsLoaded) {
    return <AppLoading />;
  }

  const mostCritical = getMostCritical();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToVictim}>
          <Text style={styles.backBtnText}>← Victim View</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🛡️ STAKEHOLDER DASHBOARD</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'EMERGENCY' && styles.activeTab]}
          onPress={() => setActiveTab('EMERGENCY')}
        >
          <Text style={[styles.tabText, activeTab === 'EMERGENCY' && styles.activeTabText]}>🚨 Emergency</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'HOSPITAL' && styles.activeTab]}
          onPress={() => setActiveTab('HOSPITAL')}
        >
          <Text style={[styles.tabText, activeTab === 'HOSPITAL' && styles.activeTabText]}>🏥 Hospital</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'NGO' && styles.activeTab]}
          onPress={() => setActiveTab('NGO')}
        >
          <Text style={[styles.tabText, activeTab === 'NGO' && styles.activeTabText]}>🤝 NGOs</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'EMERGENCY' && (
          mostCritical ? (
            <EmergencyCard crisis={mostCritical} />
          ) : (
            <Text style={styles.emptyText}>No active crises at the moment.</Text>
          )
        )}
        {activeTab === 'HOSPITAL' && <HospitalCard capacity={bedCapacity} />}
        {activeTab === 'NGO' && (
          <View>
            <NGOCards />
            <VolunteerForm onSuccess={() => {}} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0E12', paddingTop: 48 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  backBtn: { backgroundColor: '#12141C', borderWidth: 1, borderColor: '#212431', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 16 },
  backBtnText: { color: '#8A8D9B', fontWeight: 'bold', fontSize: 13 },
  title: { fontSize: 18, fontWeight: '900', color: '#FFF', letterSpacing: 1, fontFamily: 'Inter-Bold' },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#12141C', marginHorizontal: 4, borderWidth: 1, borderColor: '#212431' },
  activeTab: { backgroundColor: '#FF2453', borderColor: '#FF2453' },
  tabText: { fontSize: 12, color: '#8A8D9B', fontWeight: 'bold', fontFamily: 'Inter' },
  activeTabText: { color: '#FFF', fontFamily: 'Inter-Bold' },
  scrollBody: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  emptyText: { color: '#8A8D9B', textAlign: 'center', marginTop: 20 },
  // Simple card base
  simpleCard: { backgroundColor: '#12141C', borderRadius: 16, borderWidth: 2, padding: 20, marginBottom: 24 },
  statusBar: { height: 6, borderTopLeftRadius: 14, borderTopRightRadius: 14, marginBottom: 12 },
  largeLabel: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
  mediumText: { color: '#8A8D9B', fontSize: 14, marginTop: 4 },
  listItem: { color: '#8A8D9B', fontSize: 13, marginLeft: 8, marginTop: 2 },
  largeNumber: { fontSize: 28, fontWeight: '900', color: '#FFF', marginTop: 12, textAlign: 'center' },
  // Volunteer form styles
  volunteerCard: { backgroundColor: '#12141C', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#212431', marginTop: 24 },
  volunteerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
  input: { width: '100%', height: 48, backgroundColor: '#0D0E12', borderRadius: 10, paddingHorizontal: 16, color: '#FFF', marginBottom: 12, borderWidth: 1, borderColor: '#212431' },
  submitBtn: { width: '100%', height: 48, backgroundColor: '#FF2453', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
});
