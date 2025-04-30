import React, { useState, useEffect } from 'react';
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
import { supabase } from '../services/supabase';
import * as FileSystem from 'expo-file-system';
import * as mime from 'react-native-mime-types';

const entrepreneurTechTags = [
  'Entrepreneurship', 'Startup', 'Technology', 'Innovation', 'Business',
  'AI', 'Blockchain', 'Web3', 'FinTech', 'SaaS', 'Ecommerce', 'Marketing',
  'VentureCapital', 'Productivity', 'SoftwareDev', 'PITCH2025', 'Ideathon',
  'WannaGetFunded', 'CofounderStory'
];

export default function SelectTagsScreen() {
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const { media, mediaType, caption = '', fromEvent = false, eventTag } = route.params;

  useEffect(() => {
    if (fromEvent && eventTag) {
      setSelectedTags([eventTag]);
    }
  }, [fromEvent, eventTag]);

  const toggleTag = (tag) => {
    if (tag === eventTag) return;
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const uploadPost = async () => {
    try {
      setLoading(true);
      
      // 1. Get or refresh token
      let token = await AsyncStorage.getItem('token');
      if (!token) {
        const { data: { session }, error } = await supabase.auth.refreshSession();
        if (error || !session) throw new Error('Session refresh failed');
        token = session.access_token;
        await AsyncStorage.setItem('token', token);
      }

      // 2. Verify file exists and get info
      const fileInfo = await FileSystem.getInfoAsync(media);
      if (!fileInfo.exists) throw new Error('File does not exist');
      
      console.log('File info:', {
        size: fileInfo.size,
        uri: media,
        type: mediaType
      });

      // 3. Prepare FormData with proper MIME type
      const formData = new FormData();
      formData.append('content', caption || '');
      formData.append('tags', JSON.stringify(selectedTags));
      
      const fileExtension = media.split('.').pop();
      const mimeType = mime.lookup(fileExtension) || 
                      (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');

      formData.append('media', {
        uri: media,
        type: mimeType,
        name: `post-${Date.now()}.${fileExtension}`,
      });

      // 4. HTTP call with enhanced error handling
      const baseUrl = NGROK_URL.replace(/\/+$/, '').replace('https://', 'http://');
      const url = `${baseUrl}/api/posts`;
      
      console.log('Uploading to:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      // 5. Handle response
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Upload failed (${response.status})`);
      }

      Alert.alert('Success', 'Post uploaded successfully!');
      navigation.navigate('Main', { forceRefresh: true });
    } catch (error) {
      console.error('Upload error:', {
        message: error.message,
        stack: error.stack,
      });
      Alert.alert(
        'Upload Failed', 
        error.message || 'Please check your connection and try again'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
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
          {eventTag && (
            <View style={[styles.tagButton, styles.eventTagButton]}>
              <Text style={[styles.tagText, styles.tagTextSelected]}>{eventTag}</Text>
            </View>
          )}
          {entrepreneurTechTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[styles.tagButton, selectedTags.includes(tag) && styles.tagButtonSelected]}
            >
              <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}>
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
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
    backgroundColor: '#fff',
  },
  backButton: { padding: 8 },
  headerText: { fontSize: 18, fontWeight: '700', color: '#000' },
  postButton: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#0095f6', borderRadius: 4 },
  postButtonDisabled: { backgroundColor: '#0095f660' },
  postButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  scrollContainer: { padding: 16, flexGrow: 1 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f0f0f0' },
  tagButtonSelected: { backgroundColor: '#00cc00' },
  tagText: { fontSize: 14, color: '#262626' },
  tagTextSelected: { color: '#fff' },
  eventTagButton: { backgroundColor: '#00cc00', borderWidth: 2, borderColor: '#008800' },
});