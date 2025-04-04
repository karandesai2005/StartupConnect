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
import axios from 'axios';
import Modal from 'react-native-modal';
import { debounce } from 'lodash';

const { width } = Dimensions.get('window');
const NGROK_URL = 'https://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net/';
const FIXED_MEDIA_HEIGHT = width * 5 / 4; // Same as PostViewScreen

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

const PostItem = memo(({ item, index, currentUsername, isVisible, expandedItems, toggleExpand }) => {
  const navigation = useNavigation();
  const videoRef = useRef(null);
  const animatedScale = useRef(new Animated.Value(1)).current;
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(item.isLiked || false);
  const [likeCount, setLikeCount] = useState(item.likeCount || item.likes || 0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [comments, setComments] = useState(item.comments || []);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isVideo, setIsVideo] = useState(item.media_type === 'video');
  const [isMeasured, setIsMeasured] = useState(false);
  const [shouldShowMore, setShouldShowMore] = useState(false);

  const isUserPost = item.username === currentUsername;

  useEffect(() => {
    const mediaUrl = item.image_url || item.media_url;
    if (typeof mediaUrl === 'string') {
      if (mediaUrl.match(/\.(mp4|mov|avi|wmv|3gp|mkv)$/i)) {
        setIsVideo(true);
      } else if (mediaUrl.startsWith('http')) {
        Image.getSize(
          mediaUrl,
          () => setIsLoading(false),
          (error) => {
            console.log('Error getting image size:', error);
            setIsLoading(false);
          }
        );
      } else {
        setIsLoading(false);
      }
    }
    fetchComments();
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
      animatedScale.stopAnimation();
    };
  }, [isVisible, isVideo]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (isVideo && videoRef.current) {
          videoRef.current.pauseAsync().catch((error) => console.error('Pause on unfocus error:', error));
        }
      };
    }, [isVideo])
  );

  const getPostId = () => item.post_id || item._id || item.id;

  const fetchComments = async () => {
    try {
      setIsCommentsLoading(true);
      const token = await AsyncStorage.getItem('token');
      const postId = getPostId();
      if (!token || !postId) return;
      const response = await axios.get(`${NGROK_URL}/api/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(response.data || []);
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
      const postId = getPostId();
      if (!token || !postId) return;
      setIsLikeLoading(true);
      setIsLiked((prev) => !prev);
      setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
      const response = await axios.post(
        `${NGROK_URL}/api/posts/${postId}/toggle-like`,
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

  const debouncedHandleLike = debounce(handleLike, 300);
  const debouncedHandleAddComment = debounce(async () => {
    if (!newComment.trim()) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const postId = getPostId();
      if (!token || !postId) return;
      await axios.post(
        `${NGROK_URL}/api/posts/${postId}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchComments();
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }, 300);

  const handleProfilePress = () => navigation.navigate('Profile', { username: item.username, isOtherUser: true });
  const handleChatPress = () => console.log('Chat/Share pressed');
  const toggleCommentModal = () => setIsCommentModalVisible((prev) => !prev);
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
                  typeof item.profile_picture === 'string' && item.profile_picture.startsWith('http')
                    ? { uri: item.profile_picture }
                    : require('../assets/profiledefault.jpg')
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
          <TouchableOpacity
            style={styles.moreButton}
            onPress={(e) => {
              e.stopPropagation();
              console.log('More button pressed for post:', getPostId());
            }}
          >
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
          {isVideo ? (
            <Video
              ref={videoRef}
              source={{ uri: item.image_url || item.media_url }}
              style={[styles.video, { height: FIXED_MEDIA_HEIGHT }]}
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
              style={[styles.postImage, { height: FIXED_MEDIA_HEIGHT }]}
              onLoad={() => setIsLoading(false)}
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
            <Text style={styles.showMoreText}>{expandedItems[index] ? 'Show less' : 'Show more'}</Text>
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
    </Animated.View>
  );
});

PostItem.propTypes = {
  item: PropTypes.shape({
    post_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    username: PropTypes.string,
    image_url: PropTypes.string,
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
});

export default PostItem;