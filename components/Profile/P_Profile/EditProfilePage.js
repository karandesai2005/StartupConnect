import React, { useState } from 'react';
  import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
    SafeAreaView,
  } from 'react-native';
  import { useNavigation, useRoute } from '@react-navigation/native';
  import * as ImagePicker from 'expo-image-picker';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { NGROK_URL } from '@env';
  import { supabase } from '../services/supabase';

  const EditProfilePage = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { userData } = route.params || {};

    const [updatedBio, setUpdatedBio] = useState(userData?.bio || '');
    const [updatedProfileImage, setUpdatedProfileImage] = useState(userData?.profile_picture || null);
    const [loading, setLoading] = useState(false);

    const handleProfilePictureChange = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow access to media library to change profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setUpdatedProfileImage(result.assets[0].uri);
      }
    };

    const handleSaveProfile = async () => {
      if (loading) return;
      setLoading(true);

      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          const { data: { session }, error } = await supabase.auth.refreshSession();
          if (error || !session) {
            throw new Error('Session refresh failed');
          }
          await AsyncStorage.setItem('token', session.access_token);
        }

        const baseUrl = NGROK_URL.replace(/\/+$/, '');
        let updatedUser = { ...userData };

        // Update bio if changed
        if (updatedBio !== userData?.bio) {
          console.log('Updating bio at:', `${baseUrl}/api/profile`);
          const bioResponse = await fetch(`${baseUrl}/api/profile`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bio: updatedBio }),
          });

          if (!bioResponse.ok) {
            const errorText = await bioResponse.text();
            throw new Error(`Bio update failed: ${errorText}`);
          }

          updatedUser = await bioResponse.json();
          console.log('Bio update response:', updatedUser);
        }

        // Update profile picture if changed
        if (updatedProfileImage && updatedProfileImage !== userData?.profile_picture && !updatedProfileImage.startsWith('http')) {
          const formData = new FormData();
          formData.append('profile_picture', {
            uri: updatedProfileImage,
            type: 'image/jpeg',
            name: `profile-${Date.now()}.jpg`,
          });

          console.log('Uploading profile picture to:', `${baseUrl}/api/profile/profile-picture`);
          const imageResponse = await fetch(`${baseUrl}/api/profile/profile-picture`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
            body: formData,
          });

          if (!imageResponse.ok) {
            const errorText = await imageResponse.text();
            throw new Error(`Profile picture upload failed: ${errorText}`);
          }

          const imageData = await imageResponse.json();
          updatedUser = imageData.user;
          console.log('Profile picture update response:', updatedUser);
        }

        // Store updated profile
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        Alert.alert('Success', 'Profile updated!');
        navigation.navigate('Profile', {
          username: updatedUser.username,
          isOtherUser: false,
          forceRefresh: true,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Update profile error:', error);
        Alert.alert('Error', `Failed to update profile: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSaveProfile} style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
            <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <TouchableOpacity onPress={handleProfilePictureChange} style={styles.imageContainer}>
            <Image
              source={updatedProfileImage ? { uri: updatedProfileImage } : require('../assets/profiledefault.jpg')}
              style={styles.profileImage}
            />
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={styles.bioInput}
              value={updatedBio}
              onChangeText={setUpdatedBio}
              placeholder="Write something about yourself..."
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    backButton: {
      paddingLeft: 8,
    },
    backButtonText: {
      color: '#666',
      fontSize: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    saveButton: {
      padding: 8,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: '#007bff',
      fontSize: 16,
      fontWeight: '600',
    },
    content: {
      padding: 16,
    },
    imageContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    profileImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 12,
      color: '#333',
      borderColor: '#333',
      borderWidth: 0.25,
    },
    changePhotoText: {
      color: '#007bff',
      fontSize: 16,
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: '#333',
    },
    bioInput: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      minHeight: 100,
      textAlignVertical: 'top',
    },
  });

  export default EditProfilePage;