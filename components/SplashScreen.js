import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        // Check if this is the first install
        const isFirstInstall = await AsyncStorage.getItem('isFirstInstall');
        const token = await AsyncStorage.getItem('token');

        console.log('isFirstInstall:', isFirstInstall);
        console.log('token:', token);

        let destination;

        if (isFirstInstall === null || isFirstInstall === 'true') {
          // First-time user: always go to Login
          destination = 'Login';
          // Mark that the app has been opened at least once
          await AsyncStorage.setItem('isFirstInstall', 'false');
        } else {
          // Returning user: check token
          destination = token ? 'Main' : 'Login';
        }

        const timer = setTimeout(() => {
          navigation.replace(destination);
        }, 3000);

        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Error checking user status:', error);
        navigation.replace('Login'); // Fallback to Login on error
      }
    };

    checkUserStatus();
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