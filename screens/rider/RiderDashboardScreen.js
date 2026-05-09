import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Switch,
  TouchableOpacity, Alert, AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../shared/AuthContext';
import { supabase } from '../../shared/supabase';
import { COLORS, RIDER_STATUS, ORDER_STATUS, GPS_INTERVAL_MS } from '../../shared/constants';

export default function RiderDashboardScreen() {
  const { user, updateUser } = useAuth();
  const [isTracking,   setIsTracking]   = useState(false);
  const [gpsLocation,  setGpsLocation]  = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const gpsIntervalRef = useRef(null);
  const appStateRef    = useRef(AppState.currentState);

  // ── Fetch active order count on mount ──────────────────────
  useEffect(() => {
    fetchActiveOrders();

    // Subscribe to realtime for this rider's orders
    const channel = supabase
      .channel(`rider-dashboard-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `rider_id=eq.${user.id}`,
      }, () => fetchActiveOrders())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ── Set rider ONLINE when app comes to foreground ──────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        await setRiderStatus(RIDER_STATUS.ONLINE);
      } else if (nextState.match(/inactive|background/)) {
        await setRiderStatus(RIDER_STATUS.OFFLINE);
        stopTracking();
      }
      appStateRef.current = nextState;
    });
    // Mark online on mount
    setRiderStatus(RIDER_STATUS.ONLINE);
    return () => { sub.remove(); stopTracking(); };
  }, []);

  const fetchActiveOrders = async () => {
    setLoadingOrders(true);
    const { data } = await supabase
      .from('orders')
      .select('id, booking_no, status, delivery_address, customer_name')
      .eq('rider_id', user.id)
      .in('status', [ORDER_STATUS.ASSIGNED, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.PICKED_UP]);
    setActiveOrders(data || []);
    setLoadingOrders(false);
  };

  const setRiderStatus = async (status) => {
    await supabase.from('users').update({ status }).eq('id', user.id);
    updateUser({ status });
  };

  // ── GPS Tracking ───────────────────────────────────────────
  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location access is required for GPS tracking.');
      return;
    }

    const pushLocation = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = loc.coords;
        const gps_timestamp = new Date().toISOString();
        setGpsLocation({ latitude, longitude });
        await supabase.from('users')
          .update({ latitude, longitude, gps_timestamp })
          .eq('id', user.id);
      } catch (e) { console.warn('[GPS] error:', e.message); }
    };

    await pushLocation(); // immediate first push
    gpsIntervalRef.current = setInterval(pushLocation, GPS_INTERVAL_MS);
    setIsTracking(true);
    await setRiderStatus(RIDER_STATUS.ONLINE);
  };

  const stopTracking = () => {
    if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    gpsIntervalRef.current = null;
    setIsTracking(false);
  };

  const toggleTracking = () => isTracking ? stopTracking() : startTracking();

  // ── Status badge color ─────────────────────────────────────
  const statusColor = {
    online:    COLORS.accent,
    busy:      COLORS.warning,
    offline:   COLORS.textMuted,
    suspended: COLORS.danger,
  }[user?.status] || COLORS.textMuted;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good {getTimeGreeting()},</Text>
            <Text style={styles.riderName}>{user?.name || 'Rider'}</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {(user?.status || 'offline').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── GPS Tracking Card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="navigate" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>GPS Tracking</Text>
              <Text style={styles.cardSub}>
                {isTracking
                  ? gpsLocation
                    ? `${gpsLocation.latitude.toFixed(5)}, ${gpsLocation.longitude.toFixed(5)}`
                    : 'Acquiring signal…'
                  : 'Tracking is OFF — turn on to start transmitting location'}
              </Text>
            </View>
            <Switch
              value={isTracking}
              onValueChange={toggleTracking}
              trackColor={{ false: COLORS.surface, true: COLORS.primaryDim }}
              thumbColor={isTracking ? COLORS.primary : COLORS.textMuted}
            />
          </View>

          {isTracking && (
            <View style={styles.gpsIndicator}>
              <View style={styles.gpsPulse} />
              <Text style={styles.gpsLabel}>LIVE • Updating every 15 s</Text>
            </View>
          )}
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <StatBox label="Active Orders" value={activeOrders.length} icon="bicycle" color={COLORS.primary} />
          <StatBox label="Vehicle"       value={user?.vehicle_type || 'N/A'} icon="car" color={COLORS.info} />
          <StatBox label="Status"        value={user?.status || 'offline'}    icon="radio-button-on" color={statusColor} />
        </View>

        {/* ── Active Orders Preview ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Deliveries</Text>
          <Text style={styles.sectionCount}>{activeOrders.length}</Text>
        </View>

        {activeOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No active deliveries. You're all clear!</Text>
          </View>
        ) : (
          activeOrders.map((order) => (
            <View key={order.id} style={styles.orderPreviewCard}>
              <Text style={styles.orderNo}>{order.booking_no}</Text>
              <Text style={styles.orderCustomer}>{order.customer_name}</Text>
              <Text style={styles.orderAddress} numberOfLines={1}>{order.delivery_address}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '22' }]}>
                <Text style={[styles.statusBadgeText, { color: getStatusColor(order.status) }]}>
                  {order.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, icon, color }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 18) return 'Afternoon';
  return 'Evening';
}

function getStatusColor(status) {
  switch (status) {
    case 'assigned':   return COLORS.warning;
    case 'in-transit': return COLORS.info;
    case 'picked-up':  return COLORS.primary;
    case 'delivered':  return COLORS.accent;
    case 'cancelled':  return COLORS.danger;
    default:           return COLORS.textMuted;
  }
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },

  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting:    { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  riderName:   { fontSize: 26, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  statusPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  statusText:  { fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.primaryDim, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardSub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 2, flexShrink: 1 },
  gpsIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  gpsPulse:     { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  gpsLabel:     { fontSize: 11, color: COLORS.accent, fontWeight: '600', letterSpacing: 0.5 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sectionCount:  {
    fontSize: 12, fontWeight: '700', color: COLORS.primary,
    backgroundColor: COLORS.primaryDim, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },

  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 32,
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },

  orderPreviewCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, gap: 4,
  },
  orderNo:       { fontSize: 11, color: COLORS.primary, fontWeight: '700', fontFamily: 'monospace' },
  orderCustomer: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  orderAddress:  { fontSize: 12, color: COLORS.textMuted },
  statusBadge:   { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});
