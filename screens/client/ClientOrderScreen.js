import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { supabase } from '../../shared/supabase';
import { useAuth } from '../../shared/AuthContext';
import { COLORS } from '../../shared/constants';
import { Ionicons } from '@expo/vector-icons';

export default function ClientOrderScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);

  // Data
  const [merchants, setMerchants] = useState([]);
  const [deliveryRates, setDeliveryRates] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  // Form State
  const [merchantId, setMerchantId] = useState('');
  const [address, setAddress] = useState(user?.address || '');
  const [landmark, setLandmark] = useState(user?.landmark || '');
  const [items, setItems] = useState([]); // {id, name, price, qty}
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loyaltyCount, setLoyaltyCount] = useState(0);

  // Manual Entry State
  const [isManualMerchant, setIsManualMerchant] = useState(false);
  const [customMerchantName, setCustomMerchantName] = useState('');
  const [manualItemName, setManualItemName] = useState('');

  // UI State
  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [filteredRates, setFilteredRates] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch Merchants
      const { data: mData } = await supabase.from('merchants').select('*');
      if (mData) {
        setMerchants([...mData, { id: 'custom', name: 'Please specify', category: 'Manual Entry' }]);
      }

      // Fetch Rates
      const { data: rData } = await supabase.from('delivery_rates').select('*');
      if (rData) {
        setDeliveryRates(rData);
        // Try to auto-set delivery fee based on user's address
        const match = rData.find(r => r.location.toLowerCase() === user?.address?.toLowerCase());
        if (match) setDeliveryFee(Number(match.fee));
      }

      // Fetch Loyalty Count
      const { data: clientData } = await supabase.from('clients').select('loyalty_count').eq('id', user.id).single();
      if (clientData) {
        setLoyaltyCount(clientData.loyalty_count || 0);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const selectMerchant = async (id) => {
    setMerchantId(id);
    setShowMerchantModal(false);
    setItems([]); // reset cart if merchant changes
    
    if (id === 'custom') {
      setIsManualMerchant(true);
      setMenuItems([]);
    } else {
      setIsManualMerchant(false);
      setCustomMerchantName('');
      // Fetch menu
      const { data } = await supabase.from('menu_items').select('*').eq('merchant_id', id).eq('is_available', true);
      if (data) setMenuItems(data);
    }
  };

  const addManualItem = () => {
    if (!manualItemName) {
      Alert.alert('Error', 'Please enter item name.');
      return;
    }
    const newItem = {
      id: `manual-${Date.now()}`,
      name: manualItemName,
      price: 0,
      qty: 1,
      is_manual: true
    };
    setItems([...items, newItem]);
    setManualItemName('');
  };

  const handleAddressChange = (text) => {
    setAddress(text);
    if (text.length > 0) {
      const matches = deliveryRates.filter(r => r.location.toLowerCase().includes(text.toLowerCase()));
      setFilteredRates(matches);
      setShowAddressDropdown(true);
    } else {
      setShowAddressDropdown(false);
    }
  };

  const selectRate = (rate) => {
    setAddress(rate.location);
    setDeliveryFee(Number(rate.fee));
    setShowAddressDropdown(false);
  };

  const addItemToCart = (menuItem) => {
    const existing = items.find(i => i.id === menuItem.id);
    if (existing) {
      setItems(items.map(i => i.id === menuItem.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setItems([...items, { id: menuItem.id, name: menuItem.name, price: Number(menuItem.price), qty: 1 }]);
    }
  };

  const updateItemQty = (id, delta) => {
    setItems(items.map(i => {
      if (i.id === id) {
        const newQty = i.qty + delta;
        return { ...i, qty: newQty > 0 ? newQty : 1 };
      }
      return i;
    }));
  };

  const removeItem = (id) => {
    setItems(items.filter(i => i.id !== id));
  };

  const subtotal = items.reduce((acc, i) => acc + (i.price * i.qty), 0);
  const actualDeliveryFee = loyaltyCount >= 10 ? 0 : deliveryFee;
  const grandTotal = subtotal + actualDeliveryFee;

  const handleCheckout = async () => {
    if (!merchantId) return Alert.alert('Error', 'Please select a merchant.');
    if (isManualMerchant && !customMerchantName) return Alert.alert('Error', 'Please specify the merchant name.');
    if (items.length === 0) return Alert.alert('Error', 'Your cart is empty.');
    if (!address) return Alert.alert('Error', 'Please enter a delivery address.');

    setLoading(true);
    try {
      const selectedMerchant = merchants.find(m => m.id === merchantId);

      const orderData = {
        booking_no: `PABILI-${Math.floor(10000 + Math.random() * 90000)}`,
        service_type: 'pabili',
        client_id: user.id,
        customer_name: user.full_name,
        customer_phone: user.phone,
        merchant_id: isManualMerchant ? null : merchantId,
        merchant_name: isManualMerchant ? customMerchantName : (selectedMerchant?.name || 'Generic Merchant'),
        delivery_address: address,
        landmark: landmark,
        items: items.map(i => ({ ...i, total: i.qty * i.price })),
        status: 'pending',
        subtotal: subtotal,
        delivery_fee: actualDeliveryFee,
        final_total: grandTotal,
      };

      const { error } = await supabase.from('orders').insert(orderData);
      if (error) throw error;

      // Update Loyalty Count
      const isFreeOrder = loyaltyCount >= 10;
      const newLoyaltyCount = isFreeOrder ? 0 : loyaltyCount + 1;

      const { error: updateError } = await supabase
        .from('clients')
        .update({ loyalty_count: newLoyaltyCount })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state & context
      updateUser({ loyalty_count: newLoyaltyCount });
      setLoyaltyCount(newLoyaltyCount);

      Alert.alert('Success', 'Your order has been placed!');
      setItems([]);
      navigation.navigate('Progress'); // Go to Progress tab

    } catch (e) {
      Alert.alert('Order Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.card }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* 1. Merchant Selection */}
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginBottom: 8, marginTop: 10 }}>1. SELECT MERCHANT</Text>
        <TouchableOpacity 
          style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-between' }}
          onPress={() => setShowMerchantModal(true)}
        >
          <Text style={{ color: merchantId ? COLORS.text : COLORS.textDim }}>
            {merchantId ? merchants.find(m => m.id === merchantId)?.name : 'Choose a Merchant...'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.textDim} />
        </TouchableOpacity>

        {isManualMerchant && (
          <TextInput 
            style={{ backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginTop: 10 }} 
            placeholder="Specify Merchant Name (e.g. 7-Eleven, Local Store)" 
            placeholderTextColor={COLORS.textDim}
            value={customMerchantName} 
            onChangeText={setCustomMerchantName} 
          />
        )}

        {/* 2. Menu & Cart */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.text }}>2. ORDER ITEMS</Text>
          {!isManualMerchant && (
            <TouchableOpacity 
              disabled={!merchantId} 
              style={{ backgroundColor: merchantId ? COLORS.primary : COLORS.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              onPress={() => setShowMenuModal(true)}
            >
              <Text style={{ color: merchantId ? '#fff' : COLORS.textDim, fontSize: 12, fontWeight: 'bold' }}>Browse Menu</Text>
            </TouchableOpacity>
          )}
        </View>

        {isManualMerchant && (
          <View style={{ backgroundColor: COLORS.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12, gap: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.textDim }}>Add Custom Item</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput 
                style={{ flex: 1, backgroundColor: COLORS.bg, color: COLORS.text, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: COLORS.border }} 
                placeholder="Item Name (e.g. 1kg Rice, 1 can Sardines)" 
                placeholderTextColor={COLORS.textDim}
                value={manualItemName}
                onChangeText={setManualItemName}
              />
              <TouchableOpacity 
                style={{ backgroundColor: COLORS.primary, width: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
                onPress={addManualItem}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 10, color: COLORS.warning, fontStyle: 'italic' }}>* Rider will input the actual price upon purchase.</Text>
          </View>
        )}

        <View style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }}>
          {items.length === 0 ? (
            <Text style={{ color: COLORS.textDim, textAlign: 'center', py: 10 }}>No items in cart.</Text>
          ) : (
            items.map(item => (
              <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{item.name}</Text>
                  <Text style={{ color: COLORS.primary, fontSize: 12 }}>₱{item.price.toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }}>
                    <TouchableOpacity onPress={() => updateItemQty(item.id, -1)} style={{ padding: 8 }}>
                      <Ionicons name="remove" size={16} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={{ color: COLORS.text, fontWeight: 'bold', width: 20, textAlign: 'center' }}>{item.qty}</Text>
                    <TouchableOpacity onPress={() => updateItemQty(item.id, 1)} style={{ padding: 8 }}>
                      <Ionicons name="add" size={16} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(item.id)}>
                    <Ionicons name="trash" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 3. Delivery Details */}
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginBottom: 8, marginTop: 24 }}>3. DELIVERY DETAILS</Text>
        <View style={{ zIndex: 10 }}>
          <TextInput 
            style={{ backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 }} 
            placeholder="Address (Search Location)" 
            placeholderTextColor={COLORS.textDim}
            value={address} 
            onChangeText={handleAddressChange} 
          />
          {showAddressDropdown && filteredRates.length > 0 && (
            <View style={{ backgroundColor: COLORS.surface, borderRadius: 8, marginTop: -5, marginBottom: 10, maxHeight: 150, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredRates.map((rate) => (
                  <TouchableOpacity 
                    key={rate.id} 
                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}
                    onPress={() => selectRate(rate)}
                  >
                    <Text style={{ color: COLORS.text, fontSize: 15 }}>{rate.location}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        <TextInput 
          style={{ backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 }} 
          placeholder="Landmark (Optional)" 
          placeholderTextColor={COLORS.textDim}
          value={landmark} 
          onChangeText={setLandmark} 
        />

        {/* Checkout Summary */}
        <View style={{ backgroundColor: COLORS.primaryDim, padding: 16, borderRadius: 12, marginTop: 16, marginBottom: 40 }}>
          {loyaltyCount >= 10 && (
            <View style={{ backgroundColor: COLORS.primary, padding: 8, borderRadius: 8, marginBottom: 12 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 12 }}>🎉 Loyalty Reward: Free Delivery! 🎉</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: COLORS.text }}>Subtotal</Text>
            <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>₱{subtotal.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: COLORS.text }}>Delivery Fee</Text>
            <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>
              {loyaltyCount >= 10 ? <Text style={{ textDecorationLine: 'line-through', color: COLORS.textDim }}>₱{deliveryFee.toFixed(2)}</Text> : `₱${deliveryFee.toFixed(2)}`}
              {loyaltyCount >= 10 && ' ₱0.00'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 }}>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold' }}>Total</Text>
            <Text style={{ color: COLORS.primary, fontSize: 18, fontWeight: '900' }}>₱{grandTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity 
            style={{ backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16, opacity: loading ? 0.7 : 1 }}
            onPress={handleCheckout}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }}>CONFIRM ORDER</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Merchant Selection Modal */}
      <Modal visible={showMerchantModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '70%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 }}>Select a Merchant</Text>
            <ScrollView>
              {merchants.map(m => (
                <TouchableOpacity 
                  key={m.id} 
                  style={{ padding: 16, backgroundColor: COLORS.surface, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border }}
                  onPress={() => selectMerchant(m.id)}
                >
                  <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>{m.name}</Text>
                  {m.category && <Text style={{ color: COLORS.textDim, fontSize: 12 }}>{m.category}</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={{ marginTop: 16, padding: 16, alignItems: 'center' }} onPress={() => setShowMerchantModal(false)}>
              <Text style={{ color: COLORS.danger, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Menu Modal */}
      <Modal visible={showMenuModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '85%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.text }}>Menu</Text>
              <TouchableOpacity onPress={() => setShowMenuModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {menuItems.length === 0 ? (
                <Text style={{ color: COLORS.textDim, textAlign: 'center', marginTop: 40 }}>No menu items found.</Text>
              ) : (
                menuItems.map(item => (
                  <View key={item.id} style={{ flexDirection: 'row', padding: 16, backgroundColor: COLORS.surface, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
                      {item.description && <Text style={{ color: COLORS.textDim, fontSize: 12 }} numberOfLines={2}>{item.description}</Text>}
                      <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: 'bold', marginTop: 4 }}>₱{Number(item.price).toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity 
                      style={{ backgroundColor: COLORS.primaryDim, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
                      onPress={() => { addItemToCart(item); Alert.alert('Added', `${item.name} added to cart!`); }}
                    >
                      <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 12 }}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}
