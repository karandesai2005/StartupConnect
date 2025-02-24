import React, { useEffect, useState, useCallback, memo, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  Dimensions,
  Animated,
  FlatList,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NGROK_URL } from '@env';
import { Video } from 'expo-av';
import { debounce } from 'lodash';

const { width, height } = Dimensions.get('window');
const BOTTOM_NAV_HEIGHT = Platform.OS === 'ios' ? 73 : 65;
const ITEM_HEIGHT = height - BOTTOM_NAV_HEIGHT;

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Just now';
  const now = new Date();
  const postDate = new Date(timestamp);
  const diffInMinutes = Math.floor((now - postDate) / (1000 * 60));
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return postDate.toLocaleDateString();
};

const PostCard = memo(({ item, isVisible }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes || 0);
  const [isVideo, setIsVideo] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const videoRef = useRef(null);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const isUserPost = item.hasOwnProperty('caption') || item.hasOwnProperty('content');

  const debouncedHandleLike = useCallback(
    debounce(async () => {
      handleLike();
    }, 300),
    []
  );

  useEffect(() => {
    const mediaUrl = item.image_url || item.media_url;
    if (typeof mediaUrl === 'string') {
      setIsVideo(mediaUrl.match(/\.(mp4|mov|avi|wmv|3gp|mkv)$/i) !== null);
    }
    setIsLoading(false);
  }, [item]);

  useEffect(() => {
    if (videoRef.current && isVideo) {
      if (isVisible) {
        videoRef.current.playAsync();
        setIsPaused(false);
      } else {
        videoRef.current.pauseAsync();
        setIsPaused(true);
      }
    }
  }, [isVisible, isVideo]);

  const handleLike = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !item.post_id) return;
      setIsLikeLoading(true);

      setIsLiked(prev => !prev);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

      const response = await axios.post(
        `${NGROK_URL}/api/posts/${item.post_id}/toggle-like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data) {
        setIsLiked(response.data.liked === 1);
        setLikeCount(response.data.likeCount);
      }
    } catch (error) {
      console.error('Error handling like:', error);
      setIsLiked(prev => !prev);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const MediaComponent = isVideo ? (
    <Video
      ref={videoRef}
      source={{ uri: item.image_url || item.media_url }}
      style={styles.media}
      resizeMode="cover"
      shouldPlay={isVisible}
      isLooping
      useNativeControls={false}
    />
  ) : (
    <Image
      source={{ uri: item.image_url || item.media_url }}
      style={styles.media}
      resizeMode="cover"
    />
  );

  return (
    <View style={styles.postContainer}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#ffffff" />
      ) : (
        <>
          {MediaComponent}
          
          <View style={styles.overlayContainer}>
            <View style={styles.header}>
              <View style={styles.userInfo}>
                <Image
                  source={
                    item.profile_picture
                      ? { uri: item.profile_picture }
                      : require('../assets/del.png')
                  }
                  style={styles.avatar}
                />
                <Text style={styles.username}>
                  {isUserPost ? item.username : item.name?.first || 'User'}
                </Text>
              </View>
            </View>

            <View style={styles.rightActions}>
              <TouchableOpacity onPress={debouncedHandleLike} disabled={isLikeLoading}>
                <Image
                  source={require('../assets/icon-like.png')}
                  style={[styles.actionIcon, isLiked && styles.likedIcon]}
                />
                <Text style={styles.actionText}>{likeCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Image source={require('../assets/comment6.png')} style={styles.actionIcon} />
                <Text style={styles.actionText}>{item.comments || 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Image source={require('../assets/share.png')} style={styles.actionIcon} />
              </TouchableOpacity>
            </View>

            <View style={styles.captionContainer}>
              <Text style={styles.caption} numberOfLines={2}>
                <Text style={styles.captionUsername}>
                  {isUserPost ? item.username : item.name?.first || 'User'}{' '}
                </Text>
                {item.content || item.caption}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
});

export default function HomeScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const navigation = useNavigation();

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
  }, []);

  const loadPosts = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${NGROK_URL}/api/posts/all`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        }
      );

      if (response.data && Array.isArray(response.data)) {
        const validPosts = response.data
          .filter(post => post.media_url && !post.media_url.includes('undefined'))
          .map(post => ({
            post_id: post.post_id,
            username: post.username,
            profile_picture: post.profile_picture,
            image_url: post.media_url,
            content: post.content,
            created_at: post.created_at,
            likes: post.like_count || 0,
            comments: 0
          }));
        setPosts(validPosts);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    console.log("🔄 Refresh triggered...");
    setRefreshing(true);
    loadPosts(true);
  }, [loadPosts]);

  useEffect(() => {
    loadPosts();
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50
  };

  const renderItem = ({ item, index }) => (
    <PostCard item={item} isVisible={index === currentIndex} />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.post_id?.toString() || index.toString()}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            titleColor="#ffffff"
            colors={["#ffffff"]}
          />
        }
        getItemLayout={(data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
      />

      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Image source={require('../assets/film.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('CreatePost')}>
          <Image source={require('../assets/plus3.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('HomeReel')}>
          <Image source={require('../assets/bell.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Image source={require('../assets/settings.png')} style={styles.navIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  postContainer: {
    height: ITEM_HEIGHT,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  media: {
    width: width,
    height: ITEM_HEIGHT,
    backgroundColor: '#000',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 30,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginVertical: 8,
  },
  actionIcon: {
    width: 32,
    height: 32,
    tintColor: '#fff',
    marginVertical: 8,
  },
  likedIcon: {
    tintColor: '#ff2d55',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 72,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captionUsername: {
    fontWeight: '600',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#000',
  },
  navIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
});