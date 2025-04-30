import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
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
  ScrollView,
  BackHandler,
  SafeAreaView,
  KeyboardAvoidingView,
  StatusBar,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NGROK_URL } from "@env";
import { Video } from "expo-av";
import { debounce } from "lodash";
import Modal from "react-native-modal";
import { supabase } from "../services/supabase";
const { width } = Dimensions.get("window");

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "Just now";
  const now = new Date();
  const postDate = new Date(timestamp);
  const diffInMinutes = Math.floor((now - postDate) / (1000 * 60));
  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return postDate.toLocaleDateString();
};

const handleChatPress = () => {
  Alert.alert(
    "Feature Unavailable",
    "Sorry, this feature is not available currently.",
    [{ text: "OK" }]
  );
};

// Memoized Post Card Component
const PostCard = memo(
  ({
    item,
    index,
    toggleExpand,
    expandedItems,
    isVisible,
    navigation,
    fetchAllPosts,
  }) => {
    const [imageHeight, setImageHeight] = useState(width);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(item.likes || item.like_count || 0);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [isCommentsLoading, setIsCommentsLoading] = useState(false);
    const animatedScale = new Animated.Value(1);
    const [isVideo, setIsVideo] = useState(false);
    const videoRef = React.useRef(null);
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [shouldShowMore, setShouldShowMore] = useState(false);
    const [isMeasured, setIsMeasured] = useState(false);
    const [fullTextHeight, setFullTextHeight] = useState(0);
    const [lastTap, setLastTap] = useState(null);

    const isUserPost = item.hasOwnProperty('caption') || item.hasOwnProperty('content');

    useEffect(() => {
      if (isUserPost) fetchLikeStatus();
    }, [item.post_id, isUserPost]);

    useEffect(() => {
      const rawMediaUrl = item.image_url || item.media_url;
      console.log(`PostCard: Processing media for post ${item.post_id || item.login?.uuid}:`, { rawMediaUrl, media_type: item.media_type });

      if (!rawMediaUrl) {
        console.warn(`PostCard: Invalid media_url for post ${item.post_id || item.login?.uuid}`, { rawMediaUrl });
        setImageHeight(width);
        setIsLoading(false);
        return;
      }

      const isStringUrl = typeof rawMediaUrl === 'string';
      const mediaUrl = isStringUrl && rawMediaUrl.startsWith('http') 
        ? rawMediaUrl 
        : isStringUrl ? `${NGROK_URL}${rawMediaUrl}` : null;

      const isVideoPost = item.media_type === 'video' || (isStringUrl && mediaUrl?.match(/\.(mp4|mov|avi|wmv|3gp|mkv)$/i));
      if (isVideoPost) {
        setIsVideo(true);
        setImageHeight((width * 5) / 4);
        setIsLoading(false);
      } else {
        // Handle local assets or URLs
        if (isStringUrl && mediaUrl) {
          Image.getSize(
            mediaUrl,
            (originalWidth, originalHeight) => {
              const aspectRatio = originalWidth / originalHeight;
              setImageHeight(width / aspectRatio);
              setIsLoading(false);
              console.log(`PostCard: Image size for post ${item.post_id || item.login?.uuid}:`, { width: originalWidth, height: originalHeight });
            },
            (error) => {
              console.error(`PostCard: Error getting image size for post ${item.post_id || item.login?.uuid}:`, error);
              setImageHeight(width);
              setIsLoading(false);
            }
          );
        } else {
          // Assume local asset
          setImageHeight(width); // Default for local assets
          setIsLoading(false);
        }
      }
    }, [item]);

    useEffect(() => {
      if (isVideo && videoRef.current) {
        if (isVisible) {
          videoRef.current
            .playAsync()
            .catch((error) => console.error(`PostCard: Play error for post ${item.post_id || item.login?.uuid}:`, error));
        } else {
          videoRef.current
            .pauseAsync()
            .catch((error) => console.error(`PostCard: Pause error for post ${item.post_id || item.login?.uuid}:`, error));
        }
      }
    }, [isVisible, isVideo]);

    useEffect(() => {
      if (isCommentModalVisible) {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
          setIsCommentModalVisible(false);
          return true;
        });
        return () => backHandler.remove();
      }
    }, [isCommentModalVisible]);

    const handlePressIn = () => {
      Animated.spring(animatedScale, { toValue: 0.98, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
      Animated.spring(animatedScale, { toValue: 1, useNativeDriver: true }).start();
    };

    const fetchLikeStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token || !item.post_id) return;
        const baseUrl = NGROK_URL.replace(/\/+$/, '');
        const response = await axios.get(`${baseUrl}/api/posts/${item.post_id}/likes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data) {
          setIsLiked(response.data.isLiked === 1);
          setLikeCount(response.data.likeCount);
        }
      } catch (error) {
        console.error(`PostCard: Error fetching like status for post ${item.post_id}:`, error);
      }
    };

    const fetchComments = async () => {
      try {
        setIsCommentsLoading(true);
        const token = await AsyncStorage.getItem('token');
        if (!token || !item.post_id) return;
        const baseUrl = NGROK_URL.replace(/\/+$/, '');
        const response = await axios.get(`${baseUrl}/api/posts/${item.post_id}/comments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setComments(response.data || []);
        console.log(`PostCard: Fetched comments for post ${item.post_id}:`, response.data);
      } catch (error) {
        console.error(`PostCard: Error fetching comments for post ${item.post_id}:`, error);
        setComments([]);
      } finally {
        setIsCommentsLoading(false);
      }
    };

    const handleLike = useCallback(
      async () => {
        if (!isUserPost) return;
        try {
          const token = await AsyncStorage.getItem('token');
          if (!token || !item.post_id) return;
          setIsLikeLoading(true);
          setIsLiked((prev) => !prev);
          setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
          const baseUrl = NGROK_URL.replace(/\/+$/, '');
          const response = await axios.post(
            `${baseUrl}/api/posts/${item.post_id}/toggle-like`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (response.data && response.data.success) {
            setIsLiked(response.data.liked);
            setLikeCount(response.data.like_count);
            await fetchAllPosts();
          }
        } catch (error) {
          console.error(`PostCard: Error updating like for post ${item.post_id}:`, error);
          setIsLiked((prev) => !prev);
          setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
        } finally {
          setIsLikeLoading(false);
        }
      },
      [isLiked, item.post_id, fetchAllPosts]
    );

    const debouncedHandleLike = useCallback(debounce(handleLike, 300), [handleLike]);

    const handleDoubleTap = () => {
      const now = Date.now();
      const DOUBLE_PRESS_DELAY = 300;
      if (lastTap && now - lastTap < DOUBLE_PRESS_DELAY) {
        if (!isLiked && !isLikeLoading) {
          handleLike();
        }
      } else {
        setLastTap(now);
      }
    };

    const handleProfilePress = () => {
      const username = isUserPost
        ? item.username
        : item.name
        ? `${item.name.first} ${item.name.last || ''}`
        : 'User';
      navigation.navigate('Profile', { username, isOtherUser: true });
    };

    const toggleCommentModal = () => {
      if (!isCommentModalVisible) {
        fetchComments();
      }
      setIsCommentModalVisible(!isCommentModalVisible);
    };

    const handleAddComment = async () => {
      if (!isUserPost || !newComment.trim()) return;
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token || !item.post_id) return;
        const baseUrl = NGROK_URL.replace(/\/+$/, '');
        const response = await axios.post(
          `${baseUrl}/api/posts/${item.post_id}/comments`,
          { content: newComment },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data) {
          await fetchComments();
          setNewComment('');
        }
      } catch (error) {
        console.error(`PostCard: Error adding comment for post ${item.post_id}:`, error);
      }
    };

    const handleTextLayout = (event) => {
      if (!isMeasured) {
        const { height } = event.nativeEvent.layout;
        setFullTextHeight(height);
        setShouldShowMore(height > 40 && (item.content || item.caption));
        setIsMeasured(true);
      }
    };

    const mediaSource = (item.image_url || item.media_url) && 
      typeof (item.image_url || item.media_url) === 'string' &&
      !(item.image_url || item.media_url).includes('undefined') &&
      !(item.image_url || item.media_url).includes('null')
      ? { uri: (item.image_url || item.media_url).startsWith('http') ? (item.image_url || item.media_url) : `${NGROK_URL}${item.image_url || item.media_url}` }
      : (item.image_url || item.media_url) || require('../assets/PITCH.png');

    // Debug profile picture
    console.log(`PostCard: Profile picture for post ${item.post_id || item.login?.uuid}:`, {
      profile_picture: item.profile_picture,
      isString: typeof item.profile_picture === 'string',
      isValidUrl: typeof item.profile_picture === 'string' && item.profile_picture.startsWith('http'),
    });

    const profilePictureSource = (() => {
      if (typeof item.profile_picture === 'string' && item.profile_picture.startsWith('http')) {
        return { uri: item.profile_picture };
      }
      return item.profile_picture || require('../assets/profiledefault.jpg');
    })();

    return (
      <Animated.View style={[styles.card, { transform: [{ scale: animatedScale }] }]}>
        <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <TouchableOpacity onPress={handleProfilePress}>
                <Image
                  source={profilePictureSource}
                  style={styles.avatar}
                  onError={(e) => console.error(`PostCard: Profile picture error for post ${item.post_id || item.login?.uuid}:`, e.nativeEvent.error)}
                />
              </TouchableOpacity>
              <View>
                <Text style={styles.name}>
                  {isUserPost ? item.username : item.name ? item.name.first : 'User'}
                </Text>
                <Text style={styles.timeStamp}>{formatTimestamp(item.created_at)}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.moreButton} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.moreButtonText}>•••</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.95}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handleDoubleTap}
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
                source={typeof mediaSource === 'string' ? { uri: mediaSource } : mediaSource}
                style={[styles.video, { height: imageHeight }]}
                resizeMode="cover"
                isLooping={true}
                onLoad={() => {
                  setIsLoading(false);
                  console.log(`PostCard: Video loaded for post ${item.post_id || item.login?.uuid}`);
                }}
                onError={(error) => {
                  console.error(`PostCard: Video loading error for post ${item.post_id || item.login?.uuid}:`, error);
                  setIsLoading(false);
                  setIsVideo(false);
                }}
              />
            ) : (
              <Image
                source={mediaSource}
                style={[styles.postImage, { height: imageHeight }]}
                resizeMode="cover"
                onLoad={() => {
                  setIsLoading(false);
                  console.log(`PostCard: Image loaded for post ${item.post_id || item.login?.uuid}`);
                }}
                onError={(e) => {
                  console.error(`PostCard: Image loading error for post ${item.post_id || item.login?.uuid}:`, e.nativeEvent.error);
                  setIsLoading(false);
                }}
              />
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.cardFooter}>
          <Text style={styles.likes}>👍 {likeCount} Likes</Text>
          <Text style={styles.comments}>
            💬 {item.comment_count || comments.length || 0} Comments
          </Text>
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
                { tintColor: isLiked ? '#1f219c' : '#000000' },
                isLikeLoading && { opacity: 0.5 },
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={toggleCommentModal}>
            <Image source={require('../assets/comment6.png')} style={styles.navIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleChatPress}>
            <Image source={require('../assets/share.png')} style={styles.navIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleChatPress}>
            <Image source={require('../assets/save.png')} style={styles.navIcon} />
          </TouchableOpacity>
        </View>
        <View style={styles.captionContainer}>
          {!isMeasured && (
            <Text style={[styles.caption, styles.measureText]} onLayout={handleTextLayout}>
              <Text style={styles.username}>
                {isUserPost ? item.username : item.name ? item.name.first : 'User'}{' '}
              </Text>
              {item.content || item.caption}
            </Text>
          )}
          {isMeasured && (
            <Text
              style={styles.caption}
              numberOfLines={shouldShowMore && !expandedItems[index] ? 2 : undefined}
            >
              <Text style={styles.username}>
                {isUserPost ? item.username : item.name ? item.name.first : 'User'}{' '}
              </Text>
              {item.content || item.caption}
            </Text>
          )}
          {shouldShowMore && (
            <TouchableOpacity onPress={() => toggleExpand(index)}>
              <Text style={styles.showMoreText}>
                {expandedItems[index] ? 'Show less' : 'Show more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Modal
          isVisible={isCommentModalVisible}
          onBackdropPress={toggleCommentModal}
          onSwipeComplete={toggleCommentModal}
          swipeDirection="down"
          backdropOpacity={0.5}
          backdropColor="#000"
          style={styles.commentModal}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          useNativeDriver={true}
        >
          <View style={styles.commentModalContent}>
            <View style={styles.commentModalHeader}>
              <Text style={styles.commentModalTitle}>Comments</Text>
              <TouchableOpacity onPress={toggleCommentModal}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            {isCommentsLoading ? (
              <ActivityIndicator size="large" color="#007AFF" style={styles.commentLoader} />
            ) : (
              <FlatList
                data={comments}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <Text style={styles.commentUsername}>{item.username || 'User'}</Text>
                    <Text style={styles.commentText}>{item.content}</Text>
                    <Text style={styles.commentTimestamp}>
                      {formatTimestamp(item.created_at)}
                    </Text>
                  </View>
                )}
                keyExtractor={(item) => item.comment_id.toString()}
                style={styles.commentList}
                contentContainerStyle={styles.commentListContent}
                ListEmptyComponent={<Text style={styles.noCommentsText}>No comments yet.</Text>}
              />
            )}
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={newComment}
                onChangeText={setNewComment}
                onSubmitEditing={handleAddComment}
                returnKeyType="send"
              />
              <TouchableOpacity style={styles.postCommentButton} onPress={handleAddComment}>
                <Text style={styles.postCommentText}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Animated.View>
    );
  }
);

