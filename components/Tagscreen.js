import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NGROK_URL } from "@env";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../services/supabase";
import * as FileSystem from "expo-file-system";

const isDev = __DEV__;
const log = (...args) => isDev && console.log(...args);

const entrepreneurTechTags = [
  "Entrepreneurship",
  "Startup",
  "Technology",
  "Innovation",
  "Business",
  "AI",
  "Blockchain",
  "Web3",
  "FinTech",
  "SaaS",
  "Ecommerce",
  "Marketing",
  "VentureCapital",
  "Productivity",
  "SoftwareDev",
  "PITCH2025",
  "Ideathon",
  "WannaGetFunded",
  "CofounderStory",
];

export default function SelectTagsScreen() {
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const {
    media,
    mediaType,
    caption = "",
    fromEvent = false,
    eventTag,
  } = route.params;

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

      const fileInfo = await FileSystem.getInfoAsync(media);
      if (!fileInfo.exists) {
        throw new Error("Media file not found.");
      }
      const mediaSize = fileInfo.size;

      const maxSizeBytes = mediaType === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (mediaSize > maxSizeBytes) {
        throw new Error(
          `Media size exceeds limit (${mediaType === "video" ? "50MB" : "10MB"}). Please choose a smaller file.`
        );
      }

      let token = await AsyncStorage.getItem("token");
      if (!token) {
        log("No token, refreshing session");
        const {
          data: { session },
          error,
        } = await supabase.auth.refreshSession();
        if (error || !session) throw new Error("Session refresh failed");
        token = session.access_token;
        await AsyncStorage.setItem("token", token);
      }

      const formData = new FormData();
      
      // Add content (tags added to content)
      const tagString = selectedTags.join(", ");
      const contentWithTags = caption + (tagString ? ` #${tagString.replace(/, /g, " #")}` : "");
      formData.append("content", contentWithTags || "");

      // Determine file extension and MIME type
      const uriParts = media.split(".");
      const fileExtension = uriParts.length > 1 ? uriParts.pop().toLowerCase() : (mediaType === "video" ? "mp4" : "jpg");
      const fileName = `post-${Date.now()}.${fileExtension}`;
      
      // Determine correct MIME type
      let fileType;
      if (mediaType === "video") {
        if (fileExtension === "mp4") {
          fileType = "video/mp4";
        } else if (fileExtension === "mov") {
          fileType = "video/quicktime";
        } else {
          fileType = "video/mp4"; // Default to mp4 for unknown video extensions
        }
      } else {
        fileType = fileExtension === "png" ? "image/png" : "image/jpeg";
      }

      // Append media file with correct type
      formData.append("media", {
        uri: media,
        type: fileType,
        name: fileName,
      });

      // Debug: Log FormData contents
      for (let [key, value] of formData.entries()) {
        log(`${key}:`, value);
      }

      const baseUrl = NGROK_URL.replace(/\/+$/, "");
      const url = `${baseUrl}/api/posts`;

      log("Uploading post:", {
        url,
        media,
        mediaType,
        fileName,
        fileType,
        caption: contentWithTags,
      });

      let retryCount = 0;
      const maxRetries = 3;
      const timeout = 60000;

      while (retryCount < maxRetries) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "multipart/form-data",
            },
            body: formData,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          log("Response status:", response.status);
          const allHeaders = {};
          response.headers.forEach((value, key) => {
            allHeaders[key] = value;
          });
          log("Response headers:", allHeaders);

          const contentType = response.headers.get("content-type");
          let responseData;

          if (contentType && contentType.includes("application/json")) {
            responseData = await response.json();
          } else {
            const textResponse = await response.text();
            log("Non-JSON response:", textResponse.substring(0, 500));
            responseData = { message: "Server returned non-JSON response" };
          }

          log("Post response:", responseData);

          if (!response.ok) {
            throw new Error(
              responseData.message || `Failed to upload post (Status: ${response.status})`
            );
          }

          Alert.alert("Success", "Post uploaded successfully!");
          navigation.navigate("Main", { forceRefresh: true });
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          log(`Retry ${retryCount}/${maxRetries} for uploading post:`, error.message);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));

          const {
            data: { session },
            error: refreshError,
          } = await supabase.auth.refreshSession();
          if (refreshError || !session) {
            throw new Error("Session refresh failed during retry");
          }
          token = session.access_token;
          await AsyncStorage.setItem("token", token);
        }
      }
    } catch (error) {
      console.error("Error uploading post:", error.message);
      let errorMessage = "An unexpected error occurred";
      if (error.name === "AbortError") {
        errorMessage = "Upload timed out. Please check your network and try again.";
      } else if (error.message.includes("Network request failed")) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else {
        errorMessage = error.message || errorMessage;
      }
      Alert.alert("Upload Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const canPost = selectedTags.length === 0 && !(fromEvent && eventTag);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Add Tags</Text>
        <TouchableOpacity
          onPress={uploadPost}
          disabled={canPost}
          style={[styles.postButton, canPost && styles.postButtonDisabled]}
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
              <Text style={[styles.tagText, styles.tagTextSelected]}>
                {eventTag}
              </Text>
            </View>
          )}
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
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0095f6" />
        </View>
      )}
    </SafeAreaView>
  );
} 

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#dbdbdb",
    backgroundColor: "#fff",
  },
  backButton: { padding: 8 },
  headerText: { fontSize: 18, fontWeight: "700", color: "#000" },
  postButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#0095f6",
    borderRadius: 4,
  },
  postButtonDisabled: { backgroundColor: "#0095f660" },
  postButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  scrollContainer: { padding: 16, flexGrow: 1 },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tagButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  tagButtonSelected: { 
    backgroundColor: "#00cc00",
    borderWidth: 2,
    borderColor: "#008800",
  },
  tagText: { fontSize: 14, color: "#262626" },
  tagTextSelected: { color: "#fff" },
  eventTagButton: {
    backgroundColor: "#00cc00",
    borderWidth: 2,
    borderColor: "#008800",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
});