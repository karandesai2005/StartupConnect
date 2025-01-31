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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from "@react-native-async-storage/async-storage";

const EditProfilePage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userData } = route.params;

  const [updatedBio, setUpdatedBio] = useState(userData?.bio || '');
  const [updatedProfileImage, setUpdatedProfileImage] = useState(userData?.profile_picture || null);

  // Request permission and select an image
  const handleProfilePictureChange = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Allow access to media library to change profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: false,
    });

    if (!result.canceled) {
      setUpdatedProfileImage(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();
  
      formData.append('bio', updatedBio);
  
      if (updatedProfileImage && updatedProfileImage !== userData.profile_picture) {
        formData.append('profile_picture', {
          uri: updatedProfileImage,
          type: 'image/jpeg',
          name: 'profile_picture.jpg',
        });
      }
  
      console.log("Updating profile with:", updatedBio, updatedProfileImage);
  
      const response = await fetch("https://552d-202-71-156-66.ngrok-free.app/api/auth/update-profile", {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
  
      if (response.ok) {
        const updatedUser = await response.json();
        console.log("Update response:", updatedUser);
  
        // 🔥 Store updated profile in AsyncStorage
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
  
        // 🔥 Navigate back and force refresh
        navigation.navigate('Profile', {
          updatedUser,
          forceRefresh: true,
          timestamp: Date.now(),
        });
      } else {
        const errorText = await response.text();
        console.error("Server error:", errorText);
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };
  
  
  

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSaveProfile} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TouchableOpacity onPress={handleProfilePictureChange} style={styles.imageContainer}>
          <Image
            source={updatedProfileImage ? { uri: updatedProfileImage } : require('../../../assets/del.png')}
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
      </View>
    </ScrollView>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 13
  },
  backButton: {
    padding: 8,
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
    marginBottom: 8,
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
  }
});

export default EditProfilePage;
