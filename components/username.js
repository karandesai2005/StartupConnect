import React, { useState, useEffect } from "react";
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Popup from "./Popup";
import { supabase } from '../services/supabase';
import { NGROK_URL } from '@env';

const Username = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { supabase_uid } = route.params || {};
  const [username, setUsername] = useState("");
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [hasUppercase, setHasUppercase] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('Username.js - Current user:', user, 'Error:', error);
        if (error || !user || user.id !== supabase_uid) {
          console.warn('Session check failed:', error?.message || 'No user or ID mismatch');
          Alert.alert(
            "Session Expired",
            "Your session has expired. Please sign in to continue.",
            [
              {
                text: "OK",
                onPress: () => navigation.navigate("Login"),
              },
            ]
          );
        }
      } catch (err) {
        console.error('Session check error:', err.message);
        Alert.alert("Error", "Failed to verify session. Please try again.");
      }
    };
    if (supabase_uid) {
      checkSession();
    } else {
      console.warn('No supabase_uid provided');
      Alert.alert("Error", "Invalid registration data. Please restart registration.");
      navigation.navigate("Register1");
    }
  }, [navigation, supabase_uid]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleUsernameChange = async (text) => {
    setUsername(text);
    setIsUsernameAvailable(null);
    const containsUppercase = /[A-Z]/.test(text);
    setHasUppercase(containsUppercase);

    if (!text.trim() || text.length < 3 || text.length > 20 || containsUppercase) return;

    setCheckingAvailability(true);

    try {
      const response = await fetch(`${NGROK_URL}/api/auth/validate-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: text }),
      });
      const result = await response.json();
      console.log('Username availability:', result);
      setIsUsernameAvailable(result.available);
    } catch (error) {
      console.error("Error validating username:", error.message);
      setIsUsernameAvailable(false);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleNext = async () => {
    if (checkingAvailability) {
      Alert.alert("Please wait", "Checking username availability...");
      return;
    }

    if (hasUppercase) {
      setShowPopup(true);
      return;
    }

    if (isUsernameAvailable === null) {
      Alert.alert("Error", "Please check username availability first.");
      return;
    }

    if (!isUsernameAvailable) {
      setShowPopup(true);
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('handleNext - Current user:', user, 'Error:', userError);
      if (userError || !user || user.id !== supabase_uid) {
        throw new Error("User not authenticated");
      }

      const backendUrl = `${NGROK_URL}/api/auth/save-user-details`;
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 3,
          data: {
            supabase_uid: user.id,
            username: username,
          },
        }),
      });
      const result = await response.json();
      console.log('Save username response:', result);
      if (!response.ok) {
        console.error("Save username error:", result.message);
        throw new Error(result.message || "Failed to save username");
      }
      navigation.navigate("preference", { supabase_uid: user.id });
    } catch (err) {
      console.error("Error saving username details:", err.message, err);
      Alert.alert(
        "Error",
        err.message.includes("not authenticated")
          ? "Your session has expired. Please sign in to continue."
          : "Failed to save username. Please try again.",
        [
          {
            text: "OK",
            onPress: () =>
              err.message.includes("not authenticated")
                ? navigation.navigate("Login")
                : null,
          },
        ]
      );
    }
  };

  return (
    <View style={styles.signup}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.createAccount}>Create account</Text>
        <Text style={styles.whatsDoYou}>What do you wish for your username?</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            placeholderTextColor="#666"
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {hasUppercase && (
          <Text style={styles.errorText}>Please use lowercase letters only</Text>
        )}
        {isUsernameAvailable === false && !hasUppercase && (
          <Text style={styles.errorText}>Username is already taken</Text>
        )}
        {checkingAvailability && !hasUppercase && (
          <Text style={styles.loadingText}>Checking availability...</Text>
        )}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.signupItem} onPress={handleNext}>
            <Text style={styles.next}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showPopup && (
        <Popup
          message={
            hasUppercase
              ? "Please use lowercase letters only"
              : "Username already exists. Please choose a different one."
          }
          onClose={() => setShowPopup(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  signup: { backgroundColor: "#fff", flex: 1 },
  container: { flex: 1, alignItems: "center", paddingHorizontal: 20, paddingTop: 40 },
  backButton: { position: "absolute", left: 28, top: 86, zIndex: 1 },
  backButtonText: { fontSize: 32, color: "#000" },
  createAccount: { fontSize: 16, color: "#000", fontFamily: "Avenir Next Cyr", fontWeight: "700", marginTop: 50 },
  whatsDoYou: { fontSize: 20, color: "#000", fontFamily: "Avenir Next Cyr", fontWeight: "700", textAlign: "center", marginTop: 20, maxWidth: 355 },
  inputContainer: { width: "100%", marginTop: 20 },
  input: { backgroundColor: "#b7b7b7", borderRadius: 5, width: "100%", height: 51, paddingHorizontal: 15, fontSize: 16, color: "#000" },
  errorText: { color: "red", marginTop: 10, fontSize: 14 },
  loadingText: { color: "#666", marginTop: 10, fontSize: 14 },
  buttonContainer: { marginTop: 30, alignItems: "center" },
  signupItem: { borderRadius: 21, backgroundColor: "#535353", width: 82, height: 42, justifyContent: "center", alignItems: "center" },
  next: { fontSize: 15, fontFamily: "Avenir Next", color: "#fff" },
});

export default Username;