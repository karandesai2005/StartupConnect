import * as React from "react";
import {Text, StyleSheet, View, Pressable, TouchableOpacity} from "react-native";
import { useNavigation } from '@react-navigation/native';

const Signup = () => {
  const navigation = useNavigation();

  const handleBack = () => {
    navigation.goBack(); // Fixed navigation handler
  };

  return (
    <View style={styles.signup2}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <Text style={styles.createAccount}>Create account</Text>
        <Text style={styles.createAPassword}>Create a password</Text>
        <Text style={styles.useAtleast8}>Use atleast 8 characters.</Text>
        
        <Pressable style={styles.signup2Child} onPress={() => {}} />
        
        <Text style={styles.confirmPassword}>Confirm Password</Text>
        <Pressable style={styles.signup2Item} onPress={() => {}} />
        
        <TouchableOpacity style={styles.nextButton}>
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
    alignItems: 'center',
    paddingTop: 94,
  },
  backButton: {
    position: 'absolute',
    left: 28,
    top: 86,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 32,
    color: '#000',
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
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  signup2Child: {
    height: 51,
    width: "100%",
    backgroundColor: "#b7b7b7",
    borderRadius: 5,
    marginBottom: 30,
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
  },
  nextButton: {
    backgroundColor: "#535353",
    borderRadius: 21,
    width: 82,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  next: {
    fontSize: 15,
    color: "#fff",
    fontFamily: "Avenir Next",
  },
});

export default Signup;