import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Video, Camera } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NGROK_URL } from "@env";

const UploadPitchVideo = () => {
  const navigation = useNavigation();
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Request camera and audio permissions
  useEffect(() => {
    (async () => {
      console.log("Requesting permissions...");
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      const audioStatus = await Camera.requestMicrophonePermissionsAsync();
      const granted = cameraStatus.status === "granted" && audioStatus.status === "granted";
      console.log("Camera permission:", cameraStatus.status);
      console.log("Audio permission:", audioStatus.status);
      console.log("Permissions granted:", granted);
      setHasPermission(granted);
    })();
  }, []);

  const handleBack = () => {
    console.log("Navigating back...");
    navigation.goBack();
  };

  const startRecording = async () => {
    if (cameraRef.current && !isRecording) {
      console.log("Starting recording...");
      setIsRecording(true);
      try {
        const video = await cameraRef.current.recordAsync({
          maxDuration: 30,
          quality: Camera.Constants.VideoQuality["720p"],
        });
        console.log("Recording finished, video URI:", video.uri);
        setVideoUri(video.uri);
      } catch (error) {
        console.error("Recording error:", error);
        Alert.alert("Error", "Failed to record video. Please try again.");
      }
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      console.log("Stopping recording...");
      cameraRef.current.stopRecording();
    }
  };

  const handleUpload = async () => {
    if (!videoUri) {
      Alert.alert("Error", "Please record a video first.");
      return;
    }

    console.log("Uploading video:", videoUri);
    setIsUploading(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        Alert.alert("Error", "User session not found. Please restart registration.");
        return;
      }

      const formData = new FormData();
      formData.append("reel", {
        uri: videoUri,
        name: `pitch_${userId}.mp4`,
        type: "video/mp4",
      });
      formData.append("step", "5");
      formData.append("data", JSON.stringify({ userId: parseInt(userId) }));

      console.log("Sending request to:", `${NGROK_URL}/api/auth/save-user-details`);
      const response = await fetch(`${NGROK_URL}/api/auth/save-user-details`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const result = await response.json();
      console.log("Upload response:", result);
      if (response.ok) {
        console.log("Upload successful, navigating to field...");
        navigation.navigate("field");
      } else {
        Alert.alert("Error", result.message || "Failed to upload pitch video.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  console.log("Rendering with hasPermission:", hasPermission);

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading permissions...</Text>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          No access to camera or microphone. Please grant permissions in your device settings.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Record Your 30-Second Pitch</Text>
      <Text style={styles.subheader}>
        Introduce your startup in a short video (max 30 seconds).
      </Text>

      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={Camera.Constants.Type.front}
        ratio="16:9"
      >
        {videoUri && (
          <Video
            source={{ uri: videoUri }}
            style={styles.videoPreview}
            useNativeControls
            resizeMode="contain"
          />
        )}
      </Camera>

      <View style={styles.buttonContainer}>
        {!videoUri ? (
          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recording]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isUploading}
          >
            <Text style={styles.buttonText}>
              {isRecording ? "Stop" : "Record"}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Upload</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => setVideoUri(null)}
              disabled={isUploading}
            >
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#f00",
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 40,
  },
  backButtonText: {
    fontSize: 32,
    color: "#000",
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 10,
  },
  subheader: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  camera: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
  },
  videoPreview: {
    width: "100%",
    height: "100%",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  recordButton: {
    backgroundColor: "#ff4444",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  recording: {
    backgroundColor: "#cc0000",
  },
  uploadButton: {
    backgroundColor: "#535353",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retakeButton: {
    backgroundColor: "#ccc",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default UploadPitchVideo;