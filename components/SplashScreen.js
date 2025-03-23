import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        // Navigate based on whether token exists
        const destination = token ? 'Main' : 'Login';
        const timer = setTimeout(() => {
          navigation.replace(destination);
        }, 3000);
        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Error checking login status:', error);
        navigation.replace('Login'); // Fallback to Login on error
      }
    };

    checkLoginStatus();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Pitch</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  logo: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#000000',
  },
});

export default SplashScreen;