import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { UserRegistrationContext } from "../context/UserRegistrationContext";

const OurMission = () => {
  const navigation = useNavigation();
  const { userData, setUserData } = useContext(UserRegistrationContext);
  const [missionError, setMissionError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleMissionChange = (text) => {
    setUserData({ ...userData, mission: text });
    if (missionError) setMissionError("");
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    const { mission } = userData;

    if (!mission || mission.trim().length < 10) {
      setMissionError("Please enter at least 10 characters for your mission statement.");
      return;
    }

    setIsLoading(true);
    // Simulate saving or moving forward (no backend)
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate("NextScreen"); // Replace with your actual next screen
    }, 500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={isLoading}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerText}>Our Mission</Text>
        </View>

        <View style={styles.missionSection}>
          <Text style={styles.missionTitle}>What's your mission?</Text>

          <TextInput
            style={[styles.input, missionError ? styles.inputError : null]}
            value={userData.mission || ""}
            onChangeText={handleMissionChange}
            multiline
            numberOfLines={5}
            placeholder="Write your mission statement..."
            placeholderTextColor="#757575"
            editable={!isLoading}
          />

          {missionError ? (
            <Text style={styles.errorText}>{missionError}</Text>
          ) : (
            <Text style={styles.helperText}>Share your mission statement (min. 10 characters).</Text>
          )}
        </View>

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
  missionSection: { marginTop: 49 },
  missionTitle: { fontSize: 20, fontWeight: "700", color: "#000", marginBottom: 16 },
  input: {
    width: "100%",
    height: 120,
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "transparent",
    textAlignVertical: "top",
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

export default OurMission;