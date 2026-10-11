import 'react-native-url-polyfill/auto';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './shared/AuthContext';
import AuthStack    from './navigation/AuthStack';
import RiderStack   from './navigation/RiderStack';
import MerchantStack from './navigation/MerchantStack';
import ClientStack   from './navigation/ClientStack';
import { COLORS } from './shared/constants';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg || '#FFFFFF', padding: 24, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.danger || '#E53E3E', marginBottom: 12 }}>
            App Encountered an Error
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.textMuted || '#4A5568', textAlign: 'center', marginBottom: 20 }}>
            {this.state.error?.message || String(this.state.error)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

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
  if (role === 'merchant') return <MerchantStack />;
  if (role === 'client') return <ClientStack />;
  return <AuthStack />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="dark" backgroundColor={COLORS.bg} />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
