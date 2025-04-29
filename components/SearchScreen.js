import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NGROK_URL } from '@env';
import { debounce } from 'lodash';
import { supabase } from '../services/supabase'; // Import Supabase client

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const navigation = useNavigation();

  const searchUsers = useCallback(
    debounce(async (query) => {
      if (!query) {
        setSearchResults([]);
        return;
      }
      try {
        let token = await AsyncStorage.getItem('token');
        if (!token) {
          console.log('No token, refreshing session');
          const { data: { session }, error } = await supabase.auth.refreshSession();
          if (error || !session) {
            console.error('Session refresh failed:', error?.message);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            return;
          }
          token = session.access_token;
          await AsyncStorage.setItem('token', token);
        }

        const baseUrl = NGROK_URL.replace(/\/+$/, '');
        const response = await axios.get(`${baseUrl}/api/profile/search`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          params: { q: query },
        });
        setSearchResults(response.data || []);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
        Alert.alert('Error', 'Failed to search users. Please try again.');
      }
    }, 300),
    []
  );

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    searchUsers(text);
  };

  const handleUserPress = (username) => {
    setSearchQuery('');
    setSearchResults([]);
    navigation.navigate('Profile', { username, isOtherUser: true });
  };

  const renderSearchResult = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.searchResultItem}
        onPress={() => handleUserPress(item.username)}
      >
        <Image
          source={
            item.profile_picture
              ? { uri: item.profile_picture }
              : require('../assets/profiledefault.jpg')
          }
          style={styles.searchAvatar}
          onError={(e) => {
            console.error(`Profile picture load error for ${item.username}:`, e.nativeEvent.error);
          }}
        />
        <Text style={styles.searchUsername}>{item.username}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchBar}
          placeholder="Search..."
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoFocus={true}
        />
      </View>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.user_id.toString()}
          style={styles.searchResultsList}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 80,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  searchBar: {
    paddingHorizontal: 15,
    backgroundColor: '#eee',
    borderRadius: 20,
    height: 40,
    width: 270,
  },
  keyboardAvoid: {
    flex: 1,
  },
  backButtonText: {
    fontSize: 32,
    color: '#000',
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  searchUsername: {
    fontSize: 16,
    color: '#212529',
  },
});

export default SearchScreen;