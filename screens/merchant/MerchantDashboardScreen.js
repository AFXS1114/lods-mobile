import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../shared/AuthContext';
import { supabase } from '../../shared/supabase';
import { showLocalNotification } from '../../shared/notificationService';
import { COLORS, ORDER_STATUS, MERCHANT_STATUS } from '../../shared/constants';

export default function MerchantDashboardScreen() {
  const { user } = useAuth(); // user = merchant row
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating,   setUpdating]   = useState(null);
  const prevIdsRef = useRef(new Set());

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel(`merchant-orders-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `merchant_id=eq.${user.id}`,
      }, (payload) => {
        // New order came in → notify
        if (payload.eventType === 'INSERT') {
          const o = payload.new;
          showLocalNotification(
            '🛒 New Order Incoming!',
            `Booking ${o.booking_no} — ${o.items?.length || 0} item(s) — ₱${o.final_total}`,
            { orderId: o.id },
          );
        }
        fetchOrders();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('merchant_id', user.id)
      .not('status', 'in', `("${ORDER_STATUS.DELIVERED}","${ORDER_STATUS.CANCELLED}")`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
      prevIdsRef.current = new Set(data.map((o) => o.id));
    }
    setLoading(false);
    setRefreshing(false);
  };

  const updateMerchantStatus = async (orderId, merchantStatus) => {
    setUpdating(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ merchant_status: merchantStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) Alert.alert('Update Failed', error.message);
    setUpdating(null);
    fetchOrders();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading orders…</Text>
      </View>
    );
  }

  // ── Stats ─────────────────────────────────────────────────
  const preparingCount = orders.filter((o) => o.merchant_status === MERCHANT_STATUS.PREPARING).length;
  const readyCount     = orders.filter((o) => o.merchant_status === MERCHANT_STATUS.READY).length;
  const newCount       = orders.filter((o) => !o.merchant_status).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.subtitle}>{user?.name || 'Merchant'}</Text>
          <Text style={styles.title}>Order Dashboard</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* ── Stats Row ── */}
      <View style={styles.statsRow}>
        <StatCard label="New"       value={newCount}      color={COLORS.warning} icon="alert-circle" />
        <StatCard label="Preparing" value={preparingCount} color={COLORS.info}    icon="time" />
        <StatCard label="Ready"     value={readyCount}     color={COLORS.accent}  icon="checkmark-circle" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchOrders(); }}
            tintColor={COLORS.primary}
          />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="storefront-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Active Orders</Text>
            <Text style={styles.emptySub}>When the teller assigns orders to your store, they'll appear here instantly.</Text>
          </View>
        ) : (
          orders.map((order) => (
            <MerchantOrderCard
              key={order.id}
              order={order}
              updating={updating === order.id}
              onPrepare={() => updateMerchantStatus(order.id, MERCHANT_STATUS.PREPARING)}
              onReady={()   => updateMerchantStatus(order.id, MERCHANT_STATUS.READY)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '44' }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MerchantOrderCard({ order, updating, onPrepare, onReady }) {
  const ms = order.merchant_status;
  const isNew       = !ms;
  const isPreparing = ms === MERCHANT_STATUS.PREPARING;
  const isReady     = ms === MERCHANT_STATUS.READY;

  const msColor = isNew ? COLORS.warning : isPreparing ? COLORS.info : COLORS.accent;
  const msLabel = isNew ? 'NEW ORDER' : isPreparing ? 'PREPARING' : 'READY FOR PICKUP';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.bookingNo}>{order.booking_no}</Text>
        <View style={[styles.msBadge, { backgroundColor: msColor + '22', borderColor: msColor + '55' }]}>
          <Text style={[styles.msBadgeText, { color: msColor }]}>{msLabel}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Rider assigned */}
      {order.rider_name && (
        <View style={styles.infoRow}>
          <Ionicons name="bicycle-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.infoText}>Rider: <Text style={{ color: COLORS.text, fontWeight: '600' }}>{order.rider_name}</Text></Text>
        </View>
      )}
      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.infoText}>Customer: <Text style={{ color: COLORS.text, fontWeight: '600' }}>{order.customer_name}</Text></Text>
      </View>

      {/* Items */}
      {order.items && Array.isArray(order.items) && (
        <View style={styles.itemsBox}>
          <Text style={styles.itemsHeader}>Items to Prepare</Text>
          {order.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.qty}×</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>₱{(item.qty * item.price).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Order Total</Text>
            <Text style={styles.totalValue}>₱{Number(order.final_total || 0).toFixed(2)}</Text>
          </View>
        </View>
      )}

      {/* Delivery address */}
      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.infoText} numberOfLines={1}>{order.delivery_address}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {isNew && (
          <TouchableOpacity style={[styles.btn, styles.btnPrepare]} onPress={onPrepare} disabled={updating} activeOpacity={0.85}>
            {updating ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="flame" size={17} color="#fff" /><Text style={styles.btnText}>Start Preparing</Text></>}
          </TouchableOpacity>
        )}
        {isPreparing && (
          <TouchableOpacity style={[styles.btn, styles.btnReady]} onPress={onReady} disabled={updating} activeOpacity={0.85}>
            {updating ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="checkmark-done" size={17} color="#fff" /><Text style={styles.btnText}>Ready for Pickup</Text></>}
          </TouchableOpacity>
        )}
        {isReady && (
          <View style={styles.readyConfirm}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} />
            <Text style={[styles.btnText, { color: COLORS.accent }]}>Awaiting Rider Pickup</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted },
  scroll: { padding: 16, paddingBottom: 40 },

  topBar:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 20, paddingBottom: 8 },
  subtitle:      { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  title:         { fontSize: 24, fontWeight: '800', color: COLORS.text },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent + '22', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  liveDot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.accent },
  liveText:      { color: COLORS.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 4 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 6, borderWidth: 1,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.3 },

  emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMuted },
  emptySub:   { fontSize: 13, color: COLORS.textDim, textAlign: 'center', maxWidth: 260, lineHeight: 20 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 14, gap: 10,
  },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingNo:   { fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: 'monospace' },
  msBadge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  msBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  divider:     { height: 1, backgroundColor: COLORS.border },

  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },

  itemsBox:    { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, gap: 7 },
  itemsHeader: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  itemRow:     { flexDirection: 'row', gap: 8, alignItems: 'center' },
  itemQty:     { fontSize: 13, color: COLORS.primary, fontWeight: '700', width: 24 },
  itemName:    { fontSize: 13, color: COLORS.text, flex: 1 },
  itemPrice:   { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  totalLine:   { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, marginTop: 2 },
  totalLabel:  { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  totalValue:  { fontSize: 15, color: COLORS.primary, fontWeight: '800' },

  actionRow:   { flexDirection: 'row' },
  btn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingVertical: 13 },
  btnText:     { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnPrepare:  { backgroundColor: COLORS.warning },
  btnReady:    { backgroundColor: COLORS.accent },
  readyConfirm:{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, borderWidth: 1, borderColor: COLORS.accent + '55' },
});
