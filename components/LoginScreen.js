import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking, 
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const LoginScreen = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigation = useNavigation();

  const handleLogin = () => {
    if (username === "" && password === "") {
      navigation.navigate("Home");
    } else {
      Alert.alert("Error", "Incorrect username or password.");
    }
  };

  const openGoogleLogin = () => {
    Linking.openURL("https://accounts.google.com/ServiceLogin"); 
  };

  const openAppleLogin = () => {
    Linking.openURL("https://appleid.apple.com/account"); 
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pitch</Text>
      <Text style={styles.subtitle}>Login or sign up for free.</Text>

      <TextInput
        placeholder="Email or Username"
        style={styles.input}
        placeholderTextColor="#aaa"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        placeholder="Password"
        style={styles.input}
        placeholderTextColor="#aaa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.continueButton} onPress={handleLogin}>
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>

      <Text style={styles.orText}>or use</Text>

      <TouchableOpacity style={styles.googleButton} onPress={openGoogleLogin}>
        <FontAwesome name="google" size={20} color="#ffffff" />
        <Text style={styles.googleButtonText}>Sign in with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.appleButton} onPress={openAppleLogin}>
        <FontAwesome name="apple" size={20} color="#ffffff" />
        <Text style={styles.appleButtonText}>Sign in with Apple</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  appleButtonText: {
    marginLeft: 10,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
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
    borderColor: "#fffff",
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
});

export default LoginScreen;
