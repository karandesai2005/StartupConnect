import React, { useState } from "react";
import { Text, StyleSheet, View, Pressable, FlatList, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native"; // Added useRoute
import { supabase } from '../services/supabase';

const INTERESTS = [
  "Healthcare & Wellness",
  "Mental Health",
  "Fitness & Nutrition",
  "Biotech",
  "Sustainability & Environment",
  "Renewable Energy",
  "Recycling & Waste Management",
  "Climate Tech",
  "EdTech",
  "Skill-based Learning",
  "Gamified Learning",
  "FinTech",
  "InsurTech",
  "SME Tools",
  "DeFi & Crypto",
  "Smart Cities",
  "Real Estate Tech",
  "Mobility & Transport",
  "FoodTech",
  "Restaurant Tech",
  "Lifestyle Platforms",
  "Entertainment & Media",
  "Creator Economy",
  "Virtual Worlds & Metaverse",
  "Social Impact",
  "Nonprofit Tech",
  "Accessibility Tech",
  "LegalTech",
];

const Signup = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { supabase_uid } = route.params || {};
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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== supabase_uid) {
        Alert.alert("Error", "Session expired. Please restart registration.");
        navigation.navigate("Register1");
        return;
      }

      // Add interests column if it doesn't exist
      const { error } = await supabase.from('users').update({ interests: { data: selectedInterests } }).eq('supabase_uid', user.id);
      if (error) {
        console.error("Database error:", error.message);
        if (error.message.includes("column")) {
          // Attempt to add interests column if missing
          await supabase.rpc('add_interests_column');
          const retryError = await supabase.from('users').update({ interests: { data: selectedInterests } }).eq('supabase_uid', user.id);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      // Navigate to Main with a reset to clear the stack
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main', params: { screen: 'Home' } }],
      });
    } catch (err) {
      console.error("Error completing registration:", err.message);
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