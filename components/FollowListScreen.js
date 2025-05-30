import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NGROK_URL } from "@env";
import { useNavigation } from "@react-navigation/native";

const FollowListScreen = ({ route }) => {
  const { username, type } = route.params; // type is either "followers" or "following"
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.navigate("Login");
        return;
      }

      const baseUrl = NGROK_URL.replace(/\/+$/, "");
      const endpoint =
        type === "followers"
          ? `${baseUrl}/api/profile/followers/${username}`
          : `${baseUrl}/api/profile/following/${username}`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch ${type}: ${errorText}`);
      }

      const data = await response.json();
      setUsers(data);
      setIsLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error.message);
      Alert.alert("Error", `Failed to fetch ${type}: ${error.message}`);
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [username, type, navigation]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigation.navigate("Profile", { username: item.username })}
    >
      <Image
        source={
          item.profile_picture && !item.profile_picture.includes("undefined")
            ? { uri: item.profile_picture }
            : require("../assets/profiledefault.jpg")
        }
        style={styles.profileImage}
        resizeMode="cover"
      />
      <Text style={styles.username}>{item.username}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#007BFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>
        {type === "followers" ? "Followers" : "Following"} ({users.length})
      </Text>
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.user_id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.noUsersText}>
            No {type === "followers" ? "followers" : "following"} found.
          </Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  backButton: { position: "absolute", left: 10, top: 10, zIndex: 1 },
  backButtonText: { fontSize: 32, color: "#000" },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    padding: 20,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: { fontSize: 16, color: "#000", fontWeight: "500" },
  noUsersText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    padding: 20,
  },
});

export default FollowListScreen;