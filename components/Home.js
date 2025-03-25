// components/Home.js
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
  ScrollView,
  BackHandler,
  SafeAreaView,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NGROK_URL } from '@env';
import { Video } from 'expo-av';
import { debounce } from 'lodash';
import Modal from 'react-native-modal';
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
const PostCard = memo(({ item, index, toggleExpand, expandedItems, isVisible, navigation }) => {
  const [imageHeight, setImageHeight] = useState(width);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes || 0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const animatedScale = new Animated.Value(1);
  const [isVideo, setIsVideo] = useState(false);
  const videoRef = React.useRef(null);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const debouncedHandleLike = useCallback(debounce(async () => handleLike(), 300), [handleLike]);
  const isUserPost = item.hasOwnProperty('caption') || item.hasOwnProperty('content');

  useEffect(() => {
    fetchLikeStatus();
  }, [item.post_id]);

  useEffect(() => {
    const mediaUrl = item.image_url || item.media_url;
    if (typeof mediaUrl === 'string') {
      if (mediaUrl.match(/\.(mp4|mov|avi|wmv|3gp|mkv)$/i)) {
        setIsVideo(true);
        setImageHeight(width * 5 / 4);
        setIsLoading(false);
      } else if (mediaUrl.startsWith('http')) {
        Image.getSize(
          mediaUrl,
          (originalWidth, originalHeight) => {
            const aspectRatio = originalWidth / originalHeight;
            setImageHeight(width / aspectRatio);
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
      setIsLoading(false);
    }
  }, [item]);

  useEffect(() => {
    if (isVideo && videoRef.current) {
      if (isVisible) {
        videoRef.current.playAsync().catch((error) => console.error('Play error:', error));
      } else {
        videoRef.current.pauseAsync().catch((error) => console.error('Pause error:', error));
      }
    }
    return () => {
      if (isVideo && videoRef.current) {
        videoRef.current.pauseAsync().catch(() => {});
      }
    };
  }, [isVisible, isVideo]);

  useEffect(() => {
    console.log('Comments state updated:', comments);
  }, [comments]);

  useEffect(() => {
    console.log('isCommentModalVisible changed:', isCommentModalVisible);
  }, [isCommentModalVisible]);

  useEffect(() => {
    if (isCommentModalVisible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        console.log('Hardware back press detected, closing modal');
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
      console.error('Error fetching like status:', error);
    }
  };

  const fetchComments = async () => {
    try {
      console.log('Fetching comments for post:', item.post_id);
      setIsCommentsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token || !item.post_id) return;
      const baseUrl = NGROK_URL.replace(/\/+$/, '');
      const response = await axios.get(`${baseUrl}/api/posts/${item.post_id}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        setComments(response.data || []);
        console.log(`Fetched comments for post ${item.post_id}:`, response.data);
      } else {
        console.warn('No data returned from comments API');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setIsCommentsLoading(false);
    }
  };

  const handleLike = async () => {
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
      if (response.data) {
        setIsLiked(response.data.liked === 1);
        setLikeCount(response.data.likeCount);
      }
    } catch (error) {
      console.error('Error updating like:', error);
      setIsLiked((prev) => !prev);
      setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleProfilePress = () => {
    const username = isUserPost
      ? item.username
      : item.name
      ? `${item.name.first} ${item.name.last}`
      : 'User';
    navigation.navigate('Profile', { username, isOtherUser: true });
  };

  const toggleCommentModal = () => {
    console.log('Toggling comment modal for post:', item.post_id, 'isVisible:', !isCommentModalVisible);
    if (!isCommentModalVisible) {
      fetchComments();
    }
    setIsCommentModalVisible(!isCommentModalVisible);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      console.log('❌ Comment not posted: New comment is empty or just whitespace');
      return;
    }
    try {
      console.log('🔍 Starting to add comment - Post ID:', item.post_id);
      console.log('📝 Comment content:', newComment);

      const token = await AsyncStorage.getItem('token');
      console.log('🔑 Retrieved token from AsyncStorage:', token ? 'Token found' : 'No token found');

      if (!token) {
        console.error('❌ No token found in AsyncStorage - Authentication required');
        return;
      }
      if (!item.post_id) {
        console.error('❌ No post_id found - Cannot post comment without a post ID');
        return;
      }

      const baseUrl = NGROK_URL.replace(/\/+$/, '');
      console.log('🚀 Sending POST request to:', `${baseUrl}/api/posts/${item.post_id}/comments`);
      console.log('📤 Request payload:', { content: newComment });
      console.log('🔐 Authorization header:', `Bearer ${token}`);

      const response = await axios.post(
        `${baseUrl}/api/posts/${item.post_id}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Comment posted successfully - Response:', response.data);
      if (response.data) {
        await fetchComments();
        setNewComment('');
        console.log('📋 Refreshed comments state from server');
        console.log('🧹 Cleared newComment input');
      }
    } catch (error) {
      console.error('❌ Error adding comment:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config,
      });
      if (error.response) {
        console.error('🌐 Server response:', error.response.data);
      } else if (error.request) {
        console.error('📡 No response received - Network issue:', error.request);
      } else {
        console.error('⚠️ Error setting up request:', error.message);
      }
      if (error.response?.status === 401) {
        console.error('🔒 Token invalid or expired - Attempting to refresh or login again');
      }
    }
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: animatedScale }] }]}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <TouchableOpacity onPress={handleProfilePress}>
            <Image
              source={
                typeof item.profile_picture === 'string' && item.profile_picture.startsWith('http')
                  ? { uri: item.profile_picture }
                  : require('../assets/del.png')
              }
              style={styles.avatar}
            />
          </TouchableOpacity>
          <View>
            <Text style={styles.name}>
              {isUserPost ? item.username : item.name ? item.name.first : 'User'}
            </Text>
            <Text style={styles.timeStamp}>{formatTimestamp(item.created_at)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Text style={styles.moreButtonText}>•••</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity activeOpacity={0.95} onPressIn={handlePressIn} onPressOut={handlePressOut}>
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
              style={[styles.video, { height: imageHeight }]}
              resizeMode="cover"
              isLooping={true}
              onLoad={() => setIsLoading(false)}
              onError={(error) => {
                console.error(`Video loading error for ${item.image_url || item.media_url}:`, error);
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
                  : require('../assets/PITCH.png')
              }
              style={[styles.postImage, { height: imageHeight }]}
              onLoad={() => setIsLoading(false)}
            />
          )}
          {isVideo && !isVisible && (
            <View style={styles.playButtonOverlay}>
              <Image source={require('../assets/play-button.png')} style={styles.playButton} />
            </View>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.cardFooter}>
        <Text style={styles.likes}>👍 {likeCount} Likes</Text>
        <Text style={styles.comments}>💬 {item.comment_count || comments.length || 0} Comments</Text>
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
            style={[styles.navIcon, isLiked && { tintColor: '#1f219c' }, isLikeLoading && { opacity: 0.5 }]}
          />
          {isLikeLoading && <ActivityIndicator size="small" color="#1f219c" style={styles.likeLoader} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={toggleCommentModal}>
          <Image source={require('../assets/comment6.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Image source={require('../assets/share.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Image source={require('../assets/save.png')} style={styles.navIcon} />
        </TouchableOpacity>
      </View>
      <View style={styles.captionContainer}>
        <Text style={styles.caption} numberOfLines={expandedItems[index] ? undefined : 2}>
          <Text style={styles.username}>
            {isUserPost ? item.username : item.name ? item.name.first : 'User'}{' '}
          </Text>
          {item.content || item.caption}
        </Text>
        {(item.content || item.caption) && (
          <TouchableOpacity onPress={() => toggleExpand(index)}>
            <Text style={styles.showMoreText}>{expandedItems[index] ? 'Show less' : 'Show more'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Comment Modal */}
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
          {console.log('Rendering comment modal with comments:', comments)}
          {isCommentsLoading ? (
            <ActivityIndicator size="large" color="#007AFF" style={styles.commentLoader} />
          ) : (
            <FlatList
              data={comments}
              renderItem={({ item }) => {
                console.log('Rendering comment:', item);
                return (
                  <View style={styles.commentItem}>
                    <Text style={styles.commentUsername}>{item.username || 'User'}</Text>
                    <Text style={styles.commentText}>{item.content}</Text>
                    <Text style={styles.commentTimestamp}>{formatTimestamp(item.created_at)}</Text>
                  </View>
                );
              }}
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
});

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
    'Tech',
    'AI',
    'Sustainability',
    'Finance',
    'Health',
    'Education',
    'Gaming',
    'Robotics',
    'Marketing',
    'Blockchain',
    'Design',
    'Data Science',
  ];

  const combinedData = useMemo(() => {
    const validPosts = myPosts.filter(
      (post) =>
        post &&
        (post.image_url || post.media_url) &&
        !String(post.image_url || post.media_url).includes('undefined')
    );
    return [...validPosts, ...users];
  }, [myPosts, users]);

  const loadUsers = useCallback(
    async (refresh = false) => {
      try {
        setLoading(true);
        const response = await axios.get(`https://randomuser.me/api?results=10&page=${currentPage}`);
        if (refresh) {
          setUsers(response.data.results);
        } else {
          setUsers((prev) => [...prev, ...response.data.results]);
        }
      } catch (error) {
        console.error('Error loading users:', error);
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
      const token = await AsyncStorage.getItem('token');
      const baseUrl = NGROK_URL.replace(/\/+$/, '');
      const response = await axios.get(`${baseUrl}/api/posts/all`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data && Array.isArray(response.data)) {
        const mappedPosts = response.data.map((post) => ({
          _id: post.post_id,
          post_id: post.post_id,
          username: post.username,
          profile_picture: post.profile_picture,
          image_url: post.media_url,
          content: post.content,
          created_at: post.created_at,
          likes: post.like_count || 0,
          comments: post.comment_count || 0,
          caption: post.content,
        }));
        const sortedPosts = mappedPosts
          .filter((post) => post.image_url && !post.image_url.includes('undefined'))
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
    fetchAllPosts();
  }, [currentPage]);

  const onRefresh = useCallback(() => {
    console.log('🔄 Refresh triggered...');
    setRefreshing(true);
    setCurrentPage(1);
    loadUsers(true);
    fetchAllPosts();
  }, []);

  const toggleExpand = useCallback((index) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const renderFooter = () =>
    loading && (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );

  const fetchUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const baseUrl = NGROK_URL.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/api/auth/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('User data fetched:', data); // Log to verify is_business/is_personal
        setUserData(data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
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
    if (item.post_id) return `post-${item.post_id}`;
    if (item.login?.uuid) return `user-${item.login.uuid}`;
    return `item-${index}`;
  }, []);

  const toggleField = (field) => {
    setSelectedFields((current) =>
      current.includes(field) ? current.filter((item) => item !== field) : [...current, field]
    );
  };

  const handleSearchFocus = () => {
    navigation.navigate('Search');
  };

  // Updated function to handle profile navigation based on user type
  const handleProfilePress = () => {
    if (!userData) {
      console.log('User data not loaded yet');
      return;
    }

    const isBusinessUser = userData.is_business; // Directly use boolean value
    const username = userData.username;

    if (isBusinessUser) {
      navigation.navigate('BusinessProfile', { username, isOtherUser: false });
    } else {
      navigation.navigate('Profile', { username, isOtherUser: false });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleProfilePress}>
          <Image
            source={
              userData?.profile_picture
                ? { uri: userData.profile_picture }
                : require('../assets/del.png')
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
          <TouchableOpacity onPress={() => navigation.navigate('Chat')}>
            <Image source={require('../assets/Arrow.png')} style={styles.chatIcon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconSpacing}
            onPress={() => setFieldsModalVisible(true)}
          >
            <Image source={require('../assets/options.png')} style={styles.filterIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
            />
          )}
          keyExtractor={keyExtractor}
          onEndReached={() => setCurrentPage((prev) => prev + 1)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContentContainer}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      </KeyboardAvoidingView>

      <Modal
        isVisible={isFieldsModalVisible}
        onBackdropPress={() => setFieldsModalVisible(false)}
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
                  selectedFields.includes(field) && styles.selectedFieldBubble,
                ]}
                onPress={() => toggleField(field)}
              >
                <Text style={styles.fieldBubbleText}>{field}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFieldsModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    marginTop: Platform.OS === 'ios' ? 37 : 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 8,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    position: 'relative',
    marginHorizontal: 10,
  },
  searchBar: {
    width: '100%',
    paddingHorizontal: 15,
    backgroundColor: '#eee',
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
    width: 20,
    height: 20,
    marginBottom: Platform.OS === 'ios' ? 3 : 0,
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
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  modal: {
    justifyContent: 'center',
    margin: 0,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginHorizontal: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  fieldsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  fieldBubble: {
    margin: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#d9d9d9',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedFieldBubble: {
    backgroundColor: '#4CAF50',
  },
  fieldBubbleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  commentModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  commentModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 15,
    flex: 1,
    maxHeight: '90%',
  },
  commentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
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
    borderBottomColor: '#eee',
    minHeight: 60,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  commentText: {
    fontSize: 14,
    color: '#495057',
    marginTop: 5,
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#868E96',
    marginTop: 5,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    paddingBottom: 30,
  },
  commentInput: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    marginRight: 10,
  },
  postCommentButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  postCommentText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentLoader: {
    marginVertical: 20,
  },
  noCommentsText: {
    fontSize: 14,
    color: '#868E96',
    textAlign: 'center',
    marginVertical: 20,
  },
});