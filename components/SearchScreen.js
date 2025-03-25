// components/SearchScreen.js
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NGROK_URL } from '@env';
import { debounce } from 'lodash';

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
        const token = await AsyncStorage.getItem('token');
        const baseUrl = NGROK_URL.replace(/\/+$/, '');
        const response = await axios.get(`${baseUrl}/api/auth/search-users`, {
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
      }
    }, 300),
    []
  );

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    searchUsers(text);
  };

  const handleUserPress = (item) => {
    console.log("Selected Team Member:", item); // Add this to debug
    setSearchQuery('');
    setSearchResults([]);
    navigation.navigate('Profile', {
      selectedTeamMember: {
        username: item.username,
        profile_picture: item.profile_picture,
      },
    });
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleUserPress(item)} // Pass the full item object, not just item.username
    >
      <Image
        source={
          item.profile_picture
            ? { uri: item.profile_picture }
            : require('../assets/del.png')
        }
        style={styles.searchAvatar}
      />
      <Text style={styles.searchUsername}>{item.username}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require('../assets/Arrow.png')} // Replace with your back arrow icon
            style={styles.backIcon}
          />
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
      <FlatList
        data={searchResults}
        renderItem={renderSearchResult}
        keyExtractor={(item) => item.user_id.toString()}
        style={styles.searchResultsList}
        keyboardShouldPersistTaps="handled"
      />
    </KeyboardAvoidingView>
    
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    marginTop: Platform.OS === 'ios' ? 37 : 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 80,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 8,
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  searchBar: {
    //flex: 1,
    paddingHorizontal: 15,
    backgroundColor: '#eee',
    borderRadius: 20,
    height: 40,
    width: 270,
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