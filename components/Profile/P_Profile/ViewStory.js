import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { Video } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const ViewStory = ({ route }) => {
  const navigation = useNavigation();
  const { stories, initialIndex } = route.params || { stories: [], initialIndex: 0 };
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [progress, setProgress] = useState(new Animated.Value(0));
  const videoRef = useRef(null);
  const [videoStatus, setVideoStatus] = useState({});

  const storyDuration = 5000; // 5 seconds for images
  const currentStory = stories[currentIndex] || {};
  const isVideo = currentStory.image_url?.includes('.mp4');

  // Reset progress when changing stories
  useEffect(() => {
    setProgress(new Animated.Value(0));
    if (!isVideo) {
      startProgressAnimation();
    }
  }, [currentIndex, isVideo]);

  // Handle video duration for progress
  useEffect(() => {
    if (isVideo && videoStatus?.durationMillis) {
      startVideoProgressAnimation(videoStatus.durationMillis);
    }
  }, [videoStatus?.durationMillis, currentIndex]);

  const startProgressAnimation = () => {
    Animated.timing(progress, {
      toValue: 1,
      duration: storyDuration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleNextStory();
      }
    });
  };

  const startVideoProgressAnimation = (duration) => {
    Animated.timing(progress, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleNextStory();
      }
    });
  };

  const handleNextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const handlePreviousStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handlePress = (evt) => {
    const touchX = evt.nativeEvent.locationX;
    if (touchX < width / 3) {
      progress.stopAnimation();
      handlePreviousStory();
    } else if (touchX > (width * 2) / 3) {
      progress.stopAnimation();
      handleNextStory();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Progress Bar and User Info */}
      <View style={styles.header}>
        {stories.map((_, index) => (
          <View key={index} style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: index <= currentIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                },
              ]}
            />
          </View>
        ))}
      </View>

      <View style={styles.userInfo}>
        <Image
          source={
            currentStory.profile_picture
              ? { uri: currentStory.profile_picture }
              : require('../../../assets/del.png')
          }
          style={styles.avatar}
        />
        <Text style={styles.username}>{currentStory.username || 'User'}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Story Content */}
      <Pressable style={styles.content} onPress={handlePress}>
        {isVideo ? (
          <Video
            ref={videoRef}
            source={{ uri: currentStory.image_url }}
            style={styles.media}
            resizeMode="contain"
            shouldPlay
            isLooping={false}
            onPlaybackStatusUpdate={(status) => setVideoStatus(status)}
          />
        ) : (
          <Image
            source={{ uri: currentStory.image_url }}
            style={styles.media}
            resizeMode="contain"
            defaultSource={require('../../../assets/del.png')}
          />
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    flexDirection: 'row',
    zIndex: 10,
  },
  progressBarContainer: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
  },
  userInfo: {
    position: 'absolute',
    top: 50,
    left: 15,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: width,
    height: height,
  },
});

export default ViewStory;