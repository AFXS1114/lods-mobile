import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../shared/AuthContext';
import { COLORS } from '../../shared/constants';

export default function MerchantProfileScreen() {
  const { user, logout } = useAuth(); // user = merchants table row

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const fields = [
    { label: 'Store Name',     value: user?.name,           icon: 'storefront-outline'   },
    { label: 'Category',       value: user?.category,       icon: 'pricetag-outline'     },
    { label: 'Contact Person', value: user?.contact_person, icon: 'person-outline'       },
    { label: 'Phone',          value: user?.phone,           icon: 'call-outline'         },
    { label: 'Email',          value: user?.email,           icon: 'mail-outline'         },
    { label: 'Address',        value: user?.address,         icon: 'location-outline'     },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Store Banner ── */}
        <View style={styles.banner}>
          <View style={styles.storeIcon}>
            <Ionicons name="storefront" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.storeName}>{user?.name || 'Merchant'}</Text>
          <View style={[styles.statusPill, { borderColor: user?.status === 'active' ? COLORS.accent : COLORS.danger }]}>
            <View style={[styles.dot, { backgroundColor: user?.status === 'active' ? COLORS.accent : COLORS.danger }]} />
            <Text style={[styles.statusText, { color: user?.status === 'active' ? COLORS.accent : COLORS.danger }]}>
              {(user?.status || 'active').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── Info Card ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Store Information</Text>
          {fields.map((f, i) => (
            f.value ? (
              <View key={i} style={styles.fieldRow}>
                <View style={styles.fieldIconWrap}>
                  <Ionicons name={f.icon} size={16} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <Text style={styles.fieldValue}>{f.value}</Text>
                </View>
              </View>
            ) : null
          ))}
        </View>

        {/* ── App Info ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconWrap}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.info} />
            </View>
            <View>
              <Text style={styles.fieldLabel}>App Version</Text>
              <Text style={styles.fieldValue}>LODS Mobile v1.0</Text>
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconWrap}>
              <Ionicons name="server-outline" size={16} color={COLORS.info} />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Backend</Text>
              <Text style={styles.fieldValue}>LODS Terminal (Supabase)</Text>
            </View>
          </View>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },

  banner: { alignItems: 'center', marginBottom: 28, gap: 10 },
  storeIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 2, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  storeName:   { fontSize: 22, fontWeight: '800', color: COLORS.text },
  statusPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  statusText:  { fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 18, marginBottom: 16, gap: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, letterSpacing: 0.3 },

  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fieldIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center', justifyContent: 'center',
  },
  fieldLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  fieldValue: { fontSize: 14, color: COLORS.text, fontWeight: '500', marginTop: 2 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 16,
    borderWidth: 1.5, borderColor: COLORS.danger,
    backgroundColor: COLORS.danger + '11',
  },
  logoutText: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
});
