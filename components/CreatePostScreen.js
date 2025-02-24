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
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedMedia = result.assets[0];
        const type = selectedMedia.type;
        setMedia(selectedMedia.uri);
        setMediaType(type);
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerText}>Create New Post</Text>
            </View>

            <TouchableOpacity 
              onPress={pickMedia} 
              style={[
                styles.mediaPicker,
                !media && styles.mediaPickerEmpty
              ]}
            >
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
                <View style={styles.mediaPickerContent}>
                  <Text style={styles.uploadIconText}>📁</Text>
                  <Text style={styles.mediaPickerText}>Tap to select media</Text>
                  <Text style={styles.mediaPickerSubtext}>Choose an image or video</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.captionContainer}>
              <TextInput
                style={styles.input}
                placeholder="Write a caption..."
                placeholderTextColor="#666"
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={2200}
              />
              <Text style={styles.characterCount}>
                {caption.length}/2200
              </Text>
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            onPress={uploadPost} 
            style={[
              styles.uploadButton,
              loading && styles.uploadButtonLoading
            ]}
            disabled={loading || !media}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadText}>Share Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center', // Center content horizontally
  },
  header: {
    width: '100%',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
    alignItems: 'center', // Center header text
  },
  headerText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  mediaPicker: {
    width: '100%', // Take full width
    aspectRatio: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  mediaPickerEmpty: {
    borderWidth: 2,
    borderColor: '#007bff',
    borderStyle: 'dashed',
  },
  mediaPickerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadIconText: {
    fontSize: 48,
    marginBottom: 12,
  },
  mediaPickerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 8,
  },
  mediaPickerSubtext: {
    fontSize: 14,
    color: '#666',
  },
  media: {
    flex: 1,
    borderRadius: 12,
  },
  captionContainer: {
    width: '100%', // Take full width
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
    width: '100%', // Take full width
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  uploadButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%', // Take full width
  },
  uploadButtonLoading: {
    backgroundColor: '#0056b3',
  },
  uploadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});