import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const SignupForm = () => {
  const navigation = useNavigation();

  const handleBack = () => {
    navigation.goBack('Login');  // Navigate to Login screen
  };

  const handleNext = () => {
    navigation.navigate('Register2');  // Navigate to next register screen
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* Create Account Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Create account</Text>
      </View>

      {/* Email Section */}
      <View style={styles.emailSection}>
        <Text style={styles.emailTitle}>What's your email?</Text>
        
        {/* Email Input */}
        <TextInput 
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        {/* Helper Text */}
        <Text style={styles.helperText}>
          You'll need to confirm this email later.
        </Text>
      </View>

      {/* Next Button */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 32,
  },
  backButton: {
    position: 'absolute',
    left: 28,
    top: 86,
  },
  backButtonText: {
    fontSize: 32,
    color: '#000',
  },
  header: {
    marginTop: 94,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0a',
  },
  emailSection: {
    marginTop: 49,
  },
  emailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 51,
    backgroundColor: '#b7b7b7',
    borderRadius: 5,
    paddingHorizontal: 16,
  },
  helperText: {
    fontSize: 8,
    color: '#040404',
    marginTop: 8,
  },
  nextButton: {
    marginTop: 62,
    backgroundColor: '#535353',
    borderRadius: 21,
    width: 82,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 15,
  },
});

export default SignupForm;