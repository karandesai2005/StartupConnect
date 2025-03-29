import React, { useState } from "react";
import { Text, StyleSheet, View, Pressable, FlatList, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NGROK_URL } from '@env';

const INTERESTS = [
  "AI & Machine Learning", 
  "Data Science", 
  "Web Development", 
  "Mobile Development", 
  "Cybersecurity", 
  "Cloud Computing", 
  "Blockchain", 
  "UX/UI Design", 
  "Digital Marketing", 
  "Robotics", 
  "Gaming"
];

const Signup = () => {
  const navigation = useNavigation();
  const [selectedInterests, setSelectedInterests] = useState([]);

  const toggleInterest = (interest) => {
    setSelectedInterests(current => 
      current.includes(interest)
        ? current.filter(item => item !== interest)
        : [...current, interest].slice(0, 3)
    );
  };

  const handleNext = async () => {
    if (selectedInterests.length < 3) {
      Alert.alert("Error", "Please select at least 3 interests.");
      return;
    }

    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert("Error", "Session expired. Please restart registration.");
        navigation.navigate("Register1");
        return;
      }

      const response = await fetch(`${NGROK_URL}/api/auth/save-user-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 6,
          data: { interests: selectedInterests, userId: parseInt(userId) },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Store the token and user data
        await AsyncStorage.setItem('token', result.token);
        await AsyncStorage.setItem('user', JSON.stringify(result.user));

        // Navigate to dashboard or home screen
        navigation.navigate("Main"); // Replace "Dashboard" with your actual home screen route
      } else {
        Alert.alert("Error", result.message || "Failed to complete registration.");
      }
    } catch (err) {
      console.error("Error completing registration:", err);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const renderInterest = ({ item }) => (
    <Pressable 
      style={[
        styles.fieldContainer, 
        selectedInterests.includes(item) && styles.selectedField
      ]}
      onPress={() => toggleInterest(item)}
    >
      <Text style={styles.fieldText}>{item}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose 3 fields you like</Text>
      
      <FlatList
        data={INTERESTS}
        renderItem={renderInterest}
        keyExtractor={item => item}
        contentContainerStyle={styles.interestsList}
        numColumns={2}
      />

      <Pressable 
        style={[
          styles.nextButton, 
          selectedInterests.length < 3 && styles.disabledButton
        ]}
        onPress={handleNext}
        disabled={selectedInterests.length < 3}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </Pressable>
    </View>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingTop: 67,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 20,
  },
  interestsList: {
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  fieldContainer: {
    margin: 10,
    height: 60,
    width: 150,
    backgroundColor: "#d9d9d9",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedField: {
    backgroundColor: "#4CAF50",
  },
  fieldText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },
  nextButton: {
    backgroundColor: "#535353",
    borderRadius: 21,
    width: 120,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  disabledButton: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    color: "#fff",
  },
});

export default Signup;