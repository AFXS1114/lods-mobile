import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../shared/supabase';
import { useAuth } from '../../shared/AuthContext';
import { COLORS } from '../../shared/constants';

export default function ClientProfileScreen() {
  const { user, handleSession } = useAuth();
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [landmark, setLandmark] = useState(user?.landmark || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const updateProfile = async () => {
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          full_name: fullName,
          phone: phone,
          address: address,
          landmark: landmark,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      Alert.alert('Success', 'Profile updated successfully!');
      
      // Refresh user context
      const { data: { session } } = await supabase.auth.getSession();
      if (session) handleSession(session);
      
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePassword = async () => {
    if (newPassword !== confirmPassword) {
      return Alert.alert('Error', 'Passwords do not match.');
    }
    if (newPassword.length < 6) {
      return Alert.alert('Error', 'Password must be at least 6 characters.');
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      Alert.alert('Success', 'Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        
        {/* Profile Info Section */}
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 }}>Profile Details</Text>
        <View style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 }}>
          
          <Text style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 4 }}>Full Name</Text>
          <TextInput
            style={{ backgroundColor: COLORS.bg, color: COLORS.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 }}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 4 }}>Phone Number</Text>
          <TextInput
            style={{ backgroundColor: COLORS.bg, color: COLORS.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 }}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 4 }}>Default Address</Text>
          <TextInput
            style={{ backgroundColor: COLORS.bg, color: COLORS.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 }}
            value={address}
            onChangeText={setAddress}
          />

          <Text style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 4 }}>Landmark (Optional)</Text>
          <TextInput
            style={{ backgroundColor: COLORS.bg, color: COLORS.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}
            value={landmark}
            onChangeText={setLandmark}
          />

          <TouchableOpacity
            style={{ backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, alignItems: 'center', opacity: savingProfile ? 0.7 : 1 }}
            onPress={updateProfile}
            disabled={savingProfile}
          >
            {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Profile</Text>}
          </TouchableOpacity>
        </View>

        {/* Security Section */}
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 }}>Security</Text>
        <View style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 40 }}>
          
          <Text style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 4 }}>New Password</Text>
          <TextInput
            style={{ backgroundColor: COLORS.bg, color: COLORS.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 }}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />

          <Text style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 4 }}>Confirm New Password</Text>
          <TextInput
            style={{ backgroundColor: COLORS.bg, color: COLORS.text, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={{ backgroundColor: COLORS.danger, padding: 12, borderRadius: 8, alignItems: 'center', opacity: savingPassword ? 0.7 : 1 }}
            onPress={updatePassword}
            disabled={savingPassword}
          >
            {savingPassword ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Update Password</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}
