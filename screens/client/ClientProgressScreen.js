import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { supabase } from '../../shared/supabase';
import { useAuth } from '../../shared/AuthContext';
import { COLORS } from '../../shared/constants';
import { Ionicons } from '@expo/vector-icons';

export default function ClientProgressScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();

    const subscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `client_id=eq.${user.id}` }, payload => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.warn('Error fetching orders:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const cancelOrder = async (id) => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id);
        if (error) Alert.alert('Error', error.message);
        else fetchOrders();
      }}
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return COLORS.textDim;
      case 'assigned': return COLORS.info;
      case 'preparing': return COLORS.warning;
      case 'in-transit': return COLORS.primary;
      case 'delivered': return COLORS.success;
      case 'cancelled': return COLORS.danger;
      default: return COLORS.textDim;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchOrders} />}
      >
        {orders.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 100 }}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.border} />
            <Text style={{ color: COLORS.textDim, marginTop: 16 }}>You have no orders yet.</Text>
          </View>
        ) : (
          orders.map(order => (
            <View key={order.id} style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 16 }}>{order.merchant_name}</Text>
                <View style={{ backgroundColor: getStatusColor(order.status) + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: getStatusColor(order.status), fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>{order.status}</Text>
                </View>
              </View>
              
              <Text style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 8 }}>Order #{order.booking_no}</Text>
              
              <View style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 12 }}>
                {(order.items || []).map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: COLORS.text, fontSize: 13 }}>{item.qty}x {item.name}</Text>
                    <Text style={{ color: COLORS.text, fontSize: 13 }}>₱{Number(item.total).toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>Total: ₱{Number(order.final_total).toFixed(2)}</Text>
                {order.status === 'pending' && (
                  <TouchableOpacity 
                    onPress={() => cancelOrder(order.id)}
                    style={{ backgroundColor: COLORS.danger + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                  >
                    <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: 'bold' }}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