export default function Home() {
  const [users, setUsers] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedItems, setExpandedItems] = useState({});
  const [userData, setUserData] = useState(null);
  const navigation = useNavigation();
  const [postsError, setPostsError] = useState(null);
  const [isFieldsModalVisible, setFieldsModalVisible] = useState(false);
  const [tempSelectedFields, setTempSelectedFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [viewableItems, setViewableItems] = useState([]);

  const onViewableItemsChanged = useCallback(
    debounce(({ viewableItems }) => {
      setViewableItems(viewableItems.map((item) => item.index));
    }, 100),
    []
  );

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const FIELDS = [
    "Tech",
    "AI",
    "Sustainability",
    "Finance",
    "Health",
    "Education",
    "Gaming",
    "Rob-linkotics",
    "Marketing",
    "Blockchain",
    "Design",
    "Data Science",
  ];

  const combinedData = useMemo(() => {
    const validPosts = myPosts.filter(
      (post) =>
        post &&
        post.post_id &&
        (post.image_url || post.media_url) &&
        typeof (post.image_url || post.media_url) === 'string' &&
        !String(post.image_url || post.media_url).includes("undefined") &&
        !String(post.image_url || post.media_url).includes("null")
    );
    const validUsers = users.filter(
      (user) =>
        user &&
        user.login?.uuid &&
        (user.image_url || user.media_url)
    );
    console.log('Home.js: Combined data:', { posts: validPosts.length, users: validUsers.length });
    return [...validPosts, ...validUsers];
  }, [myPosts, users]);

  const generateMockTimestamp = () => {
    const now = new Date();
    const randomMinutes = Math.floor(Math.random() * 60 * 24 * 7);
    return new Date(now.getTime() - randomMinutes * 60 * 1000).toISOString();
  };

  const loadUsers = useCallback(
    async (refresh = false) => {
      try {
        setLoading(true);
        const page = refresh ? 1 : currentPage;
        console.log(`Home.js: Fetching mock posts for page ${page}`);
        const response = await axios.get(
          `https://jsonplaceholder.typicode.com/posts?_page=${page}&_limit=10`
        );
        const userCache = new Map();
        const mappedUsers = await Promise.all(
          response.data.map(async (post) => {
            let user = userCache.get(post.userId);
            if (!user) {
              try {
                const userResponse = await axios.get(
                  `https://jsonplaceholder.typicode.com/users/${post.userId}`
                );
                user = userResponse.data;
                userCache.set(post.userId, user);
              } catch (userError) {
                console.error(`Home.js: Error fetching user ${post.userId}:`, userError);
                user = { name: `User${post.userId}` };
              }
            }
            const nameParts = user.name.split(" ");
            return {
              login: { uuid: `${post.id}-${page}` },
              name: {
                first: nameParts[0],
                last: nameParts.slice(1).join(" ") || "",
              },
              profile_picture: require('../assets/profiledefault.jpg'),
              email: user.email || `user${post.userId}@example.com`,
              registered: { date: generateMockTimestamp() },
              content: post.body,
              caption: post.title,
              image_url: require('../assets/PITCH.png'),
              media_type: 'image',
              likes: Math.floor(Math.random() * 100),
              comment_count: Math.floor(Math.random() * 20),
            };
          })
        );
        if (refresh) {
          setUsers(mappedUsers);
        } else {
          setUsers((prev) => [...prev, ...mappedUsers]);
        }
        console.log(`Home.js: Loaded ${mappedUsers.length} mock posts for page ${page}`);
      } catch (error) {
        console.error("Home.js: Error loading mock posts:", error);
        Alert.alert("Error", "Failed to load mock posts. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage]
  );

  const fetchAllPosts = useCallback(async () => {
    try {
      setPostsError(null);
      const baseUrl = NGROK_URL.replace(/\/+$/, "");
      console.log('Home.js: Fetching posts from:', `${baseUrl}/api/posts/all`);
      const response = await axios.get(`${baseUrl}/api/posts/all`, {
        timeout: 10000,
        headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` },
      });
      console.log("Home.js: Posts API raw response:", response.data);
      if (response.data && Array.isArray(response.data)) {
        const mappedPosts = response.data
          .filter((post) => post && post.post_id && (post.media_url ? typeof post.media_url === 'string' : true))
          .map((post) => {
            const profilePicture = post.users?.profile_picture || post.profile_picture;
            console.log(`Home.js: Mapping post ${post.post_id}:`, { profile_picture: profilePicture });
            return {
              _id: post.post_id,
              post_id: post.post_id,
              username: post.users?.username || post.username,
              profile_picture: typeof profilePicture === 'string' && profilePicture.startsWith('http') ? profilePicture : null,
              image_url: post.media_url || null,
              media_type: post.media_type || (post.media_url?.match(/\.(mp4|mov|avi|wmv|3gp|mkv)$/i) ? 'video' : post.media_url?.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image' : null),
              content: post.content || '',
              created_at: post.created_at,
              likes: post.like_count || post.likes || 0,
              comment_count: post.comment_count || 0,
              caption: post.content || '',
            };
          });
        const sortedPosts = mappedPosts
          .filter(
            (post) => post.image_url && !post.image_url.includes("undefined") && !post.image_url.includes("null")
          )
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        console.log('Home.js: Mapped posts:', sortedPosts.length);
        setMyPosts(sortedPosts);
      } else {
        console.warn("Home.js: Invalid posts data:", response.data);
        setPostsError("Invalid data from server");
      }
    } catch (error) {
      console.error(
        "Home.js: Error fetching posts:",
        error.response?.data || error.message
      );
      setPostsError(error.response?.data?.message || error.message);
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log("Home.js: No token, refreshing session for user data");
        const {
          data: { session },
          error,
        } = await supabase.auth.refreshSession();
        if (error || !session) {
          console.error("Home.js: Session refresh failed:", error?.message);
          navigation.reset({ index: 0, routes: [{ name: "Register1" }] });
          return;
        }
        await AsyncStorage.setItem("token", session.access_token);
      }
      const baseUrl = NGROK_URL.replace(/\/+$/, "");
      console.log('Home.js: Fetching user data from:', `${baseUrl}/api/profile`);
      const response = await fetch(`${baseUrl}/api/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${await AsyncStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Home.js: User data fetched:", data);
        setUserData(data);
        await AsyncStorage.setItem("userData", JSON.stringify(data));
      } else {
        console.error("Home.js: Profile fetch failed:", await response.text());
        Alert.alert("Error", "Failed to load profile. Please try again.");
      }
    } catch (error) {
      console.error("Home.js: Error fetching user data:", error);
      Alert.alert("Error", "Failed to load user data. Please try again.");
    }
  }, [navigation]);

  useEffect(() => {
    loadUsers(); // Fetch mock posts when currentPage changes
  }, [currentPage, loadUsers]);

  useFocusEffect(
    useCallback(() => {
      const checkAuthAndFetch = async () => {
        try {
          setLoading(true);
          let token = await AsyncStorage.getItem("token");
          if (!token) {
            console.log("Home.js: No token, refreshing session");
            const {
              data: { session },
              error,
            } = await supabase.auth.refreshSession();
            if (error || !session) {
              console.error("Home.js: Session refresh failed:", error?.message);
              navigation.reset({ index: 0, routes: [{ name: "Register1" }] });
              return;
            }
            token = session.access_token;
            await AsyncStorage.setItem("token", token);
          }
          await Promise.all([
            fetchUserData(),
            fetchAllPosts(),
            loadUsers(true),
          ]);
        } catch (error) {
          console.error("Home.js: Error during auth check or data fetch:", error);
          setPostsError(error.message);
        } finally {
          setLoading(false);
        }
      };
      checkAuthAndFetch();
    }, [fetchUserData, fetchAllPosts, loadUsers, navigation])
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        setViewableItems([]);
      };
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    setMyPosts([]);
    setUsers([]);
    Promise.all([fetchAllPosts(), loadUsers(true)]).finally(() => {
      setRefreshing(false);
    });
  }, [fetchAllPosts, loadUsers]);

  const toggleExpand = useCallback((index) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const renderFooter = () =>
    loading && (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );

  const keyExtractor = useCallback((item, index) => {
    if (item.post_id) return `post-${item.post_id}`;
    if (item.login?.uuid) return `user-${item.login.uuid}`;
    return `item-${index}`;
  }, []);

  const toggleTempField = (field) => {
    setTempSelectedFields((current) =>
      current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field]
    );
  };

  const handleFieldsDone = () => {
    setSelectedFields(tempSelectedFields);
    setFieldsModalVisible(false);
  };

  const handleFieldsClose = () => {
    setTempSelectedFields(selectedFields);
    setFieldsModalVisible(false);
  };

  const handleSearchFocus = () => {
    navigation.navigate("Search");
  };

  const handleProfilePress = () => {
    if (!userData) {
      console.log("Home.js: User data not loaded yet");
      return;
    }
    const isBusinessUser = userData.is_business;
    const username = userData.username;
    if (isBusinessUser) {
      navigation.navigate("BusinessProfile", { username, isOtherUser: false });
    } else {
      navigation.navigate("Profile", { username, isOtherUser: false });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleProfilePress}>
          <Image
            source={
              userData?.profile_picture && typeof userData.profile_picture === 'string'
                ? { uri: userData.profile_picture }
                : require("../assets/profiledefault.jpg")
            }
            style={styles.profilePic}
          />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Search..."
            placeholderTextColor="#aaa"
            onFocus={handleSearchFocus}
            editable={true}
          />
        </View>
        <View style={styles.iconsContainer}>
          <TouchableOpacity onPress={handleChatPress}>
            <Image
              source={require("../assets/Arrow.png")}
              style={styles.chatIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconSpacing}
            onPress={() => {
              setTempSelectedFields(selectedFields);
              setFieldsModalVisible(true);
            }}
          >
            <Image
              source={require("../assets/options.png")}
              style={styles.filterIcon}
            />
          </TouchableOpacity>
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {postsError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {postsError}</Text>
          </View>
        )}
        <FlatList
          data={combinedData}
          extraData={combinedData}
          renderItem={({ item, index }) => (
            <PostCard
              item={item}
              index={index}
              toggleExpand={toggleExpand}
              expandedItems={expandedItems}
              isVisible={viewableItems.includes(index)}
              navigation={navigation}
              fetchAllPosts={fetchAllPosts}
            />
          )}
          keyExtractor={keyExtractor}
          onEndReached={() => setCurrentPage((prev) => prev + 1)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContentContainer}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListEmptyComponent={<Text style={styles.noPostsText}>No posts available</Text>}
        />
      </KeyboardAvoidingView>
      <Modal
        isVisible={isFieldsModalVisible}
        onBackdropPress={handleFieldsClose}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Fields</Text>
          <ScrollView contentContainerStyle={styles.fieldsContainer}>
            {FIELDS.map((field) => (
              <TouchableOpacity
                key={field}
                style={[
                  styles.fieldBubble,
                  tempSelectedFields.includes(field) &&
                    styles.selectedFieldBubble,
                ]}
                onPress={() => toggleTempField(field)}
              >
                <Text style={styles.fieldBubbleText}>{field}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.modalActionButtons}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={handleFieldsClose}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={handleFieldsDone}
            >
              <Text style={styles.modalDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardAvoid: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  iconsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconSpacing: {
    marginLeft: 20,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchContainer: {
    flex: 1,
    position: "relative",
    marginHorizontal: 10,
  },
  searchBar: {
    width: "100%",
    paddingHorizontal: 15,
    backgroundColor: "#eee",
    borderRadius: 20,
    height: 40,
  },
  chatIcon: {
    width: 24,
    height: 24,
  },
  filterIcon: {
    width: 24,
    height: 24,
  },
  card: {
    backgroundColor: "#fff",
    marginBottom: 3,
    elevation: Platform.OS === "android" ? 2 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#212529",
  },
  timeStamp: {
    fontSize: 13,
    color: "#868E96",
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  moreButtonText: {
    fontSize: 16,
    color: "#868E96",
    fontWeight: "bold",
  },
  imageContainer: {
    width: width,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imageLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  postImage: {
    width: width,
    resizeMode: "cover",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
    paddingHorizontal: 10,
  },
  likes: {
    fontWeight: "bold",
    color: "#555",
  },
  comments: {
    fontWeight: "bold",
    color: "#555",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  actionButton: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navIcon: {
    width: 20,
    height: 20,
    marginBottom: Platform.OS === "ios" ? 3 : 0,
    tintColor: "#000000",
  },
  captionContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  caption: {
    fontSize: 14,
    color: "#495057",
    lineHeight: 20,
  },
  username: {
    fontWeight: "600",
    color: "#212529",
  },
  showMoreText: {
    fontSize: 14,
    color: "#868E96",
    marginTop: 4,
  },
  listContentContainer: {
    paddingBottom: 8,
  },
  loaderContainer: {
    paddingVertical: 20,
  },
  video: {
    width: width,
    backgroundColor: "black",
  },
  modal: {
    justifyContent: "center",
    margin: 0,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    marginHorizontal: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
  },
  fieldsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingBottom: 20,
  },
  fieldBubble: {
    margin: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#d9d9d9",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedFieldBubble: {
    backgroundColor: "#4CAF50",
  },
  fieldBubbleText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },
  modalActionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  modalCloseButton: {
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    flex: 0.48,
    backgroundColor: "#fff",
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  modalDoneButton: {
    backgroundColor: "#a3a4eb",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    flex: 0.48,
  },
  modalDoneButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f219c",
  },
  commentModal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  commentModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 15,
    flex: 1,
    maxHeight: "90%",
  },
  measureText: {
    position: "absolute",
    opacity: 0,
    width: width - 24,
  },
  commentModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  closeButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  commentList: {
    flex: 1,
    marginBottom: 15,
  },
  commentListContent: {
    paddingBottom: 10,
  },
  commentItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    minHeight: 60,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: "600",
    color: "#212529",
  },
  commentText: {
    fontSize: 14,
    color: "#495057",
    marginTop: 5,
  },
  commentTimestamp: {
    fontSize: 12,
    color: "#868E96",
    marginTop: 5,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 20,
  },
  commentInput: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    marginRight: 10,
  },
  postCommentButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: "#007AFF",
    borderRadius: 20,
  },
  postCommentText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  commentLoader: {
    marginVertical: 20,
  },
  noCommentsText: {
    fontSize: 14,
    color: "#868E96",
    textAlign: "center",
    marginVertical: 20,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: "#FFDDDD",
    alignItems: "center",
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 16,
  },
  noPostsText: {
    fontSize: 16,
    color: "#868E96",
    textAlign: "center",
    padding: 20,
  },
});