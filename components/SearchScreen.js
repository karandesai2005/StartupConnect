import React, { useState, useCallback } from "react";
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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NGROK_URL } from "@env";
import { debounce } from "lodash";
import { supabase } from "../services/supabase";

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  const searchUsers = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 1) {
        setSearchResults([]);
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        let token = await AsyncStorage.getItem("token");
        if (!token) {
          console.log("No token, refreshing session");
          const {
            data: { session },
            error,
          } = await supabase.auth.refreshSession();
          if (error || !session) {
            console.error("Session refresh failed:", error?.message);
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            return;
          }
          token = session.access_token;
          await AsyncStorage.setItem("token", token);
        }

        const baseUrl = NGROK_URL.replace(/\/+$/, "");
        const searchUrl = `${baseUrl}/api/search-users`;
        console.log("Search query:", query); // Log the query
        console.log(
          "Full request URL:",
          `${searchUrl}?q=${encodeURIComponent(query)}`
        ); // Log the full URL
        console.log("Token:", token); // Log the token (partially for security)
        const response = await axios.get(searchUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          params: { q: query },
          timeout: 10000,
        });

        console.log("Search response:", response.data);
        setSearchResults(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error searching users:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          requestUrl: error.config?.url,
          requestParams: error.config?.params,
        });
        setSearchResults([]);
        Alert.alert(
          "Error",
          `Failed to search users: ${error.message}. Please check your network and try again.`
        );
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [navigation]
  );

  const handleSearchChange = (text) => {
    const trimmedText = text.trim();
    setSearchQuery(trimmedText);
    if (trimmedText.length > 0) {
      searchUsers(trimmedText);
    } else {
      setSearchResults([]);
      setIsLoading(false);
    }
  };

  const handleUserPress = (username) => {
    setSearchQuery("");
    setSearchResults([]);
    navigation.navigate("Profile", { username, isOtherUser: true });
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
              : require("../assets/profiledefault.jpg")
          }
          style={styles.searchAvatar}
          onError={(e) => {
            console.error(
              `Profile picture load error for ${item.username}:`,
              e.nativeEvent.error
            );
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : searchResults.length === 0 && searchQuery ? (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>No users found</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.user_id.toString()}
            style={styles.searchResultsList}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 80,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  backButtonText: {
    fontSize: 32,
    color: "#000",
  },
  searchBar: {
    paddingHorizontal: 15,
    backgroundColor: "#eee",
    borderRadius: 20,
    height: 40,
    width: 270,
  },
  keyboardAvoid: {
    flex: 1,
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  searchUsername: {
    fontSize: 16,
    color: "#212529",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 16,
    color: "#666",
  },
});

export default SearchScreen;
