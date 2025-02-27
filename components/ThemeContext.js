import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load dark mode preference from AsyncStorage or default to system preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('darkMode');
        if (storedTheme !== null) {
          setIsDarkMode(storedTheme === 'true');
        } else {
          // Default to system appearance if no preference is stored
          const systemTheme = Appearance.getColorScheme() === 'dark';
          setIsDarkMode(systemTheme);
          await AsyncStorage.setItem('darkMode', String(systemTheme));
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };
    loadTheme();

    // Listen to system theme changes and update state
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const updateTheme = async () => {
        try {
          const storedTheme = await AsyncStorage.getItem('darkMode');
          if (storedTheme === null) {
            // If no user preference, follow system theme
            setIsDarkMode(colorScheme === 'dark');
            await AsyncStorage.setItem('darkMode', String(colorScheme === 'dark'));
          }
        } catch (error) {
          console.error('Error updating theme from system:', error);
        }
      };
      updateTheme();
    });

    return () => subscription.remove();
  }, []);

  // Toggle dark mode and save to AsyncStorage
  const toggleTheme = async () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    try {
      await AsyncStorage.setItem('darkMode', String(newValue));
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    colors: {
      background: isDarkMode ? '#1C2526' : '#F8F9FA',
      text: isDarkMode ? '#E8ECEF' : '#212529',
      secondaryText: isDarkMode ? '#ADB5BD' : '#6C757D',
      card: isDarkMode ? '#2D3536' : '#FFFFFF',
      primary: '#1F219C',
      border: isDarkMode ? '#495057' : '#DEE2E6',
      danger: '#DC3545',
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};