import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { UserRegistrationContext } from "../context/UserRegistrationContext";
import Popup from "./Popup";
import AsyncStorage from '@react-native-async-storage/async-storage';

const SignupForm = () => {
  const navigation = useNavigation();
  const { userData, setUserData } = useContext(UserRegistrationContext);

  // Local state for form validation and loading
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [popupMessage, setPopupMessage] = useState(""); // Popup message state
  const [isPopupVisible, setIsPopupVisible] = useState(false); // Popup visibility state

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email change
  const handleEmailChange = (email) => {
    setUserData({ ...userData, email });
    if (emailError) setEmailError(""); // Clear error on input
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
        const response = await fetch("http://10.11.18.3:3000/api/auth/save-user-details", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                step: 1,
                data: { email },
            }),
        });

        const result = await response.json();
        console.log("Response Result:", result);

        if (response.ok && result.result && result.result[0]?.user_id) {
            const userId = result.result[0].user_id;
            console.log("Navigating with userId:", userId);
            
            // Save userId to AsyncStorage
            try {
                await AsyncStorage.setItem('userId', userId.toString());
                console.log("Successfully saved userId to AsyncStorage:", userId);
            } catch (storageError) {
                console.error("Error saving to AsyncStorage:", storageError);
                setPopupMessage("Error saving user data. Please try again.");
                setIsPopupVisible(true);
                return;
            }

            navigation.navigate("Register2", { userId });
        } else {
            setPopupMessage(result.message || "Unable to retrieve userId.");
            setIsPopupVisible(true);
        }
    } catch (err) {
        console.error("Network error:", err);
        setPopupMessage("Unable to save details. Please try again later.");
        setIsPopupVisible(true);
    } finally {
        setIsLoading(false);
    }
};


  return (
    <View style={styles.container}>
      {/* Popup Component */}
      {isPopupVisible && (
        <Popup
          message={popupMessage}
          onClose={() => setIsPopupVisible(false)} // Close popup when dismissed
        />
      )}

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={isLoading}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* Create Account Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Create account</Text>
      </View>

      {/* Email Section */}
      <View style={styles.emailSection}>
        <Text style={styles.emailTitle}>What's your email?</Text>

        {/* Email Input */}
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

        {/* Error or Helper Text */}
        {emailError ? (
          <Text style={styles.errorText}>{emailError}</Text>
        ) : (
          <Text style={styles.helperText}>You'll need to confirm this email later.</Text>
        )}
      </View>

      {/* Server Error Message */}
      {serverError ? <Text style={styles.errorText}>{serverError}</Text> : null}

      {/* Next Button */}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 32,
  },
  backButton: {
    position: "absolute",
    left: 28,
    top: 86,
  },
  backButtonText: {
    fontSize: 32,
    color: "#000",
  },
  header: {
    marginTop: 94,
    alignItems: "center",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0a0a0a",
  },
  emailSection: {
    marginTop: 49,
  },
  emailTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    height: 51,
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputError: {
    borderColor: "#ff0000",
    backgroundColor: "#fff0f0",
  },
  helperText: {
    fontSize: 8,
    color: "#040404",
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#ff0000",
    marginTop: 8,
  },
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
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 15,
  },
});

export default SignupForm;
