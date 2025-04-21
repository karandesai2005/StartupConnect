// screens/Username.js
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
import Popup from "./Popup";
import { supabase } from '../services/supabase';

const Username = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [username, setUsername] = useState("");
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [hasUppercase, setHasUppercase] = useState(false);

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
      const { data, error } = await supabase.from('users').select('username').eq('username', text);
      if (error) throw error;
      setIsUsernameAvailable(data.length === 0);
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
      const { error } = await supabase.from('users').update({ username }).eq('supabase_uid', route.params.supabase_uid);
      if (error) throw error;
      navigation.navigate("preference", { supabase_uid: route.params.supabase_uid });
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