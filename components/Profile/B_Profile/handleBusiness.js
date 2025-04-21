import * as React from "react";
import { Text, StyleSheet, View, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from '../../../services/supabase';

const SetupBusinessProfile = () => {
  const [companyName, setCompanyName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const navigation = useNavigation();
  const route = useRoute();
  const { supabase_uid } = route.params || {};

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Validate company name
      if (!companyName.trim()) {
        setError("Company name cannot be empty.");
        return;
      }

      // Check user session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user || user.id !== supabase_uid) {
        console.error("User session error:", userError?.message);
        throw new Error("User session not found. Please try again.");
      }

      // Update name in users table (changed from company_name to name)
      const { error: updateError } = await supabase
        .from('users')
        .update({ name: companyName.trim() })
        .eq('supabase_uid', user.id);
      if (updateError) {
        console.error("Supabase update error:", updateError.message);
        throw updateError;
      }

      Alert.alert("Success", "Company name saved successfully.");
      navigation.navigate("field", { supabase_uid: user.id });
    } catch (error) {
      console.error("Error saving company name:", error.message);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>←</Text>
      </Pressable>

      <Text style={[styles.createAccount, styles.centeredText]}>Create account</Text>
      <Text style={[styles.whatsYourName, styles.centeredText]}>
        What’s your company's name?
      </Text>

      <TextInput
        style={styles.textInput}
        placeholder="Enter your company's name"
        value={companyName}
        onChangeText={(text) => setCompanyName(text)}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={[styles.nextButton, isLoading ? styles.disabledButton : null]}
        onPress={handleNext}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.nextButtonText}>Next</Text>
        )}
      </Pressable>

      <Text style={styles.termsText}>
        {`By tapping "Next", you agree to the Pitch Terms of Use.\n\nTo learn more about how Pitch collects, uses, shares, and protects your personal data, please see the Pitch Privacy Policy.`}
      </Text>
      <Text style={[styles.privacyPolicy, styles.linkText]}>Privacy Policy</Text>
      <Text style={[styles.termsOfUse, styles.linkText]}>Terms of Use</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 40,
  },
  backButtonText: {
    fontSize: 32,
    color: "#000",
  },
  centeredText: {
    textAlign: "center",
  },
  createAccount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 20,
  },
  whatsYourName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 20,
  },
  textInput: {
    width: "100%",
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  nextButton: {
    width: "100%",
    backgroundColor: "#535353",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#ff0000",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
  },
  termsText: {
    fontSize: 12,
    color: "#000",
    textAlign: "center",
    marginVertical: 10,
  },
  privacyPolicy: {
    color: "#1ed760",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 5,
  },
  termsOfUse: {
    color: "#1ed760",
    fontSize: 12,
    textAlign: "center",
  },
  linkText: {
    fontWeight: "500",
  },
});

export default SetupBusinessProfile;