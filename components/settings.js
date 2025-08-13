import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Import from react-native-safe-area-context
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { NGROK_URL } from '@env';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');
const isDev = __DEV__;
const log = (...args) => isDev && console.log(...args);

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [profileImageError, setProfileImageError] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const fetchUserData = async () => {
    try {
      setDataLoading(true);
      let token = await AsyncStorage.getItem('token');
      if (!token) {
        log('No token, refreshing session');
        const { data: { session }, error } = await supabase.auth.refreshSession();
        if (error || !session) {
          console.error('Session refresh failed:', error?.message);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }
        token = session.access_token;
        await AsyncStorage.setItem('token', token);
      }

      const baseUrl = NGROK_URL.replace(/\/+$/, '');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const response = await axios.get(`${baseUrl}/api/profile`, { headers });
          if (response.data) {
            setUserData(response.data);
            await AsyncStorage.setItem('userData', JSON.stringify(response.data));
            break;
          }
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          console.warn(`Retry ${retryCount}/${maxRetries} for fetching user data:`, error.message);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));

          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !session) {
            throw new Error('Session refresh failed during retry');
          }
          token = session.access_token;
          await AsyncStorage.setItem('token', token);
          headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error.message);
      const cachedData = await AsyncStorage.getItem('userData');
      if (cachedData) {
        setUserData(JSON.parse(cachedData));
      } else {
        Alert.alert('Error', 'Failed to load profile data. Please try again.');
      }
    } finally {
      setDataLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const notifications = await AsyncStorage.getItem('notificationsEnabled');
      const emailNotifs = await AsyncStorage.getItem('emailNotifications');

      if (notifications !== null) setNotificationsEnabled(JSON.parse(notifications));
      if (emailNotifs !== null) setEmailNotifications(JSON.parse(emailNotifs));
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreference = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
  };

  const toggleNotifications = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    savePreference('notificationsEnabled', newValue);
  };

  const toggleEmailNotifications = () => {
    const newValue = !emailNotifications;
    setEmailNotifications(newValue);
    savePreference('emailNotifications', newValue);
  };

  const handleProfilePictureUpdate = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setLoading(true);
        const uri = result.assets[0].uri;
        const fileExtension = uri.split('.').pop().toLowerCase();
        const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
        const fileName = `profile-picture-${Date.now()}.${fileExtension}`;

        // Basic size validation (max 5MB)
        const maxSizeBytes = 5 * 1024 * 1024; // 5MB
        if (result.assets[0].fileSize && result.assets[0].fileSize > maxSizeBytes) {
          throw new Error('Image size exceeds 5MB. Please choose a smaller image.');
        }

        let token = await AsyncStorage.getItem('token');
        if (!token) {
          log('No token, refreshing session');
          const { data: { session }, error } = await supabase.auth.refreshSession();
          if (error || !session) {
            console.error('Session refresh failed:', error?.message);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            return;
          }
          token = session.access_token;
          await AsyncStorage.setItem('token', token);
        }

        const formData = new FormData();
        formData.append('profilePicture', {
          uri: uri,
          type: mimeType,
          name: fileName,
        });

        const baseUrl = NGROK_URL.replace(/\/+$/, '');
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            const response = await axios.post(`${baseUrl}/api/profile-picture`, formData, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
              },
            });

            if (response.status === 200) {
              await fetchUserData();
              setProfileImageError(false);
              Alert.alert('Success', 'Profile picture updated successfully!');
              break;
            }
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              throw error;
            }
            console.warn(`Retry ${retryCount}/${maxRetries} for profile picture upload:`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));

            const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !session) {
              throw new Error('Session refresh failed during retry');
            }
            token = session.access_token;
            await AsyncStorage.setItem('token', token);
          }
        }
      }
    } catch (error) {
      console.error('Error updating profile picture:', error.message);
      Alert.alert('Error', error.message || 'Failed to update profile picture. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['token', 'userData']);
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              let token = await AsyncStorage.getItem('token');
              if (!token) {
                log('No token, refreshing session');
                const { data: { session }, error } = await supabase.auth.refreshSession();
                if (error || !session) {
                  console.error('Session refresh failed:', error?.message);
                  navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                  return;
                }
                token = session.access_token;
                await AsyncStorage.setItem('token', token);
              }

              const baseUrl = NGROK_URL.replace(/\/+$/, '');
              const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              };
              let retryCount = 0;
              const maxRetries = 3;

              while (retryCount < maxRetries) {
                try {
                  await axios.delete(`${baseUrl}/api/auth/delete-account`, { headers });
                  await AsyncStorage.multiRemove(['token', 'userData']);
                  navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                  break;
                } catch (error) {
                  retryCount++;
                  if (retryCount === maxRetries) {
                    throw error;
                  }
                  console.warn(`Retry ${retryCount}/${maxRetries} for deleting account:`, error.message);
                  await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));

                  const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
                  if (refreshError || !session) {
                    throw new Error('Session refresh failed during retry');
                  }
                  token = session.access_token;
                  await AsyncStorage.setItem('token', token);
                  headers.Authorization = `Bearer ${token}`;
                }
              }
            } catch (error) {
              console.error('Error deleting account:', error.message);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleFeedbackSubmit = async () => {
    const trimmedFeedback = feedbackText.trim();
    if (!trimmedFeedback) {
      Alert.alert('Error', 'Please enter your feedback before submitting.');
      return;
    }
    if (trimmedFeedback.length < 5) {
      Alert.alert('Error', 'Feedback must be at least 5 characters long.');
      return;
    }
    if (trimmedFeedback.length > 1000) {
      Alert.alert('Error', 'Feedback cannot exceed 1000 characters.');
      return;
    }

    try {
      setFeedbackSubmitting(true);
      let token = await AsyncStorage.getItem('token');
      if (!token) {
        log('No token, refreshing session');
        const { data: { session }, error } = await supabase.auth.refreshSession();
        if (error || !session) {
          console.error('Session refresh failed:', error?.message);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }
        token = session.access_token;
        await AsyncStorage.setItem('token', token);
      }

      const baseUrl = NGROK_URL.replace(/\/+$/, '');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          await axios.post(
            `${baseUrl}/api/feedback`,
            { feedback: trimmedFeedback },
            { headers }
          );
          setFeedbackText('');
          setFeedbackModalVisible(false);
          Alert.alert('Success', 'Thank you for your feedback!');
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          console.warn(`Retry ${retryCount}/${maxRetries} for submitting feedback:`, error.message);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));

          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !session) {
            throw new Error('Session refresh failed during retry');
          }
          token = session.access_token;
          await AsyncStorage.setItem('token', token);
          headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error.message);
      const errorMessage = error.response?.data?.error || 'Failed to submit feedback. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
      loadPreferences();
      return () => {};
    }, [])
  );

  const profilePictureSource = useMemo(() => {
    if (profileImageError || 
        typeof userData?.profile_picture !== 'string' || 
        userData?.profile_picture.includes('undefined') || 
        userData?.profile_picture.includes('null')) {
      return require('../assets/profiledefault.jpg');
    }
    return { uri: userData.profile_picture };
  }, [userData?.profile_picture, profileImageError]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="white"
        translucent={false} // Add translucent={false}
      />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {dataLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f219c" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.profileSection}>
            <View style={styles.profileRow}>
              <TouchableOpacity onPress={handleProfilePictureUpdate} disabled={loading}>
                <View style={styles.profileImageContainer}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#1f219c" style={styles.loadingIndicator} />
                  ) : null}
                  <Image
                    source={profilePictureSource}
                    style={styles.profileImage}
                    onError={() => {
                      console.error('SettingsScreen: Profile image loading error:', userData?.profile_picture);
                      setProfileImageError(true);
                    }}
                  />
                </View>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{userData?.username || 'Your Name'}</Text>
                <Text style={styles.userEmail}>{userData?.email || 'email@example.com'}</Text>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => navigation.navigate('EditProfilePage', { userData })}
                >
                  <Text style={styles.editProfileText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.settingsContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setAccountModalVisible(true)}
              >
                <Text style={styles.settingText}>Account Details</Text>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setPrivacyModalVisible(true)}
              >
                <Text style={styles.settingText}>Privacy</Text>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, styles.lastItem]}
                onPress={() => setSecurityModalVisible(true)}
              >
                <Text style={styles.settingText}>Security</Text>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferences</Text>
              <View style={styles.settingItem}>
                <Text style={styles.settingText}>Push Notifications</Text>
                <Switch
                  trackColor={{ false: '#E9ECEF', true: '#a3a4eb' }}
                  thumbColor={notificationsEnabled ? '#1f219c' : 'white'}
                  ios_backgroundColor="#E9ECEF"
                  onValueChange={toggleNotifications}
                  value={notificationsEnabled}
                  style={styles.switch}
                  accessibilityLabel="Push Notifications"
                />
              </View>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setVisibilityModalVisible(true)}
              >
                <Text style={styles.settingText}>Profile Visibility</Text>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>

              <View style={[styles.settingItem, styles.lastItem]}>
                <Text style={styles.settingText}>Email Notifications</Text>
                <Switch
                  trackColor={{ false: '#E9ECEF', true: '#a3a4eb' }}
                  thumbColor={emailNotifications ? '#1f219c' : 'white'}
                  ios_backgroundColor="#E9ECEF"
                  onValueChange={toggleEmailNotifications}
                  value={emailNotifications}
                  style={styles.switch}
                  accessibilityLabel="Email Notifications"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Support</Text>
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setHelpModalVisible(true)}
              >
                <Text style={styles.settingText}>Help Center</Text>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setTermsModalVisible(true)}
              >
                <Text style={styles.settingText}>Terms & Conditions</Text>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setPolicyModalVisible(true)}
              >
                <Text style={styles.settingText}>Privacy Policy</Text>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, styles.lastItem]}
                onPress={() => setFeedbackModalVisible(true)}
              >
                <Text style={styles.settingText}>Feedback</Text>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.accountActions}>
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={handleLogout}
                >
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteAccountButton}
                  onPress={handleDeleteAccount}
                >
                  <Text style={styles.deleteAccountText}>Delete Account</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>
          </View>
        </ScrollView>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={accountModalVisible}
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Account Details</Text>
            <Text style={styles.modalText}>
              Manage your PITCH account details below:
              {"\n\n"}• Username: {userData?.username || 'Not set'}
              {"\n"}• Email: {userData?.email || 'Not set'}
              {"\n"}• Account Type: {userData?.accountType || 'Entrepreneur'}
              {"\n"}• Member Since: {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setAccountModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#1f219c', borderColor: '#1f219c' }]}
                onPress={() => {
                  setAccountModalVisible(true);
                  navigation.navigate('EditProfilePage', { userData });
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={privacyModalVisible}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Privacy</Text>
            <Text style={styles.modalText}>
              Your privacy settings control who can see your PITCH profile and content:
              {"\n\n"}• Profile Visibility: Choose who can view your profile (Public, Investors Only, Private)
              {"\n"}• Pitch Visibility: Control who can see your startup pitches
              {"\n"}• Connection Requests: Manage who can send you connection requests
              {"\n"}• Data Sharing: Opt in/out of sharing analytics with investors
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setPrivacyModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#1f219c', borderColor: '#1f219c' }]}
                onPress={() => {
                  setPrivacyModalVisible(false);
                  navigation.navigate('PrivacySettings');
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Adjust Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={securityModalVisible}
        onRequestClose={() => setSecurityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Security</Text>
            <Text style={styles.modalText}>
              Keep your PITCH account secure:
              {"\n\n"}• Password: Update your password regularly
              {"\n"}• Two-Factor Authentication: Add an extra layer of security
              {"\n"}• Login Activity: Review recent login attempts
              {"\n"}• Authorized Devices: Manage trusted devices
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setSecurityModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#1f219c', borderColor: '#1f219c' }]}
                onPress={() => {
                  setSecurityModalVisible(false);
                  navigation.navigate('SecuritySettings');
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={visibilityModalVisible}
        onRequestClose={() => setVisibilityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Profile Visibility</Text>
            <Text style={styles.modalText}>
              Control who can see your PITCH profile:
              {"\n\n"}• Public: Visible to all users
              {"\n"}• Investors Only: Visible only to verified investors
              {"\n"}• Private: Visible only to your connections
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setVisibilityModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#1f219c', borderColor: '#1f219c' }]}
                onPress={() => {
                  setVisibilityModalVisible(false);
                  navigation.navigate('VisibilitySettings');
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Change Visibility</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={helpModalVisible}
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Help Center</Text>
            <Text style={styles.modalText}>
              Get assistance with PITCH:
              {"\n\n"}• FAQ: Common questions about profiles and pitches
              {"\n"}• Contact Us: support@pitchapp.com
              {"\n"}• Tutorials: Learn how to optimize your startup pitch
              {"\n"}• Report Issue: Submit technical problems
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setHelpModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#1f219c', borderColor: '#1f219c' }]}
                onPress={() => {
                  setHelpModalVisible(false);
                  navigation.navigate('HelpCenter');
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Visit Help Center</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={termsModalVisible}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Terms & Conditions</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>
                Welcome to PITCH! By using our app, you agree to these Terms & Conditions:
                {"\n\n"}1. Use of Service
                {"\n"}• PITCH is a platform for startup founders to connect with investors and audiences
                {"\n"}• You must be 18+ to use this service
                {"\n"}• Accounts must represent real individuals or verified businesses
                {"\n\n"}2. Content
                {"\n"}• You retain ownership of your pitches and content
                {"\n"}• No illegal, offensive, or misleading content allowed
                {"\n"}• PITCH reserves the right to remove violating content
                {"\n\n"}3. Connections
                {"\n"}• Respect other users’ privacy and decisions
                {"\n"}• No spamming or unsolicited pitches
                {"\n\n"}4. Liability
                {"\n"}• PITCH is not responsible for investment outcomes
                {"\n"}• Use at your own risk; we’re not liable for losses
                {"\n\n"}Last Updated: March 10, 2025
              </Text>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setTermsModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#1f219c', borderColor: '#1f219c' }]}
                onPress={() => setTermsModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={policyModalVisible}
        onRequestClose={() => setPolicyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>
                PITCH values your privacy. Here’s how we handle your data:
                {"\n\n"}1. Data Collection
                {"\n"}• We collect profile info (name, email, company details)
                {"\n"}• Pitch content and connection data
                {"\n"}• Usage analytics to improve our service
                {"\n\n"}2. Data Use
                {"\n"}• To connect you with investors and audiences
                {"\n"}• To personalize your experience
                {"\n"}• For analytics (anonymized unless opted in)
                {"\n\n"}3. Data Sharing
                {"\n"}• Profile visible per your visibility settings
                {"\n"}• Never sell your personal data
                {"\n"}• May share with legal authorities if required
                {"\n\n"}4. Your Rights
                {"\n"}• Access, edit, or delete your data anytime
                {"\n"}• Contact privacy@pitchapp.com for requests
                {"\n\n"}Last Updated: March 10, 2025
              </Text>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setPolicyModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#1f219c', borderColor: '#1f219c' }]}
                onPress={() => setPolicyModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Understood</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={feedbackModalVisible}
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Submit Feedback</Text>
            <TextInput
              style={styles.feedbackInput}
              multiline
              numberOfLines={4}
              placeholder="Tell us what you think about PITCH..."
              placeholderTextColor="#666"
              value={feedbackText}
              onChangeText={setFeedbackText}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setFeedbackModalVisible(false)}
                disabled={feedbackSubmitting}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#1f219c', borderColor: '#1f219c' }]}
                onPress={handleFeedbackSubmit}
                disabled={feedbackSubmitting}
              >
                {feedbackSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'AvenirNextCyr',
    marginTop: ""
  },
  placeholder: {
    width: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20, // Increased paddingBottom for better spacing
  },
  profileSection: {
    paddingVertical: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    backgroundColor: '#fff',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 0,
    borderColor: '#E9ECEF',
  },
  loadingIndicator: {
    position: 'absolute',
    top: 25,
    left: 25,
    zIndex: 1,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  editProfileButton: {
    backgroundColor: '#1f219c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  editProfileText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  settingsContainer: {
    paddingHorizontal: 12,
  },
  section: {
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingText: {
    fontSize: 13,
    color: '#000',
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '300',
    color: '#666',
  },
  switch: {
    transform: Platform.OS === 'ios'
      ? [{ scaleX: 0.8 }, { scaleY: 0.8 }]
      : [{ scaleX: 0.7 }, { scaleY: 0.7 }],
    marginLeft: 5,
  },
  accountActions: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    flex: 0.48,
    backgroundColor: '#fff',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  deleteAccountButton: {
    backgroundColor: '#FEE9E9',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    flex: 0.48,
  },
  deleteAccountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
  },
  versionContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: width * 0.9,
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'left',
    width: '100%',
  },
  modalScroll: {
    maxHeight: 200,
    marginBottom: 20,
  },
  feedbackInput: {
    width: '100%',
    height: 100,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    textAlignVertical: 'top',
    color: '#000',
    backgroundColor: '#F8F9FA',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 15,
  },
  modalButton: {
    flex: 0.48,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    backgroundColor: '#fff',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
});