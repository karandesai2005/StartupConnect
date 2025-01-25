import React, { useState } from "react";
import { Text, StyleSheet, View, Pressable, TouchableOpacity, TextInput, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

const Signup = () => {
  const navigation = useNavigation();
  const route = useRoute();  // To access route params (userId)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = async () => {
    // Check if passwords match
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    try {
      const response = await fetch("http://10.11.18.3:3000/api/auth/save-user-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 2,
          data: {
            password: password,
            userId: route.params.userId, // Pass userId from the previous step
          },
        }),
      });

      const result = await response.json();
      console.log(result);

      if (response.ok) {
        navigation.navigate("username", { userId: route.params.userId });
      } else {
        Alert.alert("Error", result.message || "Something went wrong!");
      }
    } catch (err) {
      console.error("Error saving Register2 details:", err.message);
      Alert.alert("Error", "Something went wrong!");
    }
  };

  return (
    <View style={styles.signup2}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <Text style={styles.createAccount}>Create account</Text>
        <Text style={styles.createAPassword}>Create a password</Text>
        <Text style={styles.useAtleast8}>Use at least 8 characters.</Text>

        <TextInput
          style={styles.signup2Child}
          placeholder="Enter your password"
          secureTextEntry={true}
          onChangeText={setPassword}
          value={password}
        />

        <Text style={styles.confirmPassword}>Confirm Password</Text>
        <TextInput
          style={styles.signup2Item}
          placeholder="Confirm your password"
          secureTextEntry={true}
          onChangeText={setConfirmPassword}
          value={confirmPassword}
        />

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.next}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  signup2: {
    backgroundColor: "#fff",
    flex: 1,
    width: "100%",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    paddingTop: 94,
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
    fontFamily: "Avenir Next Cyr",
    fontWeight: "700",
    color: "#000",
    marginBottom: 30,
  },
  createAPassword: {
    fontSize: 20,
    color: "#000",
    fontFamily: "Avenir Next Cyr",
    fontWeight: "700",
    width: "100%",
    textAlign: "left",
    marginBottom: 10,
  },
  useAtleast8: {
    fontSize: 8,
    color: "#000",
    fontFamily: "Avenir Next",
    alignSelf: "flex-start",
    marginBottom: 30,
  },
  signup2Child: {
    height: 51,
    width: "100%",
    backgroundColor: "#b7b7b7",
    borderRadius: 5,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  confirmPassword: {
    fontSize: 20,
    color: "#000",
    fontFamily: "Avenir Next Cyr",
    fontWeight: "700",
    width: "100%",
    textAlign: "left",
    marginBottom: 10,
  },
  signup2Item: {
    height: 51,
    width: "100%",
    backgroundColor: "#b7b7b7",
    borderRadius: 5,
    marginBottom: 30,
    paddingHorizontal: 10,
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
    fontFamily: "Avenir Next",
  },
});

export default Signup;
