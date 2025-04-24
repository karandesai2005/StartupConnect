import React, { useEffect, useContext } from "react";
import { Text, StyleSheet, View, Pressable, TouchableOpacity, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from '../services/supabase';
import { UserRegistrationContext } from "../context/UserRegistrationContext";

const Preference = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { supabase_uid } = route.params || {};
  const { userData } = useContext(UserRegistrationContext);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('Preference.js - Current user:', user, 'Error:', error);
        if (error || !user || user.id !== supabase_uid) {
          console.warn('Session check failed:', error?.message || 'No user or ID mismatch');
          Alert.alert(
            "Session Expired",
            "Your session has expired. Please sign in to continue.",
            [
              {
                text: "OK",
                onPress: () => navigation.navigate("Login"), // Navigate to a Login screen
              },
            ]
          );
        }
      } catch (err) {
        console.error('Session check error:', err.message);
        Alert.alert("Error", "Failed to verify session. Please try again.");
      }
    };
    if (supabase_uid) {
      checkUser();
    } else {
      console.warn('No supabase_uid provided');
      Alert.alert("Error", "Invalid registration data. Please restart registration.");
      navigation.navigate("Register1");
    }
  }, [supabase_uid]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handlePersonalAccount = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Personal account - User:', user, 'Error:', userError);
      if (userError || !user || user.id !== supabase_uid) {
        throw new Error("User not authenticated");
      }
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_personal: true, is_business: false })
        .eq('supabase_uid', user.id);
      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
      navigation.navigate("handlePersonal", { supabase_uid: user.id });
    } catch (error) {
      console.error("Error in handlePersonalAccount:", error.message, error);
      Alert.alert("Error", "Failed to set account preference. Please try again.");
    }
  };

  const handleBusinessAccount = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Business account - User:', user, 'Error:', userError);
      if (userError || !user || user.id !== supabase_uid) {
        throw new Error("User not authenticated");
      }
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_personal: false, is_business: true })
        .eq('supabase_uid', user.id);
      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
      navigation.navigate("handleBusiness", { supabase_uid: user.id });
    } catch (error) {
      console.error("Error in handleBusinessAccount:", error.message, error);
      Alert.alert("Error", "Failed to set account preference. Please try again.");
    }
  };

  return (
    <View style={styles.signup4}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.createAccount}>Create account</Text>
        <Text style={styles.whatIsYour}>What is your account type preference?</Text>

        <View style={styles.accountOptionsContainer}>
          <Pressable style={styles.accountOption} onPress={handlePersonalAccount}>
            <Text style={styles.accountOptionText}>Personal Account</Text>
          </Pressable>

          <View style={styles.orContainer}>
            <Text style={styles.or}>or</Text>
          </View>

          <Pressable style={styles.accountOption} onPress={handleBusinessAccount}>
            <Text style={styles.accountOptionText}>Business Account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  signup4: { backgroundColor: "#fff", flex: 1 },
  container: { flex: 1, alignItems: "center", paddingHorizontal: 20, paddingTop: 40 },
  backButton: { position: "absolute", left: 28, top: 86, zIndex: 1 },
  backButtonText: { fontSize: 32, color: "#000" },
  createAccount: { fontSize: 16, color: "#000", fontFamily: "Avenir Next Cyr", fontWeight: "700", marginTop: 50 },
  whatIsYour: { fontSize: 20, color: "#000", fontFamily: "Avenir Next Cyr", fontWeight: "700", textAlign: "center", marginTop: 20, maxWidth: 355 },
  accountOptionsContainer: { width: "100%", alignItems: "center", marginTop: 160 },
  accountOption: { backgroundColor: "#b7b7b7", borderRadius: 5, width: "100%", height: 51, justifyContent: "center", alignItems: "center", marginVertical: 10 },
  accountOptionText: { fontSize: 20, color: "#000", fontFamily: "Avenir Next Cyr", fontWeight: "700" },
  orContainer: { backgroundColor: "#f0f0f0", borderRadius: 14, borderColor: "#000", borderWidth: 2, width: 103, height: 44, justifyContent: "center", alignItems: "center", marginVertical: 20 },
  or: { fontSize: 20, color: "#000", fontFamily: "Avenir Next Cyr", fontWeight: "700" },
});

export default Preference;