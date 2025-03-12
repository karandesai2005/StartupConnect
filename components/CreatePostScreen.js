import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NGROK_URL } from '@env';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { Ionicons, Feather } from '@expo/vector-icons';

const getFileUri = async (uri) => {
  if (Platform.OS === 'android' && uri.startsWith('content://')) {
    const fileUri = `${FileSystem.cacheDirectory}tempUpload`;
    await FileSystem.copyAsync({ from: uri, to: fileUri });
    return fileUri;
  }
  return uri;
};

export default function CreatePostScreen() {
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [isLoadingUsername, setIsLoadingUsername] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    const fetchUserProfile = async () => {
      try {
        setIsLoadingUsername(true);
        const cachedUsername = await AsyncStorage.getItem('username');
        const cachedProfilePic = await AsyncStorage.getItem('profilePic');
        if (cachedUsername) {
          setUsername(cachedUsername);
          if (cachedProfilePic) setProfilePic(cachedProfilePic);
          setIsLoadingUsername(false);
          return;
        }

        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(`${NGROK_URL}/api/profile`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to fetch profile');

        const profileData = await response.json();
        setUsername(profileData.username || 'User');
        if (profileData.profile_picture) {
          const profilePicUrl = `${NGROK_URL}${profileData.profile_picture}`;
          setProfilePic(profilePicUrl);
          await AsyncStorage.setItem('profilePic', profilePicUrl);
        }
        await AsyncStorage.setItem('username', profileData.username || 'User');
      } catch (error) {
        console.error('Error fetching profile:', error);
        setUsername('User');
      } finally {
        setIsLoadingUsername(false);
      }
    };

    fetchUserProfile();

    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Sorry, we need media permissions to make this work!');
        }
      }
    })();

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const pickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need media permissions to proceed.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedMedia = result.assets[0];
        setMedia(selectedMedia.uri);
        setMediaType(selectedMedia.type);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Media Selection Error', error.message);
    }
  };

  const nextStep = () => {
    if (!media) {
      Alert.alert('No Media', 'Please select an image or video first');
      return;
    }
    navigation.navigate('SelectTags', { media, mediaType, caption });
  };

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerText}>New Post</Text>
          <TouchableOpacity onPress={nextStep} disabled={loading || !media} style={styles.nextButton}>
            <Text style={[styles.nextButtonText, (!media) && styles.nextButtonDisabled]}>Next</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            {media ? (
              <View style={styles.contentContainer}>
                <View style={styles.mediaContainer}>
                  {mediaType === 'video' ? (
                    <Video source={{ uri: media }} style={styles.selectedMedia} useNativeControls resizeMode="cover" />
                  ) : (
                    <Image source={{ uri: media }} style={styles.selectedMedia} />
                  )}
                  <TouchableOpacity onPress={pickMedia} style={styles.changeMediaButton}>
                    <Feather name="camera" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.captionSection}>
                  <View style={styles.userInfoContainer}>
                    {isLoadingUsername ? (
                      <ActivityIndicator size="small" color="#0095f6" style={styles.profilePic} />
                    ) : profilePic ? (
                      <Image source={{ uri: profilePic }} style={styles.profilePic} />
                    ) : (
                      <View style={styles.profilePic} />
                    )}
                    {isLoadingUsername ? (
                      <ActivityIndicator size="small" color="#0095f6" />
                    ) : (
                      <Text style={styles.username}>{username}</Text>
                    )}
                  </View>

                  <TextInput
                    style={styles.captionInput}
                    placeholder="Write a caption..."
                    placeholderTextColor="#8e8e8e"
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                    maxLength={2200}
                  />
                  <Text style={styles.characterCount}>{caption.length}/2200</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <TouchableOpacity onPress={pickMedia} style={styles.mediaPickerEmpty}>
                  <View style={styles.mediaPickerContent}>
                    <Feather name="image" size={60} color='#1f219c' />
                    <Text style={styles.mediaPickerText}>Select from Gallery</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
  keyboardAvoid: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44, borderBottomWidth: 0.5, borderBottomColor: '#dbdbdb' },
  cancelButton: { padding: 8 },
  headerText: { fontSize: 17, fontWeight: '600' },
  nextButton: { padding: 8 },
  nextButtonText: { fontSize: 17, fontWeight: '600', color: '#0095f6' },
  nextButtonDisabled: { color: '#0095f660' },
  scrollContainer: { flexGrow: 1 },
  container: { flex: 1 },
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  contentContainer: { flex: 1 },
  mediaContainer: { width: '100%', aspectRatio: 1, position: 'relative' },
  selectedMedia: { width: '100%', height: '100%' },
  changeMediaButton: { position: 'absolute', bottom: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  mediaPickerEmpty: { width: '100%', aspectRatio: 1, maxWidth: 300, backgroundColor: '#fafafa', borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#dbdbdb', borderStyle: 'dashed' },
  mediaPickerContent: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  mediaPickerText: { fontSize: 18, fontWeight: '500', color: '#1f219c', marginTop: 12 },
  captionSection: { padding: 16 },
  userInfoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  profilePic: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#efefef', marginRight: 10 },
  username: { fontWeight: '600', fontSize: 14 },
  captionInput: { fontSize: 16, color: '#262626', minHeight: 100, textAlignVertical: 'top', padding: 0 },
  characterCount: { fontSize: 12, color: '#8e8e8e', marginTop: 8, textAlign: 'right' },
});