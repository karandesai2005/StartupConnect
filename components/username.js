import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Popup from "./Popup"; // Import the Popup component

const Signup = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [username, setUsername] = useState("");
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null); // Null to handle initial state
  const [showPopup, setShowPopup] = useState(false); // Popup visibility

  const handleBack = () => {
    navigation.goBack();
  };

  const handleUsernameChange = async (text) => {
    const lowercaseUsername = text.toLowerCase(); // Convert to lowercase
    setUsername(lowercaseUsername);
    setIsUsernameAvailable(null); // Reset availability on text change

    // Validate username (API call)
    try {
      const response = await fetch(
        "http://10.11.18.3:3000/api/auth/validate-username",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: lowercaseUsername }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setIsUsernameAvailable(true);
      } else {
        setIsUsernameAvailable(false);
      }
    } catch (error) {
      console.error("Error validating username:", error.message);
      setIsUsernameAvailable(false);
    }
  };

  const handleNext = async () => {
    if (!isUsernameAvailable) {
      setShowPopup(true); // Show popup only on submission
      return;
    }

    try {
      const response = await fetch(
        "http://10.11.18.3:3000/api/auth/save-user-details",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: 3,
            data: {
              username,
              userId: route.params.userId,
            },
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        navigation.navigate("preference", { userId: route.params.userId });
      } else {
        Alert.alert("Error", result.message || "Something went wrong");
      }
    } catch (err) {
      console.error("Error saving username details:", err.message);
      Alert.alert("Error", "Failed to save username details. Please try again.");
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
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.signupItem} onPress={handleNext}>
            <Text style={styles.next}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Popup Component */}
      {showPopup && (
        <Popup
          message="Username already exists. Please choose a different one."
          onClose={() => setShowPopup(false)} // Close the popup
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  signup: {
    backgroundColor: "#fff",
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  backButton: {
    position: "absolute",
    left: 28,
    top: 86,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 32,
    color: "#000",
  },
  createAccount: {
    fontSize: 16,
    color: "#000",
    fontFamily: "Avenir Next Cyr",
    fontWeight: "700",
    marginTop: 50,
  },
  whatsDoYou: {
    fontSize: 20,
    color: "#000",
    fontFamily: "Avenir Next Cyr",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 20,
    maxWidth: 355,
  },
  inputContainer: {
    width: "100%",
    marginTop: 20,
  },
  input: {
    backgroundColor: "#b7b7b7",
    borderRadius: 5,
    width: "100%",
    height: 51,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#000",
  },
  buttonContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  signupItem: {
    borderRadius: 21,
    backgroundColor: "#535353",
    width: 82,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  next: {
    fontSize: 15,
    fontFamily: "Avenir Next",
    color: "#fff",
  },
});

export default Signup;
