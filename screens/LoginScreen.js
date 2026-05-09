import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../shared/AuthContext';
import { COLORS } from '../shared/constants';
import { registerForPushNotifications, savePushToken } from '../shared/notificationService';

export default function LoginScreen() {
  const { loginRider, loginMerchant } = useAuth();

  const [selectedRole, setSelectedRole] = useState('rider'); // 'rider' | 'merchant'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      let userData;
      if (selectedRole === 'rider') {
        userData = await loginRider(email.trim(), password);
        // Register push token and save to users table
        const token = await registerForPushNotifications();
        if (token) await savePushToken('users', userData.id, token);
      } else {
        userData = await loginMerchant(email.trim(), password);
        const token = await registerForPushNotifications();
        if (token) await savePushToken('merchants', userData.id, token);
      }
      // Navigation is handled by RootNavigator reacting to auth state
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoRing}>
            <Ionicons name="flash" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>LODS Mobile</Text>
          <Text style={styles.tagline}>Logistics Operations Dispatch System</Text>
        </View>

        {/* ── Role Selector ── */}
        <View style={styles.roleRow}>
          {['rider', 'merchant'].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, selectedRole === r && styles.roleBtnActive]}
              onPress={() => setSelectedRole(r)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={r === 'rider' ? 'bicycle' : 'storefront'}
                size={18}
                color={selectedRole === r ? COLORS.bg : COLORS.textMuted}
              />
              <Text style={[styles.roleBtnText, selectedRole === r && styles.roleBtnTextActive]}>
                {r === 'rider' ? 'Rider' : 'Merchant'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Form Card ── */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>
            Sign in as {selectedRole === 'rider' ? 'Rider' : 'Merchant'}
          </Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={COLORS.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textDim}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#fff" />
                  <Text style={styles.loginBtnText}>Sign In</Text>
                </>
              )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>LODS Terminal Companion  •  v1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 36 },
  logoRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 2, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  appName:  { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: 1 },
  tagline:  { fontSize: 12, color: COLORS.textMuted, marginTop: 4, letterSpacing: 0.5 },

  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%' },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  roleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleBtnText:       { color: COLORS.textMuted, fontWeight: '600', fontSize: 14 },
  roleBtnTextActive: { color: COLORS.bg,         fontWeight: '700', fontSize: 14 },

  card: {
    width: '100%', backgroundColor: COLORS.card,
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: COLORS.border,
  },
  formTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 20 },

  fieldGroup: { marginBottom: 16 },
  label:      { fontSize: 12, color: COLORS.textMuted, marginBottom: 6, fontWeight: '600', letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, height: 52,
  },
  inputIcon: { marginRight: 8 },
  input:     { flex: 1, color: COLORS.text, fontSize: 15 },

  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primary,
    borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  footer: { marginTop: 32, color: COLORS.textDim, fontSize: 11, letterSpacing: 0.5 },
});
