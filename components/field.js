import React, { useState } from "react";
import { Text, StyleSheet, View, Pressable, FlatList, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIELDS = [
  "Tech",
  "AI",
  "Sustainability",
  "Finance",
  "Health",
  "Education",
  "Gaming",
  "Rob-linkotics",
  "Marketing",
  "Blockchain",
  "Design",
  "Data Science",
  "Entrepreneurship",
  "Startups",
  "Venture Capital",
  "Business Strategy",
  "Innovation",
  "E-commerce",
  "Social Enterprise",
  "Product Management",
];

const Field = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { supabase_uid } = route.params || {};
  const [selectedFields, setSelectedFields] = useState([]);

  const toggleField = (field) => {
    setSelectedFields(current =>
      current.includes(field)
        ? current.filter(item => item !== field)
        : [...current, field]
    );
  };

  const handleNext = async () => {
    if (selectedFields.length < 3) {
      Alert.alert("Error", "Please select at least 3 fields.");
      return;
    }

    try {
      console.log('Checking session in field.js with supabase_uid:', supabase_uid);
      const { data: { session }, error: authError } = await supabase.auth.refreshSession();
      if (authError || !session || session.user.id !== supabase_uid) {
        console.log('Session invalid or expired:', authError?.message || 'No session after refresh');
        Alert.alert("Error", "Session expired. Restarting registration.");
        navigation.reset({ index: 0, routes: [{ name: 'Register1' }] });
        return;
      }

      console.log('Session valid, updating interests:', selectedFields);
      const { error } = await supabase.from('users').update({ interests: selectedFields }).eq('supabase_uid', session.user.id);
      if (error) {
        console.error("Database error:", error.message, error.details || 'No details');
        throw error;
      }

      await supabase.auth.setSession(session);
      await AsyncStorage.setItem('token', session.access_token);
      console.log('Session persisted and token stored, navigating to Main with Home tab');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main', state: { routes: [{ name: 'Home' }], index: 0 } }],
      });
    } catch (err) {
      console.error("Error completing registration:", err.message, err.stack || 'No stack trace');
      Alert.alert("Error", err.message || "Something went wrong. Please try again.");
    }
  };

  const renderField = ({ item }) => (
    <Pressable
      style={[
        styles.fieldContainer,
        selectedFields.includes(item) && styles.selectedField,
        { transform: [{ scale: selectedFields.includes(item) ? 0.98 : 1 }] }, // Subtle press feedback
      ]}
      onPress={() => toggleField(item)}
    >
      <Text style={styles.fieldText}>{item}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select at least 3 fields</Text>
      <FlatList
        data={FIELDS}
        renderItem={renderField}
        keyExtractor={item => item}
        contentContainerStyle={styles.interestsList}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
      />
      <Pressable
        style={[
          styles.nextButton,
          selectedFields.length < 3 && styles.disabledButton,
        ]}
        onPress={handleNext}
        disabled={selectedFields.length < 3}
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
    paddingHorizontal: 20,
  },
  columnWrapper: {
    justifyContent: "space-between",
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

export default Field;