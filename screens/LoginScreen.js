import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
  Modal
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../shared/AuthContext';
import { supabase } from '../shared/supabase';
import { COLORS } from '../shared/constants';
import { registerForPushNotifications, savePushToken } from '../shared/notificationService';

export default function LoginScreen() {
  const { loginRider, loginMerchant } = useAuth();

  const [selectedRole, setSelectedRole] = useState('rider');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── SIGNUP STATES ──
  const [showSignup, setShowSignup] = useState(false);
  const [signupStep, setSignupStep] = useState(1);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [locLoading, setLocLoading] = useState(false);

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
        const token = await registerForPushNotifications();
        if (token) await savePushToken('users', userData.id, token);
      } else {
        userData = await loginMerchant(email.trim(), password);
        const token = await registerForPushNotifications();
        if (token) await savePushToken('merchants', userData.id, token);
      }
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const getLocation = async () => {
    try {
      setLocLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location is required.');
        setLocLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);

      setSignupStep(3);
    } catch (e) {
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setLocLoading(false);
    }
  };

  const handleSignupSubmit = async () => {
    try {
      if (!signupEmail || !signupPassword || !fullName || !phone || !address) {
        Alert.alert('Missing Fields', 'Please fill in all required fields including Email and Password.');
        return;
      }

      setLoading(true);

      const { error } = await supabase.auth.signUp({
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        options: {
          data: {
            role: 'client',
            full_name: fullName,
            contact_no: phone,
            address: address,
            landmark: landmark,
            latitude: lat,
            longitude: lng
          }
        }
      });

      if (error) {
        Alert.alert('Signup Failed', error.message);
        setLoading(false);
        return;
      }

      Alert.alert('Success', 'Customer registered successfully');

      setShowSignup(false);
      setSignupStep(1);

      setFullName('');
      setPhone('');
      setAddress('');
      setLandmark('');
      setLat(null);
      setLng(null);
      setSignupEmail('');
      setSignupPassword('');

    } catch (e) {
      Alert.alert('Error', e.message || 'Signup failed');
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
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textDim}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* LOGIN BUTTON */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={styles.loginBtnText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          {/* CUSTOMER SIGNUP LINK */}
          <TouchableOpacity onPress={() => setShowSignup(true)}>
            <Text style={styles.signupLink}>Customer Sign-up</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>LODS Terminal Companion  •  v1.0</Text>

        {/* ───────────────── MODAL ───────────────── */}
        <Modal visible={showSignup} animationType="slide">
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60 }}>

            <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 20 }}>
              Customer Signup
            </Text>

            {signupStep === 1 && (
              <>
                <TextInput style={{backgroundColor: '#fff', color: '#000', borderRadius: 8, padding: 12, marginBottom: 10}} placeholder="Email" value={signupEmail} onChangeText={setSignupEmail} autoCapitalize="none" keyboardType="email-address" />
                <TextInput style={{backgroundColor: '#fff', color: '#000', borderRadius: 8, padding: 12, marginBottom: 10}} placeholder="Password" value={signupPassword} onChangeText={setSignupPassword} secureTextEntry />
                <TextInput style={{backgroundColor: '#fff', color: '#000', borderRadius: 8, padding: 12, marginBottom: 10}} placeholder="Full Name" value={fullName} onChangeText={setFullName} />
                <TextInput style={{backgroundColor: '#fff', color: '#000', borderRadius: 8, padding: 12, marginBottom: 10}} placeholder="Contact Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <TextInput style={{backgroundColor: '#fff', color: '#000', borderRadius: 8, padding: 12, marginBottom: 10}} placeholder="Address" value={address} onChangeText={setAddress} />
                <TextInput style={{backgroundColor: '#fff', color: '#000', borderRadius: 8, padding: 12, marginBottom: 10}} placeholder="Landmark (Optional)" value={landmark} onChangeText={setLandmark} />

                <TouchableOpacity style={styles.loginBtn} onPress={() => setSignupStep(2)}>
                  <Text style={styles.loginBtnText}>Next</Text>
                </TouchableOpacity>
              </>
            )}

            {signupStep === 2 && (
              <>
                <Text style={{ marginBottom: 20 }}>Auto-detect location</Text>

                <TouchableOpacity style={styles.loginBtn} onPress={getLocation}>
                  {locLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Get Location</Text>}
                </TouchableOpacity>
              </>
            )}

            {signupStep === 3 && (
              <>
                <Text>Latitude: {lat}</Text>
                <Text>Longitude: {lng}</Text>

                <TouchableOpacity style={styles.loginBtn} onPress={handleSignupSubmit}>
                  <Text style={styles.loginBtnText}>Create Account</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => setShowSignup(false)}>
              <Text style={{ textAlign: 'center', marginTop: 20 }}>Close</Text>
            </TouchableOpacity>

          </ScrollView>
        </Modal>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 36 },
  logoRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 2, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  appName: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  tagline: { fontSize: 12, color: COLORS.textMuted },

  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%' },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  roleBtnActive: { backgroundColor: COLORS.primary },
  roleBtnText: { color: COLORS.textMuted, fontWeight: '600' },
  roleBtnTextActive: { color: COLORS.bg },

  card: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6, fontWeight: '600' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 52,
  },

  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#000', fontSize: 15 },

  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },

  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  signupLink: {
    marginTop: 12,
    textAlign: 'center',
    color: COLORS.primary,
    fontWeight: '600'
  },

  footer: {
    marginTop: 32,
    color: COLORS.textDim,
    fontSize: 11,
    letterSpacing: 0.5
  },
});