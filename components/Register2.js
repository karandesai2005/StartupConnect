import React, { useState } from "react";
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
import { NGROK_URL } from '@env';
import Popup from "./Popup"; // Assuming Popup is in the same directory

const Signup = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

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

    try {
      const response = await fetch(`${NGROK_URL}/api/auth/save-user-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 2,
          data: { password: trimmedPassword, userId: route.params.userId },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        navigation.navigate("username", { userId: route.params.userId });
      } else {
        setPopupMessage(result.message || "Something went wrong!");
        setPopupVisible(true);
      }
    } catch (err) {
      setPopupMessage("Unable to connect to the server. Please try again.");
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

          {/* Password Field */}
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

          {/* Confirm Password Field */}
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
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  signup2: {
    flex: 1,
    width: "100%",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    paddingTop: 54, // Adjusted for SafeAreaView
  },
  backButton: {
    position: "absolute",
    left: 28,
    top: 46, // Adjusted to fit within SafeAreaView
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 32,
    color: "#000",
  },
  createAccount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 30,
  },
  createAPassword: {
    fontSize: 20,
    fontWeight: "700",
    width: "100%",
    textAlign: "left",
    marginBottom: 10,
  },
  confirmPassword: {
    fontSize: 20,
    fontWeight: "700",
    width: "100%",
    textAlign: "left",
    marginBottom: 10,
  },
  useAtleast8: {
    fontSize: 8,
    alignSelf: "flex-start",
    marginBottom: 30,
  },
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
  toggleVisibility: {
    position: "absolute",
    right: 10,
  },
  toggleVisibilityText: {
    fontSize: 14,
    color: "#007AFF",
  },
  nextButton: {
    backgroundColor: "#535353",
    borderRadius: 21,
    width: 82,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  next: {
    fontSize: 15,
    color: "#fff",
  },
  popupContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  popup: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  popupMessage: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default Signup;