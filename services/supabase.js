import { createClient } from '@supabase/supabase-js';
import { WebSocket } from 'react-native'; // Import WebSocket from react-native

const supabaseUrl = 'https://audurwojdksjrfcjdzuh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZHVyd29qZGtzanJmY2pkenVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyODU2NTUsImV4cCI6MjA1OTg2MTY1NX0.0whgDJNjGvLyBiN-P_l4FP5ptjPRzkdZjiGaPinr8c4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enables session persistence across app restarts
    autoRefreshToken: true, // Automatically refreshes the token when it nears expiration
    detectSessionInUrl: false, // Set to false for React Native unless using deep linking
  },
  realtime: {
    params: {
      WebSocket: WebSocket, // Use the imported WebSocket
    },
  },
});