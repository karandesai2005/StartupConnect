import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Animated,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Video } from 'expo-av';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';
import { debounce } from 'lodash';
import { supabase } from '../services/supabase';
import { NGROK_URL } from "@env";

const { width } = Dimensions.get('window');
const FIXED_MEDIA_HEIGHT = width * 5 / 4;

const isDev = __DEV__;
const log = (...args) => isDev && console.log(...args);

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

const PostItem = memo(({ item, index, currentUsername, isVisible, expandedItems, toggleExpand, onDelete }) => {
  const navigation = useNavigation();
  const videoRef = useRef(null);
  const animatedScale = useRef(new Animated.Value(1)).current;
  const [isLoading, setIsLoading] = useState(true);
  const [mediaLoadError, setMediaLoadError] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(item.isLiked || false);
  const [likeCount, setLikeCount] = useState(item.likeCount || item.likes || 0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [comments, setComments] = useState(item.comments || []);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [isMoreModalVisible, setIsMoreModalVisible] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isMeasured, setIsMeasured] = useState(false);
  const [shouldShowMore, setShouldShowMore] = useState(false);

  const isUserPost = item.username === currentUsername;

  useEffect(() => {
    const mediaUrl = item.media_url;
    if (typeof mediaUrl === 'string' && mediaUrl.startsWith('http')) {
      Image.getSize(
        mediaUrl,
        () => setIsLoading(false),
        (error) => {
          log('Error getting image size:', error);
          setIsLoading(false);
          setMediaLoadError(true);
        }
      );
    } else {
      log('Media URL invalid:', mediaUrl);
      setIsLoading(false);
      setMediaLoadError(true);
    }
    fetchComments();
  }, [item]);

  useEffect(() => {
    if (item.media_type === 'video' && videoRef.current) {
      if (isVisible) {
        videoRef.current.playAsync().catch((error) => console.error('Play error:', error));
      } else {
        videoRef.current.pauseAsync().catch((error) => console.error('Pause error:', error));
      }
    }
    return () => {
      if (item.media_type === 'video' && videoRef.current) {
        videoRef.current.unloadAsync().catch(() => { });
      }
      animatedScale.stopAnimation();
    };
  }, [isVisible, item.media_type]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (item.media_type === 'video' && videoRef.current) {
          videoRef.current.pauseAsync().catch((error) => console.error('Pause on unfocus error:', error));
        }
      };
    }, [item.media_type])
  );

  const getPostId = () => item.post_id || item._id || item.id;

  const fetchComments = async () => {
    try {
      setIsCommentsLoading(true);
      const token = await AsyncStorage.getItem('token');
      const postId = getPostId();
      if (!token || !postId) return;

      const baseUrl = NGROK_URL.replace(/\/+$/, "");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      let retryCount = 0;
      const maxRetries = 3;
      while (retryCount < maxRetries) {
        try {
          const response = await fetch(`${baseUrl}/api/posts/${postId}/comments`, {
            method: "GET",
            headers,
            credentials: "include",
          });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          setComments(data || []);
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          log(`Retry ${retryCount}/${maxRetries} for fetching comments:`, error.message);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
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
      let token = await AsyncStorage.getItem('token');
      const postId = getPostId();
      if (!token || !postId) return;
      setIsLikeLoading(true);
      setIsLiked((prev) => !prev);
      setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));

      const baseUrl = NGROK_URL.replace(/\/+$/, "");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      let retryCount = 0;
      const maxRetries = 3;
      while (retryCount < maxRetries) {
        try {
          const response = await fetch(`${baseUrl}/api/posts/${postId}/toggle-like`, {
            method: "POST",
            headers,
            credentials: "include",
          });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          if (data && data.success) {
            setIsLiked(data.liked);
            setLikeCount(data.like_count);
          }
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          log(`Retry ${retryCount}/${maxRetries} for liking post:`, error.message);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));

          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !session) {
            throw new Error('Session refresh failed during retry');
          }
          token = session.access_token;
          await AsyncStorage.setItem('token', token);
          headers["Authorization"] = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error updating like:', error);
      setIsLiked((prev) => !prev);
      setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1));
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleDeletePost = async () => {
    try {
      let token = await AsyncStorage.getItem('token');
      const postId = getPostId();
      if (!token || !postId) return;

      const baseUrl = NGROK_URL.replace(/\/+$/, "");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      let retryCount = 0;
      const maxRetries = 3;
      while (retryCount < maxRetries) {
        try {
          const response = await fetch(`${baseUrl}/api/posts/${postId}`, {
            method: "DELETE",
            headers,
            credentials: "include",
          });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          setIsMoreModalVisible(false);
          if (onDelete) onDelete(postId);
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          log(`Retry ${retryCount}/${maxRetries} for deleting post:`, error.message);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));

          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !session) {
            throw new Error('Session refresh failed during retry');
          }
          token = session.access_token;
          await AsyncStorage.setItem('token', token);
          headers["Authorization"] = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  const debouncedHandleLike = debounce(handleLike, 300);
  const debouncedHandleAddComment = debounce(async () => {
    if (!newComment.trim()) return;
    try {
      let token = await AsyncStorage.getItem('token');
      const postId = getPostId();
      if (!token || !postId) return;

      const baseUrl = NGROK_URL.replace(/\/+$/, "");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      let retryCount = 0;
      const maxRetries = 3;
      while (retryCount < maxRetries) {
        try {
          const response = await fetch(`${baseUrl}/api/posts/${postId}/comments`, {
            method: "POST",
            headers,
            body: JSON.stringify({ content: newComment }),
            credentials: "include",
          });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          await fetchComments();
          setNewComment('');
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          log(`Retry ${retryCount}/${maxRetries} for adding comment:`, error.message);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));

          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !session) {
            throw new Error('Session refresh failed during retry');
          }
          token = session.access_token;
          await AsyncStorage.setItem('token', token);
          headers["Authorization"] = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }, 300);

  const handleProfilePress = () => navigation.navigate('Profile', { username: item.username, isOtherUser: true });
  const handleChatPress = () => console.log('Chat/Share pressed');
  const toggleCommentModal = () => setIsCommentModalVisible((prev) => !prev);
  const toggleMoreModal = () => setIsMoreModalVisible((prev) => !prev);
  const handleDoubleTap = () => debouncedHandleLike();
  const handlePressIn = () => Animated.spring(animatedScale, { toValue: 0.98, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(animatedScale, { toValue: 1, useNativeDriver: true }).start();

  const handleTextLayout = (event) => {
    const { height } = event.nativeEvent.layout;
    setShouldShowMore(height > 40);
    setIsMeasured(true);
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: animatedScale }] }]}>
      <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <TouchableOpacity onPress={handleProfilePress}>
              <Image
                source={
                  profileImageError ||
                    typeof item.profile_picture !== 'string' ||
                    !item.profile_picture.startsWith('http')
                    ? require('../assets/profiledefault.jpg')
                    : { uri: item.profile_picture }
                }
                style={styles.avatar}
                onError={() => {
                  console.error('PostItem: Profile image loading error:', item.profile_picture);
                  setProfileImageError(true);
                }}
              />
            </TouchableOpacity>
            <View>
              <Text style={styles.name}>
                {isUserPost ? item.username : item.name ? item.name.first : 'User'}
              </Text>
              <Text style={styles.timeStamp}>{formatTimestamp(item.created_at)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton} onPress={toggleMoreModal}>
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
        <View style={[styles.imageContainer, { height: FIXED_MEDIA_HEIGHT }]}>
          {isLoading && (
            <View style={styles.imageLoader}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}
          {(mediaLoadError || !item.media_url || !item.media_url.startsWith('http')) ? (
            <Image
              source={require('../assets/PITCH.png')}
              style={[styles.postImage, { height: FIXED_MEDIA_HEIGHT }]}
            />
          ) : item.media_type === 'video' ? (
            <Video
              ref={videoRef}
              source={{ uri: item.media_url }}
              style={[styles.video, { height: FIXED_MEDIA_HEIGHT }]}
              resizeMode="cover"
              isLooping={true}
              onLoad={() => setIsLoading(false)}
              onError={(error) => {
                console.error(`Video loading error for ${item.media_url}:`, error);
                setIsLoading(false);
                setMediaLoadError(true);
              }}
              useNativeControls={false}
            />
          ) : (
            <Image
              source={{ uri: item.media_url }}
              style={[styles.postImage, { height: FIXED_MEDIA_HEIGHT }]}
              onLoad={() => setIsLoading(false)}
              onError={(error) => {
                console.error(`Image loading error for ${item.media_url}:`, error.nativeEvent);
                setIsLoading(false);
                setMediaLoadError(true);
              }}
            />
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
          accessibilityLabel={isLiked ? "Unlike post" : "Like post"}
          accessibilityRole="button"
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
        <TouchableOpacity
          style={styles.actionButton}
          onPress={toggleCommentModal}
          accessibilityLabel="View comments"
          accessibilityRole="button"
        >
          <Image source={require('../assets/comment6.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleChatPress}
          accessibilityLabel="Share post"
          accessibilityRole="button"
        >
          <Image source={require('../assets/share.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleChatPress}
          accessibilityLabel="Save post"
          accessibilityRole="button"
        >
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
            <Text style={styles.showMoreText}>{expandedItems[index] ? 'Show less' : 'Show more'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        isVisible={isCommentModalVisible}
        onBackdropPress={toggleCommentModal}
        backdropOpacity={0.5}
        backdropColor="#000"
        style={styles.commentModal}
        animationIn="fadeIn"
        animationOut="fadeOut"
        useNativeDriver={true}
        avoidKeyboard={true}
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
                  <Text style={styles.commentTimestamp}>{formatTimestamp(item.created_at)}</Text>
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
              onSubmitEditing={debouncedHandleAddComment}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.postCommentButton} onPress={debouncedHandleAddComment}>
              <Text style={styles.postCommentText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        isVisible={isMoreModalVisible}
        onBackdropPress={toggleMoreModal}
        onSwipeComplete={toggleMoreModal}
        swipeDirection="down"
        backdropOpacity={0.5}
        backdropColor="#000"
        style={styles.moreModal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        useNativeDriver={true}
      >
        <View style={styles.moreModalContent}>
          {isUserPost && (
            <TouchableOpacity style={styles.moreOption} onPress={handleDeletePost}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.moreOption} onPress={toggleMoreModal}>
            <Text style={styles.optionText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </Animated.View>
  );
});

PostItem.propTypes = {
  item: PropTypes.shape({
    post_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    username: PropTypes.string,
    media_url: PropTypes.string,
    content: PropTypes.string,
    caption: PropTypes.string,
    profile_picture: PropTypes.string,
    created_at: PropTypes.string,
    likes: PropTypes.number,
    comments: PropTypes.array,
    media_type: PropTypes.string,
  }).isRequired,
  index: PropTypes.number.isRequired,
  currentUsername: PropTypes.string,
  isVisible: PropTypes.bool.isRequired,
  expandedItems: PropTypes.object.isRequired,
  toggleExpand: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', width: width, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  name: { fontSize: 15, fontWeight: '600', color: '#212529' },
  timeStamp: { fontSize: 12, color: '#868E96' },
  moreButton: { padding: 8 },
  moreButtonText: { fontSize: 16, color: '#868E96', fontWeight: 'bold' },
  imageContainer: { width: width, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imageLoader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  postImage: { width: width, resizeMode: 'cover' },
  video: { width: width, resizeMode: 'cover' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5, paddingHorizontal: 10 },
  likes: { fontWeight: 'bold', color: '#555' },
  comments: { fontWeight: 'bold', color: '#555' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  actionButton: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  navIcon: { width: 20, height: 20 },
  captionContainer: { paddingHorizontal: 12, paddingBottom: 12 },
  caption: { fontSize: 14, color: '#495057', lineHeight: 20 },
  measureText: { position: 'absolute', opacity: 0 },
  username: { fontWeight: '600', color: '#212529' },
  showMoreText: { fontSize: 14, color: '#868E96', marginTop: 4 },
  commentModal: { justifyContent: 'flex-end', margin: 0 },
  commentModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 15, borderTopRightRadius: 15, padding: 15, flex: 1, maxHeight: '90%' },
  commentModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  commentModalTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  closeButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  commentList: { flex: 1, marginBottom: 15 },
  commentListContent: { paddingBottom: 10 },
  commentItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  commentUsername: { fontSize: 14, fontWeight: '600', color: '#212529' },
  commentText: { fontSize: 14, color: '#495057', marginTop: 5 },
  commentTimestamp: { fontSize: 12, color: '#868E96', marginTop: 5 },
  commentInputContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  commentInput: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, marginRight: 10 },
  postCommentButton: { paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#007AFF', borderRadius: 20 },
  postCommentText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  commentLoader: { marginVertical: 20 },
  noCommentsText: { fontSize: 14, color: '#868E96', textAlign: 'center', marginVertical: 20 },
  moreModal: { justifyContent: 'flex-end', margin: 0 },
  moreModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 10,
  },
  moreOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deleteText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
});

export default PostItem;