import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert as RNAlert } from 'react-native';
import { ClientDB, Crisis } from '../config/firebase';

interface StakeholderDashboardProps {
  onBackToVictim: () => void;
}

export default function StakeholderDashboard({ onBackToVictim }: StakeholderDashboardProps) {
  const [activeTab, setActiveTab] = useState<'RESPONDER' | 'HOSPITAL' | 'NGO'>('RESPONDER');
  const [crises, setCrises] = useState<{ [id: string]: Crisis }>({});
  const [bedCapacity, setBedCapacity] = useState(65); // percentage slider value
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerPhone, setVolunteerPhone] = useState('');

  // Poll database for crises every 1.5 seconds
  useEffect(() => {
    const fetchCrises = async () => {
      const data = await ClientDB.getCrises();
      setCrises(data);
    };

    fetchCrises();
    const interval = setInterval(fetchCrises, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleVolunteerSubmit = () => {
    if (!volunteerName || !volunteerPhone) {
      RNAlert.alert('Incomplete Form', 'Please enter your name and phone number.');
      return;
    }
    RNAlert.alert('Registration Successful', `Thank you, ${volunteerName}. A CIRO volunteer officer will contact you shortly.`);
    setVolunteerName('');
    setVolunteerPhone('');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToVictim}>
          <Text style={styles.backBtnText}>← Victim View</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🛡️ COMMANDER DECK</Text>
      </View>

      {/* Tabs Switcher */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'RESPONDER' && styles.activeTab]}
          onPress={() => setActiveTab('RESPONDER')}
        >
          <Text style={[styles.tabText, activeTab === 'RESPONDER' && styles.activeTabText]}>🚒 Responders</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'HOSPITAL' && styles.activeTab]}
          onPress={() => setActiveTab('HOSPITAL')}
        >
          <Text style={[styles.tabText, activeTab === 'HOSPITAL' && styles.activeTabText]}>🏥 Hospital Triage</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'NGO' && styles.activeTab]}
          onPress={() => setActiveTab('NGO')}
        >
          <Text style={[styles.tabText, activeTab === 'NGO' && styles.activeTabText]}>🤝 NGOs & Evac</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Body */}
      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'RESPONDER' && (
          <View style={styles.tabContent}>
            {/* Animated Radar Pulse Panel */}
            <View style={styles.radarCard}>
              <View style={styles.radarRing1}>
                <View style={styles.radarRing2}>
                  <View style={styles.radarRing3}>
                    <View style={styles.radarSweep} />
                    <View style={styles.radarBlip1} />
                    <View style={styles.radarBlip2} />
                  </View>
                </View>
              </View>
              <Text style={styles.radarText}>📡 Active Coordinate Scanners Online</Text>
            </View>

            {/* Severity Sorted Event Feed */}
            <Text style={styles.sectionTitle}>⚠️ Priority Incident Dispatch Feed</Text>
            {Object.keys(crises).length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No active municipal crises reported. Grid safe.</Text>
              </View>
            ) : (
              Object.values(crises).map((crisis) => (
                <View key={crisis.id} style={styles.crisisCard}>
                  <View style={styles.crisisHeader}>
                    <Text style={styles.crisisId}>{crisis.id}</Text>
                    <View style={[styles.badge, crisis.severity === 'CRITICAL' ? styles.criticalBadge : styles.highBadge]}>
                      <Text style={styles.badgeText}>{crisis.severity}</Text>
                    </View>
                  </View>

                  <Text style={styles.crisisType}>🚨 TYPE: {crisis.classification} ({crisis.confidence}% confidence)</Text>
                  <Text style={styles.crisisDetail}>📝 Action Plan: {crisis.publicSms}</Text>
                  
                  <View style={styles.dispatchesContainer}>
                    <Text style={styles.dispatchesTitle}>🚒 Responders Active:</Text>
                    {crisis.responders.map((resp, i) => (
                      <Text key={i} style={styles.dispatchItem}>• {resp}</Text>
                    ))}
                  </View>

                  <Text style={styles.crisisTime}>🕒 Logged: {new Date(crisis.timestamp).toLocaleTimeString()}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'HOSPITAL' && (
          <View style={styles.tabContent}>
            <View style={styles.triageCard}>
              <Text style={styles.triageTitle}>🏥 Real-Time Triage Metrics</Text>
              <View style={styles.triageRow}>
                <Text style={styles.triageKey}>Critical Red Zone Patients</Text>
                <Text style={[styles.triageVal, { color: '#FF2453' }]}>3 Patients</Text>
              </View>
              <View style={styles.triageRow}>
                <Text style={styles.triageKey}>Yellow Stable Patients</Text>
                <Text style={[styles.triageVal, { color: '#FF9500' }]}>7 Patients</Text>
              </View>
            </View>

            {/* Bed Capacity Simulator Sliders */}
            <View style={styles.sliderCard}>
              <Text style={styles.sliderTitle}>🛏️ Hospital ICU Bed Utilization</Text>
              <Text style={styles.sliderDesc}>Capacity Status: {bedCapacity}% Filled</Text>
              
              {/* Custom interactive slider bar */}
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${bedCapacity}%`, backgroundColor: bedCapacity > 85 ? '#FF2453' : '#4CD964' }]} />
                <TouchableOpacity style={[styles.thumb, { left: `${bedCapacity - 5}%` }]} onPress={() => setBedCapacity(bedCapacity > 85 ? 55 : bedCapacity + 10)} />
              </View>

              {bedCapacity > 85 && (
                <View style={styles.capacityWarning}>
                  <Text style={styles.capacityWarningText}>🚨 RED ALERT: bed capacity exceeds 85%. Activate NGO safehouses!</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'NGO' && (
          <View style={styles.tabContent}>
            <View style={styles.evacCard}>
              <Text style={styles.evacTitle}>🗺️ Verified Evacuation Zones & Routes</Text>
              <Text style={styles.evacRoute}>• Route Alpha (Karachi Center): Clear through Shahrah-e-Faisal</Text>
              <Text style={styles.evacRoute}>• Route Beta (Johar Town): Clear via Canal Bank Road</Text>
              <Text style={styles.evacRoute}>• Safe Zone 1: Edhi Foundation HQ (Karachi)</Text>
              <Text style={styles.evacRoute}>• Safe Zone 2: Rangers Central Post (Karachi)</Text>
            </View>

            {/* Volunteer Callback Form */}
            <View style={styles.volunteerCard}>
              <Text style={styles.volunteerTitle}>🤝 Volunteer Dispatch Enrollment</Text>
              <Text style={styles.volunteerDesc}>Register to join local NGO search-and-rescue teams on the ground.</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#8A8D9B"
                value={volunteerName}
                onChangeText={setVolunteerName}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#8A8D9B"
                keyboardType="phone-pad"
                value={volunteerPhone}
                onChangeText={setVolunteerPhone}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleVolunteerSubmit}>
                <Text style={styles.submitBtnText}>ENROLL DISPATCH</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0E12',
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#12141C',
    borderWidth: 1,
    borderColor: '#212431',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 16,
  },
  backBtnText: {
    color: '#8A8D9B',
    fontWeight: 'bold',
    fontSize: 13,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#12141C',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#212431',
  },
  activeTab: {
    backgroundColor: '#FF2453',
    borderColor: '#FF2453',
  },
  tabText: {
    fontSize: 12,
    color: '#8A8D9B',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#FFF',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContent: {
    width: '100%',
  },
  radarCard: {
    backgroundColor: '#12141C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#212431',
    padding: 30,
    alignItems: 'center',
    marginBottom: 24,
  },
  radarRing1: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(255, 36, 83, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRing2: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 36, 83, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRing3: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 36, 83, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarSweep: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderTopLeftRadius: 70,
    backgroundColor: 'rgba(255, 36, 83, 0.1)',
    left: 0,
    top: 0,
  },
  radarBlip1: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF2453',
    left: 10,
    top: 20,
  },
  radarBlip2: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9500',
    right: 15,
    bottom: 25,
  },
  radarText: {
    color: '#8A8D9B',
    fontSize: 13,
    marginTop: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#12141C',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#212431',
  },
  emptyText: {
    color: '#8A8D9B',
  },
  crisisCard: {
    backgroundColor: '#12141C',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#212431',
    marginBottom: 16,
  },
  crisisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  crisisId: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  criticalBadge: {
    backgroundColor: '#FF2453',
  },
  highBadge: {
    backgroundColor: '#FF9500',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  crisisType: {
    color: '#FF2453',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 8,
  },
  crisisDetail: {
    color: '#8A8D9B',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  dispatchesContainer: {
    backgroundColor: '#0D0E12',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dispatchesTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 6,
  },
  dispatchItem: {
    color: '#8A8D9B',
    fontSize: 12,
    lineHeight: 16,
  },
  crisisTime: {
    color: '#4E505F',
    fontSize: 11,
  },
  triageCard: {
    backgroundColor: '#12141C',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#212431',
    marginBottom: 20,
  },
  triageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  triageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  triageKey: {
    color: '#8A8D9B',
  },
  triageVal: {
    fontWeight: 'bold',
  },
  sliderCard: {
    backgroundColor: '#12141C',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#212431',
  },
  sliderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  sliderDesc: {
    color: '#8A8D9B',
    marginBottom: 16,
  },
  track: {
    width: '100%',
    height: 8,
    backgroundColor: '#0D0E12',
    borderRadius: 4,
    position: 'relative',
    marginBottom: 20,
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FF2453',
    top: -8,
  },
  capacityWarning: {
    backgroundColor: 'rgba(255, 36, 83, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF2453',
  },
  capacityWarningText: {
    color: '#FF2453',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  evacCard: {
    backgroundColor: '#12141C',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#212431',
    marginBottom: 20,
  },
  evacTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  evacRoute: {
    color: '#8A8D9B',
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  volunteerCard: {
    backgroundColor: '#12141C',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#212431',
  },
  volunteerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  volunteerDesc: {
    color: '#8A8D9B',
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#0D0E12',
    borderRadius: 10,
    paddingHorizontal: 16,
    color: '#FFF',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#212431',
  },
  submitBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#FF2453',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
