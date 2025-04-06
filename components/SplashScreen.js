import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    let timer;

    const checkUserStatus = async () => {
      try {
        // Debug: Check if navigation is valid
        if (!navigation || typeof navigation.replace !== 'function') {
          console.error('Navigation is invalid:', navigation);
          return;
        }

        const isFirstInstall = await AsyncStorage.getItem('isFirstInstall');
        const token = await AsyncStorage.getItem('token');

        console.log('isFirstInstall:', isFirstInstall);
        console.log('token:', token);

        let destination = 'Login';
        if (isFirstInstall === null || isFirstInstall === 'true') {
          await AsyncStorage.setItem('isFirstInstall', 'false');
        } else if (token) {
          destination = 'Main';
        }

        // Debug: Log destination before navigation
        console.log('Navigating to:', destination);

        timer = setTimeout(() => {
          try {
            navigation.replace(destination);
          } catch (navError) {
            console.error('Navigation error:', navError);
          }
        }, 3000);
      } catch (error) {
        console.error('Error checking user status:', error);
        // Fallback navigation with error handling
        try {
          navigation.replace('Login');
        } catch (navError) {
          console.error('Fallback navigation failed:', navError);
        }
      }
    };

    checkUserStatus();

    return () => clearTimeout(timer); // Cleanup timer
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>PITCH</Text>
      <ActivityIndicator size="large" color="#000" style={{ marginTop: 20 }} />
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