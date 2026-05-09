import 'react-native-url-polyfill/auto';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from './shared/AuthContext';
import AuthStack    from './navigation/AuthStack';
import RiderStack   from './navigation/RiderStack';
import MerchantStack from './navigation/MerchantStack';
import { COLORS } from './shared/constants';

function RootNavigator() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) return <AuthStack />;
  if (role === 'rider') return <RiderStack />;
  return <MerchantStack />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={COLORS.bg} />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
