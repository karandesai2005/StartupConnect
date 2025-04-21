// screens/Register1.js
import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { UserRegistrationContext } from "../context/UserRegistrationContext";
import Popup from "./Popup";
import { supabase } from '../services/supabase';

console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'Not loaded');
console.log('SUPABASE_ANON_KEY value:', process.env.SUPABASE_ANON_KEY || 'Not loaded');
console.log('Supabase client initialized:', !!supabase);

const Register1 = () => {
  const navigation = useNavigation();
  const { userData, setUserData } = useContext(UserRegistrationContext);

  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (email) => {
    setUserData({ ...userData, email });
    if (emailError) setEmailError("");
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = async () => {
    const { email } = userData;

    if (!validateEmail(email)) {
      setEmailError("Invalid email format");
      return;
    }

    setIsLoading(true);
    setServerError("");

    try {
      const tempPassword = Math.random().toString(36).slice(-8);
      console.log('Generated tempPassword:', tempPassword);
      const { data, error } = await supabase.auth.signUp({ email, password: tempPassword });
      if (error) {
        if (error.message.includes('rate limit exceeded')) {
          throw new Error('Email rate limit exceeded. Please use a different email or wait.');
        }
        throw error;
      }

      if (data.user) {
        setUserData({ ...userData, supabase_uid: data.user.id, tempPassword });
        const params = { supabase_uid: data.user.id, tempPassword };
        console.log('Navigating with params:', params);
        navigation.navigate("Register2", params);
      } else {
        setPopupMessage("Please check your email for verification. A temporary password was set.");
        setIsPopupVisible(true);
      }
    } catch (err) {
      console.error("Network error:", err.message, err);
      setPopupMessage(err.message);
      setIsPopupVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        {isPopupVisible && (
          <Popup
            message={popupMessage}
            onClose={() => setIsPopupVisible(false)}
          />
        )}

        <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={isLoading}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerText}>Create account</Text>
        </View>

        <View style={styles.emailSection}>
          <Text style={styles.emailTitle}>What's your email?</Text>

          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            value={userData.email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Enter your email"
            placeholderTextColor="#757575"
            editable={!isLoading}
          />

          {emailError ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : (
            <Text style={styles.helperText}>You'll need to confirm this email later.</Text>
          )}
        </View>

        {serverError ? <Text style={styles.errorText}>{serverError}</Text> : null}

        <TouchableOpacity
          style={[styles.nextButton, isLoading ? styles.nextButtonDisabled : null]}
          onPress={handleNext}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.nextButtonText}>Next</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, paddingHorizontal: 32 },
  backButton: { position: "absolute", left: 28, top: 46, zIndex: 1 },
  backButtonText: { fontSize: 32, color: "#000" },
  header: { marginTop: 54, alignItems: "center" },
  headerText: { fontSize: 16, fontWeight: "700", color: "#0a0a0a" },
  emailSection: { marginTop: 49 },
  emailTitle: { fontSize: 20, fontWeight: "700", color: "#000", marginBottom: 16 },
  input: {
    width: "100%",
    height: 51,
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputError: { borderColor: "#ff0000", backgroundColor: "#fff0f0" },
  helperText: { fontSize: 8, color: "#040404", marginTop: 8 },
  errorText: { fontSize: 12, color: "#ff0000", marginTop: 8 },
  nextButton: {
    marginTop: 62,
    backgroundColor: "#535353",
    borderRadius: 21,
    width: 82,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  nextButtonDisabled: { opacity: 0.7 },
  nextButtonText: { color: "#fff", fontSize: 15 },
});

export default Register1;