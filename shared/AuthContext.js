import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const AuthContext = createContext(null);

const STORAGE_ROLE = 'lods_user_role';
const STORAGE_USER = 'lods_user_data';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);  // rider profile OR merchant profile
  const [role, setRole]       = useState(null);  // 'rider' | 'merchant'
  const [loading, setLoading] = useState(true);

  // ── Rehydrate session on app start & listen to Supabase Auth ──
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // 1. Restore local cache first for instant UI loading
      try {
        const [storedRole, storedUser] = await Promise.all([
          AsyncStorage.getItem(STORAGE_ROLE),
          AsyncStorage.getItem(STORAGE_USER),
        ]);
        if (storedRole && storedUser && mounted) {
          setRole(storedRole);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('[AuthContext] Cache restore error:', e);
      }

      // 2. Fetch active Supabase session
      if (mounted) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (mounted) handleSession(session);
        });
      }
    };

    initAuth();

    // 3. Listen for future auth changes (login/logout events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) handleSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSession = async (session) => {
    if (!session?.user) {
      await AsyncStorage.multiRemove([STORAGE_ROLE, STORAGE_USER]);
      setUser(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const uid = session.user.id;
      
      // Fetch latest profile from DB based on role, fallback to trying both
      const metaRole = session.user.user_metadata?.role;
      
      if (metaRole === 'rider' || !metaRole) {
        const { data: riderProfile } = await supabase.from('users').select('*').eq('id', uid).single();
        if (riderProfile) {
          await _persistSession(riderProfile, 'rider');
          setLoading(false);
          return;
        }
      }

      if (metaRole === 'merchant' || !metaRole) {
        const { data: merchantProfile } = await supabase.from('merchants').select('*').eq('id', uid).single();
        if (merchantProfile) {
          await _persistSession(merchantProfile, 'merchant');
          setLoading(false);
          return;
        }
      }

      // If user exists in Auth but no profile found, sign them out to prevent dead state
      console.warn('[AuthContext] No profile found for authenticated user. Signing out.');
      await supabase.auth.signOut();
    } catch (e) {
      console.error('[AuthContext] Session fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Rider Login ──────────────────────────────────────────────
  const loginRider = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) throw new Error(error.message);

    // Verify they are actually a rider
    const { data: riderProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !riderProfile) {
      await supabase.auth.signOut();
      throw new Error('Invalid email or password for rider account.');
    }

    return riderProfile; // `onAuthStateChange` will handle state persistence
  };

  // ── Merchant Login ───────────────────────────────────────────
  const loginMerchant = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) throw new Error(error.message);

    // Verify they are actually a merchant
    const { data: merchantProfile, error: profileError } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !merchantProfile) {
      await supabase.auth.signOut();
      throw new Error('Invalid email or password for merchant account.');
    }

    return merchantProfile; // `onAuthStateChange` will handle state persistence
  };

  // ── Logout ───────────────────────────────────────────────────
  const logout = async () => {
    // Mark rider offline before logging out
    if (role === 'rider' && user?.id) {
      await supabase.from('users').update({ status: 'offline' }).eq('id', user.id);
    }
    
    await supabase.auth.signOut();
    // `onAuthStateChange` will automatically clear state and storage
  };

  // ── Helpers ──────────────────────────────────────────────────
  const _persistSession = async (userData, userRole) => {
    await AsyncStorage.setItem(STORAGE_ROLE, userRole);
    await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(userData));
    setRole(userRole);
    setUser(userData);
  };

  const updateUser = async (patch) => {
    if (!user) return;
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
