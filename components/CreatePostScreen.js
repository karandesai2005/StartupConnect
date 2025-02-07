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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NGROK_URL } from '@env';
import { useNavigation } from '@react-navigation/native';

export default function CreatePostScreen() {
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        // Request permission to access media library
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Needed',
            'Sorry, we need camera roll permissions to make this work!'
          );
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      // Request permission again if needed
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Sorry, we need camera roll permissions to select an image.'
        );
        return;
      }

      console.log('Opening image picker...');
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ Ensures only images are picked
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      console.log('Image Picker Result:', JSON.stringify(result, null, 2));

      if (!result.canceled) {
        console.log('Image selected:', result.assets[0].uri);
        setImage(result.assets[0].uri); // ✅ Corrected access to selected image URI
      } else {
        console.log('Image selection was canceled');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Image Selection Error', error.message);
    }
  };

  const uploadPost = async () => {
    if (!image) {
      alert('Please select an image');
      console.log('Upload attempt failed: No image selected.');
      return;
    }
  
    setLoading(true);
    console.log('Starting upload...');
  
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found. User might be logged out.');
        return;
      }
  
      // Create form data
      const formData = new FormData();
      
      // Add the content field (changed from caption to content)
      formData.append('content', caption.trim() || 'No caption');
      
      // Add the image file
      formData.append('image', {
        uri: image,
        name: image.split('/').pop(),
        type: 'image/jpeg',
      });
  
      console.log("Uploading formData:", formData._parts);
  
      const response = await fetch(`${NGROK_URL}/api/posts/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
  
      console.log('Upload response status:', response.status);
  
      if (response.ok) {
        alert('Post uploaded successfully!');
        console.log('Post uploaded successfully.');
        navigation.goBack();
      } else {
        const errorData = await response.json();
        alert(`Failed to upload post: ${errorData.error}`);
        console.log('Upload failed. Response:', errorData);
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message);
    } finally {
      setLoading(false);
      console.log('Upload process completed.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <Text>Select an Image</Text>
        )}
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder='Write a caption...'
        value={caption}
        onChangeText={(text) => {
          console.log('Caption updated:', text);
          setCaption(text);
        }}
      />
      <TouchableOpacity onPress={uploadPost} style={styles.uploadButton}>
        {loading ? (
          <ActivityIndicator color='#fff' />
        ) : (
          <Text style={styles.uploadText}>Upload</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  imagePicker: {
    width: 300,
    height: 300,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 10,
  },
  uploadButton: {
    backgroundColor: '#1f219c',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
  },
  uploadText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
