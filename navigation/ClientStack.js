import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../shared/AuthContext';
import { COLORS } from '../shared/constants';

import ClientOrderScreen from '../screens/client/ClientOrderScreen';
import ClientProgressScreen from '../screens/client/ClientProgressScreen';
import ClientProfileScreen from '../screens/client/ClientProfileScreen';

const Tab = createMaterialTopTabNavigator();

export default function ClientStack() {
  const { logout } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', padding: 16, alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <Text style={{ color: COLORS.primary, fontSize: 20, fontWeight: '900', letterSpacing: 1 }}>LODS <Text style={{ color: COLORS.text }}>DELIVERY</Text></Text>
        <TouchableOpacity onPress={logout} style={{ padding: 4 }}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textDim,
          tabBarIndicatorStyle: { backgroundColor: COLORS.primary, height: 3 },
          tabBarStyle: { backgroundColor: COLORS.bg, elevation: 0, shadowOpacity: 0 },
          tabBarLabelStyle: { fontSize: 13, fontWeight: 'bold', textTransform: 'capitalize' }
        }}
      >
        <Tab.Screen 
          name="Order" 
          component={ClientOrderScreen} 
          options={{ title: 'Place Order' }} 
        />
        <Tab.Screen 
          name="Progress" 
          component={ClientProgressScreen} 
          options={{ title: 'My Orders' }} 
        />
        <Tab.Screen 
          name="Profile" 
          component={ClientProfileScreen} 
          options={{ title: 'Profile' }} 
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}
