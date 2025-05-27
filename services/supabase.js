import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://audurwojdksjrfcjdzuh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZHVyd29qZGtzanJmY2pkenVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyODU2NTUsImV4cCI6MjA1OTg2MTY1NX0.0whgDJNjGvLyBiN-P_l4FP5ptjPRzkdZjiGaPinr8c4'; // Replace with your Supabase anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enables session persistence across app restarts
    autoRefreshToken: true, // Automatically refreshes the token when it nears expiration
    detectSessionInUrl: true, // Useful for web, optional for native
  },
});