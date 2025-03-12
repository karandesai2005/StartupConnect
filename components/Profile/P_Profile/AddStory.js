import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { NGROK_URL } from '@env';
import { Ionicons, Feather } from '@expo/vector-icons';

const AddStory = ({ onStoryAdded }) => {
  const navigation = useNavigation();
  const [mediaUri, setMediaUri] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [isLoadingUsername, setIsLoadingUsername] = useState(true);

  useEffect(() => {
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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need media permissions to make this work!');
      }
    })();
  }, []);

  const pickAndUploadMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('We need media permissions to proceed.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for stories
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedMedia = result.assets[0];
        setMediaUri(selectedMedia.uri);
        await uploadStory(selectedMedia.uri);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      setError('Failed to pick media. Please try again.');
      setIsUploading(false);
    }
  };

  const uploadStory = async (uri) => {
    if (!uri) {
      setError('No media selected.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const formData = new FormData();
      const fileType = uri.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
      formData.append('media', {
        uri: uri,
        type: fileType,
        name: `story.${fileType.split('/')[1]}`,
      });

      console.log('Uploading to:', `${NGROK_URL}/api/profile/stories`);
      const response = await fetch(`${NGROK_URL}/api/profile/stories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload story: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Story uploaded successfully:', result);

      if (onStoryAdded) await onStoryAdded();
      navigation.goBack();
    } catch (err) {
      console.error('Error uploading story:', err);
      setError('Failed to upload story. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Add New Story</Text>
        <TouchableOpacity onPress={pickAndUploadMedia} disabled={isUploading} style={styles.nextButton}>
          <Text style={[styles.nextButtonText, isUploading && styles.nextButtonDisabled]}>
            {isUploading ? <ActivityIndicator size="small" color="#0095f6" /> : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {isUploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#0095f6" />
              <Text style={styles.uploadingText}>Uploading your story...</Text>
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <TouchableOpacity onPress={pickAndUploadMedia} style={styles.mediaPickerEmpty}>
                <View style={styles.mediaPickerContent}>
                  <Feather name="image" size={60} color="#1f219c" />
                  <Text style={styles.mediaPickerText}>Select from Gallery</Text>
                </View>
              </TouchableOpacity>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dbdbdb',
  },
  cancelButton: { padding: 8 },
  headerText: { fontSize: 17, fontWeight: '600' },
  nextButton: { padding: 8 },
  nextButtonText: { fontSize: 17, fontWeight: '600', color: '#0095f6' },
  nextButtonDisabled: { color: '#0095f660' },
  scrollContainer: { flexGrow: 1 },
  container: { flex: 1 },
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  uploadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  uploadingText: { fontSize: 16, color: '#262626', marginTop: 8 },
  mediaPickerEmpty: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 300,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbdbdb',
  },
  mediaPickerContent: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  mediaPickerText: { fontSize: 18, fontWeight: '500', color: '#1f219c', marginTop: 12 },
  errorText: { fontSize: 14, color: 'red', marginTop: 8, textAlign: 'center' },
});

export default AddStory;