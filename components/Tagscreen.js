import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NGROK_URL } from '@env';
import { Ionicons } from '@expo/vector-icons';

const entrepreneurTechTags = [
  'Entrepreneurship',
  'Startup',
  'Technology',
  'Innovation',
  'Business',
  'AI',
  'Blockchain',
  'Web3',
  'FinTech',
  'SaaS',
  'Ecommerce',
  'Marketing',
  'VentureCapital',
  'Productivity',
  'SoftwareDev',
];

export default function SelectTagsScreen() {
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const { media, mediaType, caption } = route.params;

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const uploadPost = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      formData.append('caption', caption);
      formData.append('tags', JSON.stringify(selectedTags));

      // Handle media file
      const fileUri = media;
      const fileInfo = await fetch(fileUri);
      const blob = await fileInfo.blob();
      
      formData.append('media', {
        uri: fileUri,
        type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        name: `media.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
      });

      const response = await fetch(`${NGROK_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload post');
      }

      Alert.alert('Success', 'Post uploaded successfully!');
      navigation.navigate('Home'); // Or wherever you want to redirect after posting
    } catch (error) {
      console.error('Error uploading post:', error);
      Alert.alert('Upload Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Add Tags</Text>
        <TouchableOpacity
          onPress={uploadPost}
          disabled={loading}
          style={[styles.postButton, loading && styles.postButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.tagsContainer}>
          {entrepreneurTechTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[
                styles.tagButton,
                selectedTags.includes(tag) && styles.tagButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  selectedTags.includes(tag) && styles.tagTextSelected,
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dbdbdb',
  },
  backButton: { padding: 8 },
  headerText: { fontSize: 17, fontWeight: '600' },
  postButton: {
    padding: 8,
    backgroundColor: '#0095f6',
    borderRadius: 4,
  },
  postButtonDisabled: {
    backgroundColor: '#0095f660',
  },
  postButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  scrollContainer: {
    padding: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  tagButtonSelected: {
    backgroundColor: '#00cc00', // Green when selected
  },
  tagText: {
    fontSize: 14,
    color: '#262626',
  },
  tagTextSelected: {
    color: '#fff',
  },
});