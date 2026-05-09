import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const AuthContext = createContext(null);

const STORAGE_ROLE = 'lods_user_role';
const STORAGE_USER = 'lods_user_data';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);  // rider row from `users` table OR merchant row from `merchants` table
  const [role, setRole]       = useState(null);  // 'rider' | 'merchant'
  const [loading, setLoading] = useState(true);

  // ── Rehydrate session on app start ──────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [storedRole, storedUser] = await Promise.all([
          AsyncStorage.getItem(STORAGE_ROLE),
          AsyncStorage.getItem(STORAGE_USER),
        ]);
        if (storedRole && storedUser) {
          setRole(storedRole);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('[AuthContext] rehydrate error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Rider Login (direct users table lookup) ────────────────
  const loginRider = async (email, password) => {
    const { data: rows, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('password', password)
      .eq('role', 'rider')
      .limit(1);

    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) {
      throw new Error('Invalid email or password for rider account.');
    }

    const riderRow = rows[0];
    await _persistSession(riderRow, 'rider');
    return riderRow;
  };

  // ── Merchant Login (direct merchants table lookup) ───────────
  const loginMerchant = async (email, password) => {
    const { data: rows, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('password', password)
      .limit(1);

    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) {
      throw new Error('Invalid email or password for merchant account.');
    }

    const merchantRow = rows[0];
    await _persistSession(merchantRow, 'merchant');
    return merchantRow;
  };

  // ── Logout ───────────────────────────────────────────────────
  const logout = async () => {
    // Mark rider offline before clearing state
    if (role === 'rider' && user?.id) {
      await supabase.from('users').update({ status: 'offline' }).eq('id', user.id);
    }
    await AsyncStorage.multiRemove([STORAGE_ROLE, STORAGE_USER]);
    setUser(null);
    setRole(null);
  };

  // ── Helpers ──────────────────────────────────────────────────
  const _persistSession = async (userData, userRole) => {
    await AsyncStorage.setItem(STORAGE_ROLE, userRole);
    await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(userData));
    setRole(userRole);
    setUser(userData);
  };

  const updateUser = async (patch) => {
    const updated = { ...user, ...patch };
    await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginRider, loginMerchant, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
