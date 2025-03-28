import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  FlatList,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Video } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { debounce } from 'lodash';
import Modal from 'react-native-modal';

const { width } = Dimensions.get('window');
const NGROK_URL = 'https://pitch-backend-avb7geahhvfteqf9.centralindia-01.azurewebsites.net/';

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

const PostItem = memo(({ item, index, toggleExpand, expandedItems, navigation, isVisible }) => {
  const [imageHeight, setImageHeight] = useState(width); // Default height
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes || 0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const animatedScale = useRef(new Animated.Value(1)).current;
  const videoRef = useRef(null);

  useEffect(() => {
    fetchLikeStatus();
    const mediaUrl = item.image_url || item.media_url;
    if (typeof mediaUrl === 'string') {
      if (mediaUrl.match(/\.(mp4|mov|avi|wmv|3gp|mkv)$/i)) {
        setIsVideo(true);
        setImageHeight(width * 5 / 4);
        setIsLoading(false);
      } else if (mediaUrl.startsWith('http')) {
        Image.getSize(
          mediaUrl,
          (imgWidth, imgHeight) => {
            setImageHeight(width / (imgWidth / imgHeight));
            setIsLoading(false);
            console.log(`Post ${index} height set: ${width / (imgWidth / imgHeight)}`);
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
    }
  }, [item, index]);

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

  const fetchLikeStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token || !item.post_id) return;
      const response = await axios.get(`${NGROK_URL}/api/posts/${item.post_id}/likes`, {
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
      setIsCommentsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token || !item.post_id) return;
      const response = await axios.get(`${NGROK_URL}/api/posts/${item.post_id}/comments`, {
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
      if (!token || !item.post_id) return;
      setIsLikeLoading(true);
      setIsLiked((prev) => !prev);
      setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
      const response = await axios.post(
        `${NGROK_URL}/api/posts/${item.post_id}/toggle-like`,
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token || !item.post_id) return;
      await axios.post(
        `${NGROK_URL}/api/posts/${item.post_id}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchComments();
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handlePressIn = () => {
    Animated.spring(animatedScale, { toValue: 0.98, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animatedScale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: animatedScale }] }]}>
      <View style={styles.cardHeader}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Profile', { username: item.username, isOtherUser: true })
          }
        >
          <View style={styles.userInfo}>
            <Image
              source={item.profile_picture ? { uri: item.profile_picture } : require('../assets/del.png')}
              style={styles.avatar}
            />
            <Text style={styles.name}>{item.username || 'Unknown User'}</Text>
          </View>
        </TouchableOpacity>
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
              style={[styles.postImage, { height: imageHeight }]}
              resizeMode="cover"
              isLooping={true}
              onLoad={() => setIsLoading(false)}
              onError={(e) => {
                console.error('Video error:', e);
                setIsLoading(false);
              }}
              useNativeControls={true}
            />
          ) : (
            <Image
              source={
                item.image_url || item.media_url
                  ? { uri: item.image_url || item.media_url }
                  : require('../assets/del.png')
              }
              style={[styles.postImage, { height: imageHeight }]}
              resizeMode="cover"
              onLoad={() => setIsLoading(false)}
              onError={(e) => {
                console.error('Image error:', e.nativeEvent.error);
                setIsLoading(false);
              }}
            />
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.cardFooter}>
        <Text style={styles.likes}>👍 {likeCount} Likes</Text>
        <Text style={styles.comments}>💬 {comments.length || item.comments || 0} Comments</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={debounce(handleLike, 300)}
          disabled={isLikeLoading}
        >
          <Image
            source={require('../assets/icon-like.png')}
            style={[styles.navIcon, isLiked && { tintColor: '#1f219c' }, isLikeLoading && { opacity: 0.5 }]}
          />
          {isLikeLoading && <ActivityIndicator size="small" color="#1f219c" style={styles.likeLoader} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            fetchComments();
            setIsCommentModalVisible(true);
          }}
        >
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
          <Text style={styles.username}>{item.username} </Text>
          {item.content}
        </Text>
        {item.content && item.content.length > 80 && (
          <TouchableOpacity onPress={() => toggleExpand(index)}>
            <Text style={styles.showMoreText}>
              {expandedItems[index] ? 'Show less' : 'Show more'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        isVisible={isCommentModalVisible}
        onBackdropPress={() => setIsCommentModalVisible(false)}
        onSwipeComplete={() => setIsCommentModalVisible(false)}
        swipeDirection="down"
        backdropOpacity={0.5}
        style={styles.commentModal}
      >
        <View style={styles.commentModalContent}>
          <View style={styles.commentModalHeader}>
            <Text style={styles.commentModalTitle}>Comments</Text>
            <TouchableOpacity onPress={() => setIsCommentModalVisible(false)}>
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

const PostViewScreen = ({ route }) => {
  const { posts: initialPosts = [], initialIndex = 0 } = route?.params || {};
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [expandedItems, setExpandedItems] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [posts, setPosts] = useState(initialPosts);
  const [viewableItems, setViewableItems] = useState([]);
  const [isInitialScrollDone, setIsInitialScrollDone] = useState(false);

  const toggleExpand = useCallback((index) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPosts(initialPosts);
    setCurrentIndex(initialIndex);
    setIsRefreshing(false);
    setIsInitialScrollDone(false);
  }, [initialPosts, initialIndex]);

  useEffect(() => {
    console.log('Posts received:', posts.length, 'items');
    console.log('Initial index:', initialIndex);
    if (posts.length > 0 && initialIndex >= 0 && flatListRef.current) {
      setTimeout(() => {
        console.log('Forcing scroll to index:', initialIndex);
        flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
        setIsInitialScrollDone(true);
      }, 1500); // Increased delay for rendering
    }
  }, [posts, initialIndex]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }) => {
      if (viewableItems.length > 0 && isInitialScrollDone) {
        const topItem = viewableItems[0];
        console.log('Viewable changed to index:', topItem.index, 'from', currentIndex);
        setCurrentIndex(topItem.index);
        setViewableItems(viewableItems.map((item) => item.index));
      }
    },
    [isInitialScrollDone]
  );

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const getItemLayout = (data, index) => ({
    length: width * 1.5, // Fallback height: adjust based on avg post height
    offset: (width * 1.5) * index,
    index,
  });

  const onScrollToIndexFailed = (info) => {
    console.log('Scroll to index failed:', info);
    const retryScroll = (attempt = 1) => {
      if (attempt > 3) {
        console.log('Max retries reached, falling back to offset');
        const estimatedOffset = info.index * (width * 1.5); // Match getItemLayout
        flatListRef.current.scrollToOffset({ offset: estimatedOffset, animated: false });
        setIsInitialScrollDone(true);
        return;
      }
      setTimeout(() => {
        if (flatListRef.current && posts.length > info.index) {
          console.log(`Retry attempt ${attempt} for index:`, info.index);
          flatListRef.current.scrollToIndex({ index: info.index, animated: false });
        }
      }, 1000 * attempt);
    };
    retryScroll();
  };

  const handleLayout = () => {
    console.log('FlatList laid out with', posts.length, 'items');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {posts.length > 0 ? `${Math.min(currentIndex + 1, posts.length)} of ${posts.length}` : 'No posts'}
        </Text>
        <View style={styles.backButton} />
      </View>

      {posts.length > 0 ? (
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={({ item, index }) => (
            <PostItem
              item={item}
              index={index}
              toggleExpand={toggleExpand}
              expandedItems={expandedItems}
              navigation={navigation}
              isVisible={viewableItems.includes(index)}
            />
          )}
          keyExtractor={(item) => item._id || item.post_id}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          getItemLayout={getItemLayout}
          onScrollToIndexFailed={onScrollToIndexFailed}
          onLayout={handleLayout}
          initialNumToRender={4} // All posts for small list
          maxToRenderPerBatch={4} // Ensure smooth batch rendering
          initialScrollIndex={initialIndex}
        />
      ) : (
        <Text style={{ textAlign: 'center', padding: 20 }}>No posts available</Text>
      )}
    </SafeAreaView>
  );
};

PostViewScreen.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      posts: PropTypes.array,
      initialIndex: PropTypes.number,
    }),
  }),
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#212529',
  },
  card: {
    backgroundColor: '#fff',
    width: width,
    marginBottom: 10,
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
  commentItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  likeLoader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
});

export default PostViewScreen;