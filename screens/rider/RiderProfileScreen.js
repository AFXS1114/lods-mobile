import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../shared/AuthContext';
import { supabase } from '../../shared/supabase';
import { COLORS, RIDER_STATUS } from '../../shared/constants';

const VEHICLE_TYPES = ['Bike', 'Motorcycle', 'Car', 'Van', 'Truck'];

export default function RiderProfileScreen() {
  const { user, updateUser, logout } = useAuth();
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [formData, setFormData] = useState({
    name:         user?.name    || '',
    contact:      user?.contact || '',
    vehicle_type: user?.vehicle_type || 'Motorcycle',
  });
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  useEffect(() => {
    fetchRating();
  }, []);

  const fetchRating = async () => {
    const { data, error } = await supabase
      .from('ratings')
      .select('rider_rating')
      .eq('rider_id', user.id);

    if (!error && data) {
      const count = data.length;
      const avg = count > 0 ? data.reduce((acc, curr) => acc + curr.rider_rating, 0) / count : 0;
      setAvgRating(avg);
      setRatingCount(count);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        name:         formData.name,
        contact:      formData.contact,
        vehicle_type: formData.vehicle_type,
      })
      .eq('id', user.id);

    if (error) {
      Alert.alert('Save Failed', error.message);
    } else {
      updateUser(formData);
      setEditing(false);
    }
    setSaving(false);
  };

  const handleStatusToggle = async (newStatus) => {
    const { error } = await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('id', user.id);

    if (!error) updateUser({ status: newStatus });
    else Alert.alert('Error', error.message);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const statusColor = { online: COLORS.accent, busy: COLORS.warning, offline: COLORS.textMuted, suspended: COLORS.danger }[user?.status] || COLORS.textMuted;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Avatar + name ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{(user?.name || 'R').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.displayName}>{user?.name || 'Rider'}</Text>
          
          {ratingCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <Ionicons name="star" size={16} color={COLORS.accent} />
              <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 14 }}>{avgRating.toFixed(1)}</Text>
              <Text style={{ color: COLORS.textDim, fontSize: 12 }}>({ratingCount} reviews)</Text>
            </View>
          )}

          <View style={[styles.statusPill, { borderColor: statusColor }]}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{(user?.status || 'offline').toUpperCase()}</Text>
          </View>
        </View>

        {/* ── Status Controls ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Network Status</Text>
          <View style={styles.statusBtns}>
            {[RIDER_STATUS.ONLINE, RIDER_STATUS.BUSY, RIDER_STATUS.OFFLINE].map((s) => {
              const color = { online: COLORS.accent, busy: COLORS.warning, offline: COLORS.textMuted }[s];
              const isActive = user?.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusBtn, { borderColor: color }, isActive && { backgroundColor: color }]}
                  onPress={() => handleStatusToggle(s)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.statusBtnText, { color: isActive ? '#fff' : color }]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Profile Form ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Profile Details</Text>
            <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Ionicons name={editing ? 'checkmark-circle' : 'pencil'} size={22} color={COLORS.primary} />
              }
            </TouchableOpacity>
          </View>

          <FormField label="Full Name" value={formData.name} editable={editing} onChangeText={(v) => setFormData({ ...formData, name: v })} icon="person-outline" />
          <FormField label="Contact Number" value={formData.contact} editable={editing} onChangeText={(v) => setFormData({ ...formData, contact: v })} icon="call-outline" keyboardType="phone-pad" />

          {/* Vehicle type selector */}
          {editing ? (
            <View style={styles.vehicleWrap}>
              <Text style={styles.fieldLabel}>Vehicle Type</Text>
              <View style={styles.vehicleRow}>
                {VEHICLE_TYPES.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.vehicleChip, formData.vehicle_type === v && styles.vehicleChipActive]}
                    onPress={() => setFormData({ ...formData, vehicle_type: v })}
                  >
                    <Text style={[styles.vehicleChipText, formData.vehicle_type === v && { color: COLORS.bg }]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <FormField label="Vehicle Type" value={user?.vehicle_type || 'N/A'} editable={false} icon="car-outline" />
          )}
        </View>

        {/* ── Sign Out ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function FormField({ label, value, editable, onChangeText, icon, keyboardType }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldInput, !editable && styles.fieldInputDisabled]}>
        <Ionicons name={icon} size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.fieldText}
          value={value}
          editable={editable}
          onChangeText={onChangeText}
          keyboardType={keyboardType || 'default'}
          placeholderTextColor={COLORS.textDim}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', marginBottom: 28, gap: 10 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 3, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 32, fontWeight: '800', color: COLORS.primary },
  displayName:   { fontSize: 22, fontWeight: '800', color: COLORS.text },
  statusPill:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  dot:           { width: 7, height: 7, borderRadius: 4 },
  statusLabel:   { fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 18, marginBottom: 16, gap: 14,
  },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, letterSpacing: 0.3 },

  statusBtns: { flexDirection: 'row', gap: 10 },
  statusBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 10, alignItems: 'center',
  },
  statusBtnText: { fontSize: 13, fontWeight: '700' },

  fieldWrap:       { gap: 6 },
  fieldLabel:      { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  fieldInput:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  fieldInputDisabled: { opacity: 0.6 },
  fieldText:       { flex: 1, color: COLORS.text, fontSize: 14 },

  vehicleWrap: { gap: 8 },
  vehicleRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehicleChip: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  vehicleChipActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  vehicleChipText:     { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 16,
    borderWidth: 1.5, borderColor: COLORS.danger,
    backgroundColor: COLORS.danger + '11',
  },
  logoutText: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
});
