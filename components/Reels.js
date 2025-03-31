import React, { useRef, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Video } from "expo-av";
import { useNavigation, useRoute } from "@react-navigation/native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const ReelScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { reelUrl, username } = route.params || {}; // Reel URL and username passed from home screen
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showSkip, setShowSkip] = useState(false);

  // PanResponder for swipe-down gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          // Swiping down
          return true;
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 50) {
          // Swipe down threshold met, navigate to Profile
          navigation.replace("Profile", { username });
        }
      },
    })
  ).current;

  // Auto-navigate after video ends (30 seconds)
  const handlePlaybackStatusUpdate = (status) => {
    if (status.didJustFinish) {
      navigation.replace("Profile", { username });
    }
  };

  // Show skip button after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.videoContainer} {...panResponder.panHandlers}>
        <Video
          ref={videoRef}
          source={{ uri: reelUrl || "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4" }} // Fallback URL for testing
          style={styles.video}
          resizeMode="cover"
          shouldPlay={isPlaying}
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />
        {showSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.replace("Profile", { username })}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
        <View style={styles.swipeIndicator}>
          <Text style={styles.swipeText}>Swipe down to view profile</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: SCREEN_HEIGHT,
  },
  skipButton: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  skipButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  swipeIndicator: {
    position: "absolute",
    bottom: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  swipeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
});

export default ReelScreen;