import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserRegistrationContext } from '../context/UserRegistrationContext';

const SignupForm = () => {
  const navigation = useNavigation();
  const { userData, setUserData } = useContext(UserRegistrationContext);
  
  // Local state for form validation and loading
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email change
  const handleEmailChange = (email) => {
    setUserData({ ...userData, email });
    // Clear error when user starts typing
    if (emailError) setEmailError('');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = async () => {
    // Validate email before proceeding
    if (!userData.email) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(userData.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      // Simulate API call to check if email exists
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If everything is valid, proceed to next screen
      navigation.navigate('Register2');
    } catch (error) {
      setEmailError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={handleBack}
        disabled={isLoading}
      >
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
          style={[
            styles.input,
            emailError ? styles.inputError : null
          ]}
          value={userData.email}
          onChangeText={handleEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Enter your email"
          placeholderTextColor="#757575"
          editable={!isLoading}
        />
        
        {/* Error Message */}
        {emailError ? (
          <Text style={styles.errorText}>{emailError}</Text>
        ) : (
          <Text style={styles.helperText}>
            You'll need to confirm this email later.
          </Text>
        )}
      </View>

      {/* Next Button */}
      <TouchableOpacity 
        style={[
          styles.nextButton,
          isLoading ? styles.nextButtonDisabled : null
        ]} 
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
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#ff0000',
    backgroundColor: '#fff0f0',
  },
  helperText: {
    fontSize: 8,
    color: '#040404',
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#ff0000',
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
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 15,
  },
});

export default SignupForm;