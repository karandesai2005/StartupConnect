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
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NGROK_URL } from '@env';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';

// Function to get a proper file URI (Fixes Android content:// issue)
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
  const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Needed',
            'Sorry, we need media permissions to make this work!'
          );
        }
      }
    })();
  }, []);

  const pickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need media permissions to proceed.');
        return;
      }

      console.log('Opening media picker...');
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow images & videos
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      console.log('Media Picker Result:', JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedMedia = result.assets[0];
        const type = selectedMedia.type; // 'image' or 'video'

        console.log(`Selected media type: ${type}`);
        setMedia(selectedMedia.uri);
        setMediaType(type);
      } else {
        console.log('Media selection was canceled');
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Media Selection Error', error.message);
    }
  };

  const uploadPost = async () => {
    if (!media) {
      alert('Please select an image or video');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found. User might be logged out.');
        return;
      }

      // Fix: Ensure correct file URI handling
      let fileUri = await getFileUri(media);
      let fileType = media.split('.').pop();
      let mimeType = mediaType === 'video' ? `video/${fileType}` : `image/${fileType}`;

      const formData = new FormData();
      formData.append('content', caption.trim() || 'No caption');
      formData.append('media', {
        uri: fileUri,
        name: `upload.${fileType}`,
        type: mimeType,
      });

      console.log('Uploading formData:', formData._parts);

      const response = await fetch(`${NGROK_URL}/api/posts/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        alert('Post uploaded successfully!');
        navigation.goBack();
      } else {
        const errorData = await response.json();
        alert(`Failed to upload post: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickMedia} style={styles.mediaPicker}>
        {media ? (
          mediaType === 'image' ? (
            <Image source={{ uri: media }} style={styles.media} />
          ) : (
            <Video
              source={{ uri: media }}
              style={styles.media}
              useNativeControls
              resizeMode="contain"
            />
          )
        ) : (
          <Text>Select an Image or Video</Text>
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
  mediaPicker: {
    width: 300,
    height: 300,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 20,
  },
  media: {
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
