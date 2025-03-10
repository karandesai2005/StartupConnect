import React, { useState, useEffect, useContext } from 'react';
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
  TextInput
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { NGROK_URL } from '@env';
import * as ImagePicker from 'expo-image-picker';
import { ThemeContext } from './ThemeContext';
import BottomNav from './BottamNav';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { isDarkMode, toggleTheme, colors } = useContext(ThemeContext);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const fetchUserData = async () => {
    try {
      setDataLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setDataLoading(false);
        return;
      }

      const response = await axios.get(
        `${NGROK_URL}/api/auth/profile`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data) {
        setUserData(response.data);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      Alert.alert("Error", "Failed to load profile data. Please try again.");
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

  const toggleDarkMode = () => {
    toggleTheme();
  };

  const toggleEmailNotifications = () => {
    const newValue = !emailNotifications;
    setEmailNotifications(newValue);
    savePreference('emailNotifications', newValue);
  };

  const handleProfilePictureUpdate = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "You need to grant access to your photo library to update your profile picture.");
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

        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const formData = new FormData();
        formData.append('profilePicture', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'profile-picture.jpg',
        });

        await axios.post(
          `${NGROK_URL}/api/auth/update-profile-picture`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        fetchUserData();
        Alert.alert("Success", "Profile picture updated successfully!");
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      Alert.alert("Error", "Failed to update profile picture. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("token");
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. All your data will be permanently deleted.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem("token");
              if (!token) return;

              await axios.delete(
                `${NGROK_URL}/api/auth/delete-account`,
                {
                  headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                  }
                }
              );

              await AsyncStorage.removeItem("token");
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert("Error", "Failed to delete account. Please try again.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) {
      Alert.alert("Error", "Please enter your feedback before submitting.");
      return;
    }

    try {
      setFeedbackSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      await axios.post(
        `${NGROK_URL}/api/feedback`,
        { feedback: feedbackText },
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      setFeedbackText('');
      setFeedbackModalVisible(false);
      Alert.alert("Success", "Thank you for your feedback!");
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert("Error", "Failed to submit feedback. Please try again.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
      loadPreferences();
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.statusBarBackground, { backgroundColor: colors.background }]} />

      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image source={require('../assets/Arrow.png')} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {dataLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.profileSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.profileRow}>
              <TouchableOpacity onPress={handleProfilePictureUpdate} disabled={loading}>
                <View style={styles.profileImageContainer}>
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.primary} style={styles.loadingIndicator} />
                  ) : null}
                  <Image
                    source={
                      userData?.profile_picture
                        ? { uri: userData.profile_picture }
                        : require('../assets/del.png')
                    }
                    style={styles.profileImage}
                  />
                  <View style={[styles.editIconContainer, { borderColor: colors.card }]}>
                    <Text style={styles.editIconText}>+</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>{userData?.username || 'Your Name'}</Text>
                <Text style={[styles.userEmail, { color: colors.secondaryText }]}>{userData?.email || 'email@example.com'}</Text>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => navigation.navigate('EditProfile', { userData })}
                >
                  <Text style={styles.editProfileText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.settingsContainer}>
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>Account</Text>
              <TouchableOpacity
                style={[styles.settingItem, { borderBottomColor: colors.border }]}
                onPress={() => navigation.navigate('AccountDetails')}
              >
                <Text style={[styles.settingText, { color: colors.text }]}>Account Details</Text>
                <Text style={[styles.arrowText, { color: colors.secondaryText }]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, { borderBottomColor: colors.border }]}
                onPress={() => navigation.navigate('Privacy')}
              >
                <Text style={[styles.settingText, { color: colors.text }]}>Privacy</Text>
                <Text style={[styles.arrowText, { color: colors.secondaryText }]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, styles.lastItem]}
                onPress={() => navigation.navigate('Security')}
              >
                <Text style={[styles.settingText, { color: colors.text }]}>Security</Text>
                <Text style={[styles.arrowText, { color: colors.secondaryText }]}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>Preferences</Text>
              <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                <Text style={[styles.settingText, { color: colors.text }]}>Push Notifications</Text>
                <Switch
                  trackColor={{ false: colors.border, true: "#a3a4eb" }}
                  thumbColor={notificationsEnabled ? colors.primary : colors.background}
                  ios_backgroundColor={colors.border}
                  onValueChange={toggleNotifications}
                  value={notificationsEnabled}
                  style={styles.switch}
                />
              </View>

              <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
                <Switch
                  trackColor={{ false: colors.border, true: "#a3a4eb" }}
                  thumbColor={isDarkMode ? colors.primary : colors.background}
                  ios_backgroundColor={colors.border}
                  onValueChange={toggleDarkMode}
                  value={isDarkMode}
                  style={styles.switch}
                />
              </View>

              <View style={[styles.settingItem, styles.lastItem]}>
                <Text style={[styles.settingText, { color: colors.text }]}>Email Notifications</Text>
                <Switch
                  trackColor={{ false: colors.border, true: "#a3a4eb" }}
                  thumbColor={emailNotifications ? colors.primary : colors.background}
                  ios_backgroundColor={colors.border}
                  onValueChange={toggleEmailNotifications}
                  value={emailNotifications}
                  style={styles.switch}
                />
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.card, height: Platform.OS === 'android' ? 200 : 'auto' }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>Support</Text>
              <TouchableOpacity
                style={[styles.settingItem, { borderBottomColor: colors.border }]}
                onPress={() => navigation.navigate('HelpCenter')}
              >
                <Text style={[styles.settingText, { color: colors.text }]}>Help Center</Text>
                <Text style={[styles.arrowText, { color: colors.secondaryText }]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, { borderBottomColor: colors.border }]}
                onPress={() => navigation.navigate('TermsAndConditions')}
              >
                <Text style={[styles.settingText, { color: colors.text }]}>Terms & Conditions</Text>
                <Text style={[styles.arrowText, { color: colors.secondaryText }]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, { borderBottomColor: colors.border }]}
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                <Text style={[styles.settingText, { color: colors.text }]}>Privacy Policy</Text>
                <Text style={[styles.arrowText, { color: colors.secondaryText }]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, styles.lastItem]}
                onPress={() => setFeedbackModalVisible(true)}
              >
                <Text style={[styles.settingText, { color: colors.text }]}>Feedback</Text>
                <Text style={[styles.arrowText, { color: colors.secondaryText }]}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.accountActions}>
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={handleLogout}
                >
                  <Text style={[styles.logoutText, { color: colors.text }]}>Logout</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteAccountButton}
                  onPress={handleDeleteAccount}
                >
                  <Text style={[styles.deleteAccountText, { color: colors.danger }]}>Delete Account</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.versionContainer}>
              <Text style={[styles.versionText, { color: colors.secondaryText }]}>Version 1.0.0</Text>
            </View>
          </View>
        </ScrollView>
      )}

      <BottomNav />

      {/* Feedback Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={feedbackModalVisible}
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Submit Feedback</Text>
            <TextInput
              style={[styles.feedbackInput, {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: isDarkMode ? '#3A4243' : '#F8F9FA'
              }]}
              multiline
              numberOfLines={4}
              placeholder="Tell us what you think..."
              placeholderTextColor={colors.secondaryText}
              value={feedbackText}
              onChangeText={setFeedbackText}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setFeedbackModalVisible(false)}
                disabled={feedbackSubmitting}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 20 : 0,
  },
  statusBarBackground: {
    height: Platform.OS === 'ios' ? 30 : 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginTop: Platform.select({
      ios: 25,
      android: 25
    })
  },
  backButton: {
    padding: 5,
  },
  backIcon: {
    width: 20,
    height: 20,
    transform: [{ rotate: '0deg' }]
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    paddingBottom: 10,
  },
  profileSection: {
    paddingVertical: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
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
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1f219c',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  editIconText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
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
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'android' ? 8 : 12,
    borderBottomWidth: 1,
    height: Platform.OS === 'android' ? 36 : 'auto',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingText: {
    fontSize: 13,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '300',
  },
  switch: {
    transform: Platform.OS === 'ios'
      ? [{ scaleX: 0.8 }, { scaleY: 0.8 }]
      : [{ scaleX: 0.7 }, { scaleY: 0.7 }],
    marginLeft: 5,
    marginRight: Platform.OS === 'android' ? -8 : 0,
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
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    flex: 0.48,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
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
  },
  versionContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  versionText: {
    fontSize: 12,
  },
  navIcon: {
    width: 22,
    height: 22,
    marginBottom: Platform.OS === 'ios' ? 3 : 0,
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
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  feedbackInput: {
    width: '100%',
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 0.48,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});