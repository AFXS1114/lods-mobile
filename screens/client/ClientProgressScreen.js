import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { supabase } from '../../shared/supabase';
import { useAuth } from '../../shared/AuthContext';
import { COLORS } from '../../shared/constants';
import { Ionicons } from '@expo/vector-icons';

export default function ClientProgressScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Rating State
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [serviceRating, setServiceRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

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

  const submitRating = async () => {
    if (serviceRating === 0 || riderRating === 0) {
      Alert.alert('Incomplete', 'Please provide both service and rider ratings.');
      return;
    }

    try {
      setSubmittingRating(true);
      const { error: ratingError } = await supabase.from('ratings').insert({
        order_id: selectedOrder.id,
        client_id: user.id,
        rider_id: selectedOrder.rider_id,
        service_rating: serviceRating,
        rider_rating: riderRating,
        comment: comment
      });

      if (ratingError) throw ratingError;

      const { error: orderError } = await supabase.from('orders').update({ is_rated: true }).eq('id', selectedOrder.id);
      if (orderError) throw orderError;

      Alert.alert('Success', 'Thank you for your feedback!');
      setRatingModalVisible(false);
      setServiceRating(0);
      setRiderRating(0);
      setComment('');
      fetchOrders();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmittingRating(false);
    }
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

                {order.status === 'delivered' && !order.is_rated && (
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedOrder(order);
                      setRatingModalVisible(true);
                    }}
                    style={{ backgroundColor: COLORS.accent + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                  >
                    <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: 'bold' }}>Rate Delivery</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Rating Modal */}
      <Modal visible={ratingModalVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.text }}>Rate Your Experience</Text>
              <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: '600' }}>Overall Service</Text>
              <StarRating rating={serviceRating} setRating={setServiceRating} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: '600' }}>Rider Performance</Text>
              <StarRating rating={riderRating} setRating={setRiderRating} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: '600' }}>Comments (Optional)</Text>
              <TextInput
                style={{ backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, height: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border, color: COLORS.text }}
                placeholder="How was your delivery?"
                placeholderTextColor={COLORS.textDim}
                multiline={true}
                value={comment}
                onChangeText={setComment}
              />
            </View>

            <TouchableOpacity 
              onPress={submitRating}
              disabled={submittingRating}
              style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10 }}
            >
              {submittingRating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Submit Rating</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StarRating({ rating, setRating, size = 32, interactive = true }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity 
          key={s} 
          disabled={!interactive} 
          onPress={() => setRating(s)}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={s <= rating ? 'star' : 'star-outline'} 
            size={size} 
            color={s <= rating ? COLORS.accent : COLORS.border} 
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}
