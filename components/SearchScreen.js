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
<<<<<<< HEAD
import { useNavigation, useRoute } from '@react-navigation/native';
=======
import { useNavigation } from '@react-navigation/native';
>>>>>>> aa067c21842c0564d437bbe6af6168e1f03c4bbf
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NGROK_URL } from '@env';
import { debounce } from 'lodash';

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const navigation = useNavigation();
<<<<<<< HEAD
  const route = useRoute();
  const { onTeamMemberSelected } = route.params || {};
=======
>>>>>>> aa067c21842c0564d437bbe6af6168e1f03c4bbf

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

<<<<<<< HEAD
  const handleUserPress = (user) => {
    setSearchQuery('');
    setSearchResults([]);
    if (onTeamMemberSelected) {
      // If this screen was opened to select a team member, call the callback
      onTeamMemberSelected(user);
      navigation.goBack(); // Return to the Profile screen
    } else {
      // Otherwise, navigate to the user's profile
      navigation.navigate('Profile', { username: user.username, isOtherUser: true });
    }
=======
  const handleUserPress = (username) => {
    setSearchQuery('');
    setSearchResults([]);
    navigation.navigate('Profile', { username, isOtherUser: true });
>>>>>>> aa067c21842c0564d437bbe6af6168e1f03c4bbf
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
<<<<<<< HEAD
      onPress={() => handleUserPress(item)}
=======
      onPress={() => handleUserPress(item.username)}
>>>>>>> aa067c21842c0564d437bbe6af6168e1f03c4bbf
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
<<<<<<< HEAD
          placeholder="Search team members..."
=======
          placeholder="Search..."
>>>>>>> aa067c21842c0564d437bbe6af6168e1f03c4bbf
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
<<<<<<< HEAD
=======
    
>>>>>>> aa067c21842c0564d437bbe6af6168e1f03c4bbf
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
<<<<<<< HEAD
=======
    //flex: 1,
>>>>>>> aa067c21842c0564d437bbe6af6168e1f03c4bbf
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