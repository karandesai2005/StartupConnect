import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  Dimensions,
  RefreshControl,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NGROK_URL } from '@env';
import { Video } from 'expo-av';
import { debounce } from 'lodash';
const { width } = Dimensions.get('window');
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

// Memoized Post Card Component
// Memoized Post Card Component
const PostCard = memo(({ item, index, toggleExpand, expandedItems }) => {
  const [imageHeight, setImageHeight] = useState(width);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes || 0);
  const animatedScale = new Animated.Value(1);
  const [isVideo, setIsVideo] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const videoRef = React.useRef(null);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const debouncedHandleLike = useCallback(
    debounce(async () => {
      handleLike();
    }, 300),
    [handleLike]
  );
  const isUserPost = item.hasOwnProperty('caption') || item.hasOwnProperty('content');
  useEffect(() => {
    fetchLikeStatus();
  }, [item.post_id]);

  useEffect(() => {
    // Check if media is video by looking at URL extension
    const mediaUrl = item.image_url || item.media_url;

    if (typeof mediaUrl === 'string') {
      if (mediaUrl.match(/\.(mp4|mov|avi|wmv|3gp|mkv)$/i)) {
        setIsVideo(true);
        setImageHeight(width * 5 / 4); // 16:9 aspect ratio for videos
        setIsLoading(false);
      } else if (mediaUrl.startsWith('http')) {
        // Handle images as before
        Image.getSize(
          mediaUrl,
          (originalWidth, originalHeight) => {
            const aspectRatio = originalWidth / originalHeight;
            const calculatedHeight = width / aspectRatio;
            setImageHeight(width * 5 / 4);
            setIsLoading(false);
          },
          (error) => {
            console.log('Error getting image size:', error);
            setImageHeight(width);
            setIsLoading(false);
          }
        );
      } else {
        setIsLoading(false);
      }
    } else {
      // Default fallback image
      setIsLoading(false);
    }
  }, [item]);

  const handleMediaPress = () => {
    if (isVideo) {
      setIsPaused(!isPaused);
      if (videoRef.current) {
        if (isPaused) {
          videoRef.current.playAsync();
        } else {
          videoRef.current.pauseAsync();
        }
      }
    }
    handlePressIn();
  };

  const handlePressIn = () => {
    Animated.spring(animatedScale, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animatedScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const fetchLikeStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !item.post_id) return;

      const response = await axios.get(
        `${NGROK_URL}/api/posts/${item.post_id}/likes`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data) {
        setIsLiked(response.data.isLiked === 1);
        setLikeCount(response.data.likeCount);
      }
    } catch (error) {
      console.error('Error fetching like status:', error);
    }
  };

  const handleLike = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !item.post_id) return;
      setIsLikeLoading(true);  // Add this


      // Optimistic update
      setIsLiked(prev => !prev);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

      const response = await axios.post(
        `${NGROK_URL}/api/posts/${item.post_id}/toggle-like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Update with actual server response
      if (response.data) {
        setIsLiked(response.data.liked === 1);
        setLikeCount(response.data.likeCount);
      }
    } catch (error) {
      // Revert optimistic update on error
      console.error('Error updating like:', error);
      setIsLiked(prev => !prev);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
    } finally {
      setIsLikeLoading(false);  // Add this
    }
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: animatedScale }] }]}>
      {/* User Info Header */}
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <Image
            source={
              typeof item.profile_picture === 'string' && item.profile_picture.startsWith('http')
                ? { uri: item.profile_picture }
                : require('../assets/del.png')  // Fallback avatar
            }
            style={styles.avatar}
          />
          <View>
            <Text style={styles.name}>{isUserPost ? item.username : (item.name ? item.name.first : 'User')}</Text>
            <Text style={styles.timeStamp}>{formatTimestamp(item.created_at)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Text style={styles.moreButtonText}>•••</Text>
        </TouchableOpacity>
      </View>

      {/* Post Media (Image or Video) */}
      <TouchableOpacity
        activeOpacity={0.95}
        onPressIn={handleMediaPress}
        onPressOut={handlePressOut}
      >
        <View style={[styles.imageContainer, { height: imageHeight }]}>
          {isLoading && (
            <View style={styles.imageLoader}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}

          {isVideo ? (
            <Video
              ref={videoRef}
              source={{ uri: item.image_url || item.media_url }}
              style={[styles.video, { height: imageHeight }]}  // Changed here
              resizeMode="cover"
              shouldPlay={!isPaused}
              isLooping={true}
              onLoad={() => setIsLoading(false)}
              onError={(error) => {
                console.log("Video loading error:", error);
                setIsLoading(false);
                setIsVideo(false);
              }}
              useNativeControls={false}
            />

          ) : (
            <Image
              source={
                typeof item.image_url === 'string' && item.image_url.startsWith('http')
                  ? { uri: item.image_url }
                  : typeof item.media_url === 'string' && item.media_url.startsWith('http')
                    ? { uri: item.media_url }
                    : require('../assets/PITCH.png')  // Fallback image
              }
              style={[styles.postImage, { height: imageHeight }]}  // Changed here
              onLoad={() => setIsLoading(false)}
            />
          )}

          {/* Play button overlay for videos */}
          {isVideo && isPaused && (
            <View style={styles.playButtonOverlay}>
              <Image
                source={require('../assets/play-button.png')}
                style={styles.playButton}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Engagement Section */}
      <View style={styles.cardFooter}>
        <Text style={styles.likes}>👍 {likeCount} Likes</Text>
        <Text style={styles.comments}>💬 {item.comments || 0} Comments</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={debouncedHandleLike}
          activeOpacity={0.7}
          disabled={isLikeLoading}
        >
          <Image
            source={require('../assets/icon-like.png')}
            style={[
              styles.navIcon,
              isLiked && { tintColor: '#1f219c' },
              isLikeLoading && { opacity: 0.5 }  // Add this
            ]}
          />
          {isLikeLoading && (  // Add this
            <ActivityIndicator
              size="small"
              color="#1f219c"
              style={styles.likeLoader}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Image source={require('../assets/comment6.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Image source={require('../assets/share.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Image source={require('../assets/save.png')} style={styles.navIcon} />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text
          style={styles.caption}
          numberOfLines={expandedItems[index] ? undefined : 2}
        >
          <Text style={styles.username}>
            {isUserPost ? item.username : (item.name ? item.name.first : 'User')}{' '}
          </Text>
          {item.content || item.caption}
        </Text>
        {(item.content || item.caption) && (
          <TouchableOpacity onPress={() => toggleExpand(index)}>
            <Text style={styles.showMoreText}>
              {expandedItems[index] ? 'Show less' : 'Show more'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
});
export default function HomeScreen() {
  const [users, setUsers] = useState([]);  // To store random users
  const [myPosts, setMyPosts] = useState([]);  // To store user posts
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedItems, setExpandedItems] = useState({});
  const [userData, setUserData] = useState(null);
  const navigation = useNavigation();
  const [postsError, setPostsError] = useState(null);

  const combinedData = useMemo(() => {
    const validPosts = myPosts.filter(post =>
      post && (post.image_url || post.media_url) &&
      !String(post.image_url || post.media_url).includes('undefined')
    );
    const mergedData = [...validPosts, ...users];
    return mergedData;
  }, [myPosts, users]);



  // Load posts (random users and user posts)
  const loadUsers = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `https://randomuser.me/api?results=10&page=${currentPage}`
      );
      if (refresh) {
        setUsers(response.data.results);
      } else {
        setUsers(prev => [...prev, ...response.data.results]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage]);

  // Fetch the user's posts (simulate or fetch real posts)

  const fetchAllPosts = useCallback(async () => {
    try {
      setPostsError(null);
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
        const mappedPosts = response.data.map(post => ({
          _id: post.post_id,
          post_id: post.post_id, // Added for like functionality
          username: post.username,
          profile_picture: post.profile_picture,
          image_url: post.media_url,
          content: post.content,
          created_at: post.created_at,
          likes: post.like_count || 0, // Updated to use backend like count
          comments: 0,
          caption: post.content
        }));

        const sortedPosts = mappedPosts
          .filter(post => post.image_url && !post.image_url.includes('undefined'))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setMyPosts(sortedPosts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPostsError(error.message);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    fetchAllPosts();  // Fetch the user's posts
  }, [currentPage]);

  const onRefresh = useCallback(() => {
    console.log("🔄 Refresh triggered...");
    setRefreshing(true);
    setCurrentPage(1);
    loadUsers(true);
    fetchAllPosts(); // ✅ Ensure user posts refresh too
  }, []);


  const toggleExpand = useCallback((index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  const renderFooter = () => loading && (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );

  const fetchUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${NGROK_URL}/api/auth/profile`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );
  const keyExtractor = useCallback((item, index) => {
    // For user posts
    if (item.post_id) {
      return `post-${item.post_id}`;
    }
    // For random users
    if (item.login?.uuid) {
      return `user-${item.login.uuid}`;
    }
    // Fallback using just the index
    return `item-${index}`;
  }, []);
  // console.log("My Posts:", JSON.stringify(myPosts, null, 2));
  // console.log("Combined Data:", JSON.stringify(combinedData, null, 2));


  return (
    <View style={styles.container}>
      <View style={styles.statusBarBackground} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Image
            source={
              userData?.profile_picture
                ? { uri: userData.profile_picture }
                : require('../assets/del.png')
            }
            style={styles.profilePic}
          />
        </TouchableOpacity>
        <TextInput
          style={styles.searchBar}
          placeholder="Search..."
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity onPress={() => navigation.navigate('Chat')}>
          <Image source={require('../assets/Arrow.png')} style={styles.chatIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Chat')}>
          <Image source={require('../assets/Arrow.png')} style={styles.chatIcon} />
        </TouchableOpacity>
      </View>

      {/* Post List */}
      <FlatList
        data={combinedData}
        extraData={combinedData}
        renderItem={({ item, index }) => (
          <PostCard
            item={item}
            index={index}
            toggleExpand={toggleExpand}
            expandedItems={expandedItems}
          />
        )}
        keyExtractor={keyExtractor}
        onEndReached={() => setCurrentPage(prev => prev + 1)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContentContainer}
      />


      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Image source={require('../assets/film.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('CreatePost')}>
          <Image source={require('../assets/plus3.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Reel')}>
          <Image source={require('../assets/bell.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Image source={require('../assets/settings.png')} style={styles.navIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    marginTop: Platform.OS === 'ios' ? 45 : 25,
  },
  statusBarBackground: {
    height: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    marginTop: Platform.select({
      ios: -55,
      android: null
    })
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  searchBar: {
    width: '60%',
    marginHorizontal: 10,
    paddingHorizontal: 15,
    backgroundColor: '#eee',
    borderRadius: 20,
    height: 40,
  },
  chatIcon: {
    width: 24,
    height: 24
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 3,
    elevation: Platform.OS === 'android' ? 2 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  timeStamp: {
    fontSize: 13,
    color: '#868E96',
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  moreButtonText: {
    fontSize: 16,
    color: '#868E96',
    fontWeight: 'bold',
  },
  imageContainer: {
    width: width,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  postImage: {
    width: width,
    resizeMode: 'cover',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
    paddingHorizontal: 10,
  },
  likes: {
    fontWeight: 'bold',
    color: '#555',
  },
  comments: {
    fontWeight: 'bold',
    color: '#555',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
    ...(Platform.OS === 'android' && {
      tintColor: undefined
    })
  },
  likedIcon: {
    tintColor: '##3033ff', // Remove this if your red icon is already red
  },
  captionContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  caption: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
  username: {
    fontWeight: '600',
    color: '#212529',
  },
  showMoreText: {
    fontSize: 14,
    color: '#868E96',
    marginTop: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 20 : 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    height: Platform.OS === 'ios' ? 84 : 60,
  },
  listContentContainer: {
    paddingBottom: 8,
  },
  loaderContainer: {
    paddingVertical: 20,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playButton: {
    width: 60,
    height: 60,
    tintColor: 'white',
  },
  video: {
    width: width,
    backgroundColor: 'black',
  },
  likeLoader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -12 },
      { translateY: -12 }
    ]
  },
});
