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
import { COLORS, ORDER_STATUS } from '../../shared/constants';

export default function RiderOrdersScreen() {
  const { user } = useAuth();
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating,   setUpdating]   = useState(null); // order id being updated
  const prevOrderIdsRef = useRef(new Set());

  // ── Fetch & Realtime ───────────────────────────────────────
  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel(`rider-orders-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `rider_id=eq.${user.id}`,
      }, (payload) => {
        // New order assigned → local notification
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const o = payload.new;
          if (!prevOrderIdsRef.current.has(o.id) && o.status === ORDER_STATUS.ASSIGNED) {
            showLocalNotification(
              '🚀 New Order Assigned!',
              `Booking ${o.booking_no} — Deliver to: ${o.delivery_address}`,
              { orderId: o.id },
            );
          }
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
      .eq('rider_id', user.id)
      .in('status', [ORDER_STATUS.ASSIGNED, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.PICKED_UP])
      .order('created_at', { ascending: false });

    if (!error && data) {
      prevOrderIdsRef.current = new Set(data.map((o) => o.id));
      setOrders(data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) Alert.alert('Update Failed', error.message);
    setUpdating(null);
    fetchOrders();
  };

  const handleAccept = (order) => {
    Alert.alert(
      'Accept Order',
      `Accept booking ${order.booking_no} and mark as In Transit?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept', onPress: () => updateOrderStatus(order.id, ORDER_STATUS.IN_TRANSIT) },
      ],
    );
  };

  const handleDeliver = (order) => {
    Alert.alert(
      'Complete Delivery',
      `Mark ${order.booking_no} as Delivered?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delivered ✓', onPress: () => updateOrderStatus(order.id, ORDER_STATUS.DELIVERED) },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading orders…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.topBar}>
        <Text style={styles.title}>My Orders</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{orders.length} Active</Text>
        </View>
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
            <Ionicons name="bicycle-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Active Orders</Text>
            <Text style={styles.emptySub}>
              New orders assigned by the teller will appear here in real time.
            </Text>
          </View>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              updating={updating === order.id}
              onAccept={() => handleAccept(order)}
              onDeliver={() => handleDeliver(order)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function OrderCard({ order, updating, onAccept, onDeliver }) {
  const isAssigned  = order.status === ORDER_STATUS.ASSIGNED;
  const isInTransit = order.status === ORDER_STATUS.IN_TRANSIT || order.status === ORDER_STATUS.PICKED_UP;

  return (
    <View style={styles.card}>
      {/* ── Top strip ── */}
      <View style={styles.cardTopStrip}>
        <Text style={styles.bookingNo}>{order.booking_no}</Text>
        <StatusPill status={order.status} />
      </View>

      {/* ── Customer ── */}
      <InfoRow icon="person-outline" label="Customer" value={order.customer_name} />
      {order.customer_phone && (
        <InfoRow icon="call-outline" label="Contact" value={order.customer_phone} />
      )}

      {/* ── Delivery address ── */}
      <InfoRow icon="location-outline" label="Deliver To" value={order.delivery_address} />

      {/* ── Merchant ── */}
      {order.merchant_name && (
        <InfoRow icon="storefront-outline" label="Pickup From" value={order.merchant_name} />
      )}

      {/* ── Items ── */}
      {order.items && Array.isArray(order.items) && order.items.length > 0 && (
        <View style={styles.itemsWrap}>
          <Text style={styles.itemsLabel}>Order Items</Text>
          {order.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.qty}× {item.name}</Text>
              <Text style={styles.itemPrice}>₱{(item.qty * item.price).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{Number(order.final_total || 0).toFixed(2)}</Text>
          </View>
        </View>
      )}

      {/* ── Action buttons ── */}
      <View style={styles.actionRow}>
        {isAssigned && (
          <TouchableOpacity
            style={[styles.btn, styles.btnAccept]}
            onPress={onAccept}
            disabled={updating}
            activeOpacity={0.8}
          >
            {updating
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={styles.btnText}>Accept & Start</Text></>
            }
          </TouchableOpacity>
        )}

        {isInTransit && (
          <TouchableOpacity
            style={[styles.btn, styles.btnDeliver]}
            onPress={onDeliver}
            disabled={updating}
            activeOpacity={0.8}
          >
            {updating
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="flag" size={18} color="#fff" /><Text style={styles.btnText}>Mark Delivered</Text></>
            }
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={14} color={COLORS.textMuted} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function StatusPill({ status }) {
  const map = {
    assigned:    { color: COLORS.warning, label: 'ASSIGNED' },
    'in-transit':{ color: COLORS.info,    label: 'IN TRANSIT' },
    'picked-up': { color: COLORS.primary, label: 'PICKED UP' },
    delivered:   { color: COLORS.accent,  label: 'DELIVERED' },
    cancelled:   { color: COLORS.danger,  label: 'CANCELLED' },
  };
  const cfg = map[status] || { color: COLORS.textMuted, label: status?.toUpperCase() };
  return (
    <View style={[styles.pill, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '44' }]}>
      <Text style={[styles.pillText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 40 },

  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 },
  title:        { fontSize: 24, fontWeight: '800', color: COLORS.text },
  countBadge:   { backgroundColor: COLORS.primaryDim, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  countText:    { color: COLORS.primary, fontSize: 12, fontWeight: '700' },

  emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMuted },
  emptySub:   { fontSize: 13, color: COLORS.textDim, textAlign: 'center', maxWidth: 260, lineHeight: 20 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 14, gap: 10,
  },
  cardTopStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingNo:    { fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: 'monospace' },
  pill:         { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  pillText:     { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  infoRow:   { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.3 },
  infoValue: { fontSize: 13, color: COLORS.text, fontWeight: '500' },

  itemsWrap:  { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, gap: 6 },
  itemsLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  itemRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  itemName:   { fontSize: 13, color: COLORS.text },
  itemPrice:  { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, marginTop: 4 },
  totalLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  totalValue: { fontSize: 15, color: COLORS.primary, fontWeight: '800' },

  actionRow:   { flexDirection: 'row', gap: 10 },
  btn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 13 },
  btnText:     { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnAccept:   { backgroundColor: COLORS.accent },
  btnDeliver:  { backgroundColor: COLORS.info },
});
