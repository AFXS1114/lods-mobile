import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../shared/constants';

import RiderDashboardScreen from '../screens/rider/RiderDashboardScreen';
import RiderOrdersScreen    from '../screens/rider/RiderOrdersScreen';
import RiderProfileScreen   from '../screens/rider/RiderProfileScreen';

const Tab = createMaterialTopTabNavigator();

export default function RiderStack() {
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
            Dashboard: focused ? 'speedometer'   : 'speedometer-outline',
            Orders:    focused ? 'bicycle'       : 'bicycle-outline',
            Profile:   focused ? 'person-circle' : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
        tabBarShowIcon: true,
      })}
    >
      <Tab.Screen name="Dashboard" component={RiderDashboardScreen} />
      <Tab.Screen name="Orders"    component={RiderOrdersScreen} />
      <Tab.Screen name="Profile"   component={RiderProfileScreen} />
    </Tab.Navigator>
  );
}

