import React, { useState, useContext } from "react";
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Popup from "./Popup";
import { supabase } from '../services/supabase';
import { UserRegistrationContext } from "../context/UserRegistrationContext";
import { NGROK_URL } from '@env'; // Import the environment variable

const Register2 = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userData } = useContext(UserRegistrationContext); // For email
  const { supabase_uid, tempPassword } = route.params || {};
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  console.log('Register2 full params:', route.params); // Debug full params
  console.log('NGROK_URL:', NGROK_URL); // Debug the environment variable

  const handleBack = () => {
    navigation.goBack();
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength &&
      hasUppercase &&
      hasLowercase &&
      hasNumber &&
      hasSpecialChar
    );
  };

  const handleNext = async () => {
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (trimmedPassword !== trimmedConfirmPassword) {
      setPopupMessage("Passwords do not match.");
      setPopupVisible(true);
      return;
    }

    if (!validatePassword(trimmedPassword)) {
      setPopupMessage("Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character.");
      setPopupVisible(true);
      return;
    }

    if (!supabase_uid) {
      setPopupMessage("User ID is missing. Please restart registration.");
      setPopupVisible(true);
      return;
    }

    try {
      // Verify current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      if (!user || user.id !== supabase_uid) {
        throw new Error('User session mismatch. Please restart registration.');
      }

      // Update password via save-user-details endpoint
      const backendUrl = new URL('/api/auth/save-user-details', NGROK_URL).href; // Fixed to include /api/auth
      console.log('Attempting fetch to:', backendUrl);
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 2,
          data: {
            supabase_uid: user.id,
            email: userData.email,
            password: trimmedPassword,
          },
        }),
      });
      const result = await response.json();
      console.log('Fetch response:', result);
      if (!response.ok) throw new Error(result.message || "Password update failed");

      navigation.navigate("username", { supabase_uid: user.id });
    } catch (err) {
      console.error("Password update error:", err.message, err);
      setPopupMessage(`Unable to update password: ${err.message}`);
      setPopupVisible(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.signup2}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.contentContainer}>
          <Text style={styles.createAccount}>Create account</Text>
          <Text style={styles.createAPassword}>Create a password</Text>
          <Text style={styles.useAtleast8}>Use at least 8 characters.</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.signup2Child}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              onChangeText={setPassword}
              value={password}
            />
            <TouchableOpacity
              style={styles.toggleVisibility}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.toggleVisibilityText}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.confirmPassword}>Confirm Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.signup2Child}
              placeholder="Confirm your password"
              secureTextEntry={!showConfirmPassword}
              onChangeText={setConfirmPassword}
              value={confirmPassword}
            />
            <TouchableOpacity
              style={styles.toggleVisibility}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.toggleVisibilityText}>
                {showConfirmPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.next}>Next</Text>
          </TouchableOpacity>
        </View>

        <Popup
          visible={popupVisible}
          message={popupMessage}
          onClose={() => setPopupVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  signup2: { flex: 1, width: "100%" },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    paddingTop: 20,
  },
  backButton: { position: "absolute", left: 28, top: 10, zIndex: 1 },
  backButtonText: { fontSize: 32, color: "#000" },
  createAccount: { fontSize: 16, fontWeight: "700", color: "#000", marginBottom: 30 },
  createAPassword: { fontSize: 20, fontWeight: "700", width: "100%", textAlign: "left", marginBottom: 10 },
  confirmPassword: { fontSize: 20, fontWeight: "700", width: "100%", textAlign: "left", marginBottom: 10 },
  useAtleast8: { fontSize: 8, alignSelf: "flex-start", marginBottom: 30 },
  inputContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    marginBottom: 20,
  },
  signup2Child: {
    flex: 1,
    height: 51,
    backgroundColor: "#b7b7b7",
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  toggleVisibility: { position: "absolute", right: 10 },
  toggleVisibilityText: { fontSize: 14, color: "#007AFF" },
  nextButton: {
    backgroundColor: "#535353",
    borderRadius: 21,
    width: 82,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  next: { fontSize: 15, color: "#fff" },
});

export default Register2;