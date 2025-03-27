import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Popup from "./Popup";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";
import { NGROK_URL } from '@env';

const LoginScreen = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const navigation = useNavigation();

  const openGoogleLogin = () => {
    Linking.openURL("https://accounts.google.com/ServiceLogin");
  };

  const openAppleLogin = () => {
    Linking.openURL("https://appleid.apple.com/account");
  };

  const validateInput = () => {
    return usernameOrEmail !== "" && password !== "";
  };

  const handleLogin = async () => {
    console.log("Starting login, NGROK_URL:", NGROK_URL);
    if (!validateInput()) {
      setPopupMessage("Please enter both username/email and password.");
      setIsPopupVisible(true);
      return;
    }

    setIsLoading(true);
    setServerError("");

    const isEmail = usernameOrEmail.includes("@");
    const payload = {
      [isEmail ? "email" : "username"]: usernameOrEmail,
      password,
    };
    console.log("Sending request with:", payload);

    try {
      const response = await fetch(`${NGROK_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawResponse = await response.text();
      console.log("Raw server response:", rawResponse);

      let result;
      try {
        result = JSON.parse(rawResponse);
      } catch (jsonError) {
        console.error("JSON parsing error:", jsonError);
        throw new Error("Server response is not valid JSON: " + rawResponse.substring(0, 100));
      }

      console.log("Parsed response:", { status: response.status, result });

      if (response.ok) {
        if (result.token) {
          console.log("Token received:", result.token);
          await AsyncStorage.setItem("token", result.token);
          navigation.replace("Main");
        } else {
          console.log("No token received.");
          setPopupMessage("Login failed: No token received.");
          setIsPopupVisible(true);
        }
      } else {
        console.log("Login failed:", result.message);
        setPopupMessage(result.message || "Login failed. Please try again.");
        setIsPopupVisible(true);
      }
    } catch (err) {
      console.error("Login error:", err);
      setPopupMessage(err.message || "Network error. Please try again later.");
      setIsPopupVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            {isPopupVisible && (
              <Popup
                message={popupMessage}
                onClose={() => setIsPopupVisible(false)}
              />
            )}

            <Text style={styles.title}>Pitch</Text>
            <Text style={styles.subtitle}>Login or sign up for free.</Text>

            <TextInput
              placeholder="Email or Username"
              style={styles.input}
              placeholderTextColor="#aaa"
              value={usernameOrEmail}
              onChangeText={setUsernameOrEmail}
            />
            <TextInput
              placeholder="Password"
              style={styles.input}
              placeholderTextColor="#aaa"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {serverError ? (
              <Text style={styles.errorText}>{serverError}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.continueButton,
                isLoading ? styles.buttonDisabled : null,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.continueButtonText}>CONTINUE</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.orText}>or use</Text>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={openGoogleLogin}
            >
              <FontAwesome name="google" size={20} color="#ffffff" />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.appleButton} onPress={openAppleLogin}>
              <FontAwesome name="apple" size={20} color="#ffffff" />
              <Text style={styles.appleButtonText}>Sign in with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate("Register1")}
            >
              <Text style={styles.registerLinkText}>New user? Register here</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20, // Consistent padding, SafeAreaView handles top/bottom insets
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 30,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  continueButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#007BFF",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 5,
    marginBottom: 20,
  },
  continueButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  orText: {
    marginVertical: 10,
    color: "#888",
    fontSize: 14,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginBottom: 20,
    backgroundColor: "#DB4437",
  },
  googleButtonText: {
    marginLeft: 10,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ffffff", // Fixed typo from "#fffff"
    borderRadius: 5,
    marginBottom: 20,
    backgroundColor: "#000000",
  },
  appleButtonText: {
    marginLeft: 10,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  registerLink: {
    marginTop: 20,
  },
  registerLinkText: {
    fontSize: 14,
    color: "#007BFF",
    textDecorationLine: "underline",
  },
  errorText: {
    fontSize: 14,
    color: "#ff0000",
    marginBottom: 10,
  },
});

export default LoginScreen;