import React, { useState, useEffect } from 'react';
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

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
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
        <View style={[styles.container, { backgroundColor: 'white' }]}>
            <View style={[styles.statusBarBackground, { backgroundColor: 'white' }]} />

            <View style={[styles.header, { backgroundColor: 'white', borderBottomColor: '#E9ECEF' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Image source={require('../assets/Arrow.png')} style={[styles.backIcon, { tintColor: '#000' }]} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: '#000' }]}>Settings</Text>
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
                    <View style={[styles.profileSection, { backgroundColor: '#fff', borderBottomColor: '#E9ECEF' }]}>
                        <View style={styles.profileRow}>
                            <TouchableOpacity onPress={handleProfilePictureUpdate} disabled={loading}>
                                <View style={styles.profileImageContainer}>
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#1f219c" style={styles.loadingIndicator} />
                                    ) : null}
                                    <Image
                                        source={
                                            userData?.profile_picture
                                                ? { uri: userData.profile_picture }
                                                : require('../assets/del.png')
                                        }
                                        style={styles.profileImage}
                                    />
                                    <View style={[styles.editIconContainer, { borderColor: '#fff' }]}>
                                        <Text style={styles.editIconText}>+</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                            <View style={styles.profileInfo}>
                                <Text style={[styles.userName, { color: '#000' }]}>{userData?.username || 'Your Name'}</Text>
                                <Text style={[styles.userEmail, { color: '#666' }]}>{userData?.email || 'email@example.com'}</Text>
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
                        <View style={[styles.section, { backgroundColor: '#fff' }]}>
                            <Text style={[styles.sectionTitle, { color: '#000', borderBottomColor: '#E9ECEF' }]}>Account</Text>
                            <TouchableOpacity
                                style={[styles.settingItem, { borderBottomColor: '#E9ECEF' }]}
                                onPress={() => setAccountModalVisible(true)}
                            >
                                <Text style={[styles.settingText, { color: '#000' }]}>Account Details</Text>
                                <Text style={[styles.arrowText, { color: '#666' }]}>›</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.settingItem, { borderBottomColor: '#E9ECEF' }]}
                                onPress={() => setPrivacyModalVisible(true)}
                            >
                                <Text style={[styles.settingText, { color: '#000' }]}>Privacy</Text>
                                <Text style={[styles.arrowText, { color: '#666' }]}>›</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.settingItem, styles.lastItem]}
                                onPress={() => setSecurityModalVisible(true)}
                            >
                                <Text style={[styles.settingText, { color: '#000' }]}>Security</Text>
                                <Text style={[styles.arrowText, { color: '#666' }]}>›</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.section, { backgroundColor: '#fff' }]}>
                            <Text style={[styles.sectionTitle, { color: '#000', borderBottomColor: '#E9ECEF' }]}>Preferences</Text>
                            <View style={[styles.settingItem, { borderBottomColor: '#E9ECEF' }]}>
                                <Text style={[styles.settingText, { color: '#000' }]}>Push Notifications</Text>
                                <Switch
                                    trackColor={{ false: '#E9ECEF', true: '#a3a4eb' }}
                                    thumbColor={notificationsEnabled ? '#1f219c' : 'white'}
                                    ios_backgroundColor="#E9ECEF"
                                    onValueChange={toggleNotifications}
                                    value={notificationsEnabled}
                                    style={styles.switch}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.settingItem, { borderBottomColor: '#E9ECEF' }]}
                                onPress={() => setVisibilityModalVisible(true)}
                            >
                                <Text style={[styles.settingText, { color: '#000' }]}>Profile Visibility</Text>
                                <Text style={[styles.arrowText, { color: '#666' }]}>›</Text>
                            </TouchableOpacity>

                            <View style={[styles.settingItem, styles.lastItem]}>
                                <Text style={[styles.settingText, { color: '#000' }]}>Email Notifications</Text>
                                <Switch
                                    trackColor={{ false: '#E9ECEF', true: '#a3a4eb' }}
                                    thumbColor={emailNotifications ? '#1f219c' : 'white'}
                                    ios_backgroundColor="#E9ECEF"
                                    onValueChange={toggleEmailNotifications}
                                    value={emailNotifications}
                                    style={styles.switch}
                                />
                            </View>
                        </View>

                        <View style={[styles.section, { backgroundColor: '#fff', height: Platform.OS === 'android' ? 200 : 'auto' }]}>
                            <Text style={[styles.sectionTitle, { color: '#000', borderBottomColor: '#E9ECEF' }]}>Support</Text>
                            <TouchableOpacity
                                style={[styles.settingItem, { borderBottomColor: '#E9ECEF' }]}
                                onPress={() => setHelpModalVisible(true)}
                            >
                                <Text style={[styles.settingText, { color: '#000' }]}>Help Center</Text>
                                <Text style={[styles.arrowText, { color: '#666' }]}>›</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.settingItem, { borderBottomColor: '#E9ECEF' }]}
                                onPress={() => setTermsModalVisible(true)}
                            >
                                <Text style={[styles.settingText, { color: '#000' }]}>Terms & Conditions</Text>
                                <Text style={[styles.arrowText, { color: '#666' }]}>›</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.settingItem, { borderBottomColor: '#E9ECEF' }]}
                                onPress={() => setPolicyModalVisible(true)}
                            >
                                <Text style={[styles.settingText, { color: '#000' }]}>Privacy Policy</Text>
                                <Text style={[styles.arrowText, { color: '#666' }]}>›</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.settingItem, styles.lastItem]}
                                onPress={() => setFeedbackModalVisible(true)}
                            >
                                <Text style={[styles.settingText, { color: '#000' }]}>Feedback</Text>
                                <Text style={[styles.arrowText, { color: '#666' }]}>›</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.accountActions}>
                            <View style={styles.actionButtonsRow}>
                                <TouchableOpacity
                                    style={[styles.logoutButton, { backgroundColor: '#fff', borderColor: '#E9ECEF' }]}
                                    onPress={handleLogout}
                                >
                                    <Text style={[styles.logoutText, { color: '#000' }]}>Logout</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.deleteAccountButton}
                                    onPress={handleDeleteAccount}
                                >
                                    <Text style={[styles.deleteAccountText, { color: '#FF3B30' }]}>Delete Account</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.versionContainer}>
                            <Text style={[styles.versionText, { color: '#666' }]}>Version 1.0.0</Text>
                        </View>
                    </View>
                </ScrollView>
            )}

            <View style={[styles.bottomNav, { borderTopColor: '#E9ECEF' }]}>
                <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                    <Image source={require('../assets/film.png')} style={[styles.navIcon]} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('CreatePost')}>
                    <Image source={require('../assets/plus3.png')} style={[styles.navIcon]} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Reel')}>
                    <Image source={require('../assets/bell.png')} style={[styles.navIcon]} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                    <Image source={require('../assets/settings.png')} style={[styles.navIcon]} />
                </TouchableOpacity>
            </View>

            {/* Account Details Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={accountModalVisible}
                onRequestClose={() => setAccountModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: '#000' }]}>Account Details</Text>
                        <Text style={[styles.modalText, { color: '#666' }]}>
                            Manage your PITCH account details below:
                            {"\n\n"}• Username: {userData?.username || 'Not set'}
                            {"\n"}• Email: {userData?.email || 'Not set'}
                            {"\n"}• Account Type: {userData?.accountType || 'Entrepreneur'}
                            {"\n"}• Member Since: {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#fff', borderColor: '#E9ECEF' }]}
                                onPress={() => setAccountModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: '#000' }]}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#1f219c' }]}
                                onPress={() => {
                                    setAccountModalVisible(false);
                                    navigation.navigate('EditProfile', { userData });
                                }}
                            >
                                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Privacy Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={privacyModalVisible}
                onRequestClose={() => setPrivacyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: '#000' }]}>Privacy</Text>
                        <Text style={[styles.modalText, { color: '#666' }]}>
                            Your privacy settings control who can see your PITCH profile and content:
                            {"\n\n"}• Profile Visibility: Choose who can view your profile (Public, Investors Only, Private)
                            {"\n"}• Pitch Visibility: Control who can see your startup pitches
                            {"\n"}• Connection Requests: Manage who can send you connection requests
                            {"\n"}• Data Sharing: Opt in/out of sharing analytics with investors
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#fff', borderColor: '#E9ECEF' }]}
                                onPress={() => setPrivacyModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: '#000' }]}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#1f219c' }]}
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

            {/* Security Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={securityModalVisible}
                onRequestClose={() => setSecurityModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: '#000' }]}>Security</Text>
                        <Text style={[styles.modalText, { color: '#666' }]}>
                            Keep your PITCH account secure:
                            {"\n\n"}• Password: Update your password regularly
                            {"\n"}• Two-Factor Authentication: Add an extra layer of security
                            {"\n"}• Login Activity: Review recent login attempts
                            {"\n"}• Authorized Devices: Manage trusted devices
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#fff', borderColor: '#E9ECEF' }]}
                                onPress={() => setSecurityModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: '#000' }]}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#1f219c' }]}
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

            {/* Profile Visibility Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={visibilityModalVisible}
                onRequestClose={() => setVisibilityModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: '#000' }]}>Profile Visibility</Text>
                        <Text style={[styles.modalText, { color: '#666' }]}>
                            Control who can see your PITCH profile:
                            {"\n\n"}• Public: Visible to all users
                            {"\n"}• Investors Only: Visible only to verified investors
                            {"\n"}• Private: Visible only to your connections
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#fff', borderColor: '#E9ECEF' }]}
                                onPress={() => setVisibilityModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: '#000' }]}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#1f219c' }]}
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

            {/* Help Center Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={helpModalVisible}
                onRequestClose={() => setHelpModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: '#000' }]}>Help Center</Text>
                        <Text style={[styles.modalText, { color: '#666' }]}>
                            Get assistance with PITCH:
                            {"\n\n"}• FAQ: Common questions about profiles and pitches
                            {"\n"}• Contact Us: support@pitchapp.com
                            {"\n"}• Tutorials: Learn how to optimize your startup pitch
                            {"\n"}• Report Issue: Submit technical problems
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#fff', borderColor: '#E9ECEF' }]}
                                onPress={() => setHelpModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: '#000' }]}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#1f219c' }]}
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

            {/* Terms & Conditions Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={termsModalVisible}
                onRequestClose={() => setTermsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: '#000' }]}>Terms & Conditions</Text>
                        <ScrollView style={styles.modalScroll}>
                            <Text style={[styles.modalText, { color: '#666' }]}>
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
                                style={[styles.modalButton, { backgroundColor: '#fff', borderColor: '#E9ECEF' }]}
                                onPress={() => setTermsModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: '#000' }]}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#1f219c' }]}
                                onPress={() => {
                                    setTermsModalVisible(false);
                                    // Add link to full terms if needed
                                }}
                            >
                                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Accept</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Privacy Policy Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={policyModalVisible}
                onRequestClose={() => setPolicyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: '#000' }]}>Privacy Policy</Text>
                        <ScrollView style={styles.modalScroll}>
                            <Text style={[styles.modalText, { color: '#666' }]}>
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
                                style={[styles.modalButton, { backgroundColor: '#fff', borderColor: '#E9ECEF' }]}
                                onPress={() => setPolicyModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: '#000' }]}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#1f219c' }]}
                                onPress={() => setPolicyModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Understood</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Feedback Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={feedbackModalVisible}
                onRequestClose={() => setFeedbackModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: '#000' }]}>Submit Feedback</Text>
                        <TextInput
                            style={[styles.feedbackInput, {
                                color: '#000',
                                borderColor: '#E9ECEF',
                                backgroundColor: '#F8F9FA'
                            }]}
                            multiline
                            numberOfLines={4}
                            placeholder="Tell us what you think about PITCH..."
                            placeholderTextColor="#666"
                            value={feedbackText}
                            onChangeText={setFeedbackText}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#fff', borderColor: '#E9ECEF' }]}
                                onPress={() => setFeedbackModalVisible(false)}
                                disabled={feedbackSubmitting}
                            >
                                <Text style={[styles.modalButtonText, { color: '#000' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#1f219c' }]}
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
        fontSize: 22,
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
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        borderTopWidth: 1,
        height: Platform.OS === 'ios' ? 70 : 48,
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
    modalText: {
        fontSize: 14,
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
        borderRadius: 8,
        padding: 10,
        marginBottom: 20,
        textAlignVertical: 'top',
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
    },
    modalButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
});