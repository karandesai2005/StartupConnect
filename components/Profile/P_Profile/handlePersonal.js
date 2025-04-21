import * as React from "react";
import { Text, StyleSheet, View, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from '../../../services/supabase';

const HandlePersonal = () => {
  const [realName, setRealName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const navigation = useNavigation();
  const route = useRoute();
  const { supabase_uid } = route.params || {};

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSaveRealName = async () => {
    try {
      setIsLoading(true);
      setError("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== supabase_uid) {
        throw new Error("User session not found. Please try again.");
      }

      if (!realName || realName.trim() === "") {
        setError("Name cannot be empty.");
        return;
      }

      // Use 'supabase_uid' instead of 'id' if it's the primary key in your custom 'users' table
      const { error } = await supabase.from('users').update({ name: realName.trim() }).eq('supabase_uid', user.id);
      if (error) throw error;

      Alert.alert("Success", "Name saved successfully.");
      navigation.navigate("field", { supabase_uid: user.id });
    } catch (error) {
      console.error("Error saving name:", error.message);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, styles.centeredText]}>What’s your real name?</Text>

      {/* Input Field */}
      <TextInput
        style={styles.textInput}
        placeholder="Enter your real name"
        value={realName}
        onChangeText={(text) => setRealName(text)}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Save Button */}
      <Pressable
        style={[styles.saveButton, isLoading ? styles.disabledButton : null]}
        onPress={handleSaveRealName}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.saveButtonText}>Save and Continue</Text>
        )}
      </Pressable>

      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
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
  centeredText: {
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 20,
  },
  textInput: {
    width: "100",
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  saveButton: {
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
  saveButtonText: {
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
  backButton: {
    marginTop: 10,
  },
  backButtonText: {
    color: "#1ed760",
    fontSize: 14,
  },
});

export default HandlePersonal;