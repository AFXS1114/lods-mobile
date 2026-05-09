import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../shared/constants';

import MerchantDashboardScreen from '../screens/merchant/MerchantDashboardScreen';
import MerchantMenuScreen      from '../screens/merchant/MerchantMenuScreen';
import MerchantProfileScreen   from '../screens/merchant/MerchantProfileScreen';

const Tab = createMaterialTopTabNavigator();

export default function MerchantStack() {
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={({ route }) => ({
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIndicatorStyle: {
          backgroundColor: COLORS.primary,
          height: 3,
          top: 0,
        },
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'none',
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Dashboard: focused ? 'storefront'   : 'storefront-outline',
            Menu:      focused ? 'restaurant'   : 'restaurant-outline',
            Profile:   focused ? 'business'     : 'business-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
        tabBarShowIcon: true,
      })}
    >
      <Tab.Screen name="Dashboard" component={MerchantDashboardScreen} />
      <Tab.Screen name="Menu"      component={MerchantMenuScreen} />
      <Tab.Screen name="Profile"   component={MerchantProfileScreen} />
    </Tab.Navigator>
  );
}

