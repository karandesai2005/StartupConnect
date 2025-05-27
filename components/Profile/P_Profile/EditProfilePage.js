import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar, // Add StatusBar import
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context"; // Import from react-native-safe-area-context
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NGROK_URL } from "@env";
import { supabase } from "../../../services/supabase.js";

const isDev = __DEV__;
const log = (...args) => isDev && console.log(...args);

const EditProfilePage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userData } = route.params || {};

  const [updatedBio, setUpdatedBio] = useState(userData?.bio || "");
  const [updatedProfileImage, setUpdatedProfileImage] = useState(
    userData?.profile_picture || null
  );
  const [profileImageError, setProfileImageError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleProfilePictureChange = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Allow access to media library to change profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setUpdatedProfileImage(result.assets[0].uri);
      setProfileImageError(false); // Reset error state on new image selection
    }
  };

  const handleSaveProfile = async () => {
    if (loading) return;
    setLoading(true);

    try {
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

      const baseUrl = NGROK_URL.replace(/\/+$/, "");
      let updatedUser = { ...userData };

      // Update bio if changed
      if (updatedBio !== userData?.bio) {
        log("Updating bio at:", `${baseUrl}/api/profile`);
        let retryCount = 0;
        const maxRetries = 3;
        const timeout = 30000;

        while (retryCount < maxRetries) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const bioResponse = await fetch(`${baseUrl}/api/profile`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ bio: updatedBio }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!bioResponse.ok) {
              const errorText = await bioResponse.text();
              throw new Error(`Bio update failed: ${errorText}`);
            }

            updatedUser = await bioResponse.json();
            log("Bio update response:", updatedUser);
            break;
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              throw error;
            }
            log(
              `Retry ${retryCount}/${maxRetries} for updating bio:`,
              error.message
            );
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * Math.pow(2, retryCount))
            );

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
      }

      // Update profile picture if changed
      if (
        updatedProfileImage &&
        updatedProfileImage !== userData?.profile_picture &&
        !updatedProfileImage.startsWith("http")
      ) {
        const fileInfo = await FileSystem.getInfoAsync(updatedProfileImage);
        if (!fileInfo.exists) {
          throw new Error("Profile picture file not found.");
        }
        const maxSizeBytes = 5 * 1024 * 1024;
        if (fileInfo.size > maxSizeBytes) {
          throw new Error(
            "Profile picture exceeds 5MB limit. Please choose a smaller image."
          );
        }

        const formData = new FormData();
        const uriParts = updatedProfileImage.split(".");
        const fileExtension =
          uriParts.length > 1 ? uriParts.pop().toLowerCase() : "jpg";
        const fileName = `profile-${Date.now()}.${fileExtension}`;
        const fileType = fileExtension === "png" ? "image/png" : "image/jpeg";

        formData.append("profile_picture", {
          uri: updatedProfileImage,
          type: fileType,
          name: fileName,
        });

        const profilePictureUrl = `${baseUrl}/api/profile/profile-picture`;
        log("Uploading profile picture to:", profilePictureUrl);

        let retryCount = 0;
        const maxRetries = 3;
        const timeout = 60000;

        while (retryCount < maxRetries) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const imageResponse = await fetch(profilePictureUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
              },
              body: formData,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!imageResponse.ok) {
              const errorText = await imageResponse.text();
              throw new Error(`Profile picture upload failed: ${errorText}`);
            }

            const imageData = await imageResponse.json();
            updatedUser = imageData.user;
            log("Profile picture update response:", updatedUser);
            break;
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              throw error;
            }
            log(
              `Retry ${retryCount}/${maxRetries} for uploading profile picture:`,
              error.message
            );
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * Math.pow(2, retryCount))
            );

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
      }

      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
      Alert.alert("Success", "Profile updated!");
      navigation.navigate("Profile", {
        username: updatedUser.username,
        isOtherUser: false,
        forceRefresh: true,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Update profile error:", error.message);
      let errorMessage = "Failed to update profile";
      if (error.name === "AbortError") {
        errorMessage =
          "Request timed out. Please check your network and try again.";
      } else if (error.message.includes("Network request failed")) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else {
        errorMessage = error.message || errorMessage;
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const hasChanges =
    updatedBio !== userData?.bio ||
    (updatedProfileImage &&
      updatedProfileImage !== userData?.profile_picture &&
      !updatedProfileImage.startsWith("http"));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
        translucent={false} // Add StatusBar
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSaveProfile}
          style={[
            styles.saveButton,
            (loading || !hasChanges) && styles.saveButtonDisabled,
          ]}
          disabled={loading || !hasChanges}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
        <TouchableOpacity
          onPress={handleProfilePictureChange}
          style={styles.imageContainer}
        >
          <Image
            source={
              profileImageError || !updatedProfileImage
                ? require("../../../assets/profiledefault.jpg")
                : { uri: updatedProfileImage }
            }
            style={styles.profileImage}
            onError={() => {
              log("Profile image loading error:", updatedProfileImage);
              setProfileImageError(true);
            }}
          />
          <Text style={styles.changePhotoText}>Change Profile Photo</Text>
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={styles.bioInput}
            value={updatedBio}
            onChangeText={(text) => setUpdatedBio(text.slice(0, 150))}
            placeholder="Write something about yourself..."
            multiline
            numberOfLines={4}
            maxLength={150}
          />
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16, // Increased padding for consistency
    paddingVertical: 12,   // Adjusted to match other screens
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    paddingLeft: 0, // Adjusted paddingLeft to 0 since paddingHorizontal is now on header
  },
  backButtonText: {
    color: "#666",
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  saveButton: {
    paddingHorizontal: 8, // Adjusted for better touch area
    paddingVertical: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#007bff",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 16, // Added paddingHorizontal to match other screens
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    color: "#333",
    borderColor: "#333",
    borderWidth: 0.25,
  },
  changePhotoText: {
    color: "#007bff",
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  bioInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
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

export default EditProfilePage;