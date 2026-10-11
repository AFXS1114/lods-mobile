import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expo SDK 50+ automatically exposes EXPO_PUBLIC_ vars from .env / .env.local via process.env
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://awgdvdedjrslcrnlkcft.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3Z2R2ZGVkanJzbGNybmxrY2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMDY0MjAsImV4cCI6MjA5Mzc4MjQyMH0.1UwcFMPhIcO02-mGDn5BbZaBBkvf5w9JRXCtOhY6jAA';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('[Supabase] EXPO_PUBLIC env vars missing from environment, used build fallback.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
