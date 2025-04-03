import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PostItem from './PostItem';

const { width } = Dimensions.get('window');
const FIXED_IMAGE_HEIGHT = width * 5 / 4; // Match PostItem
const FIXED_VIDEO_HEIGHT = width * 9 / 16; // Match PostItem
const FIXED_CONTENT_HEIGHT = 150; // Approximate height of header, footer, actions, and caption

const PostViewScreen = ({ route }) => {
  const { posts: initialPosts = [], initialIndex = 0 } = route?.params || {};
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const hasScrolledToInitialRef = useRef(false); // Track if initial scroll has happened
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [expandedItems, setExpandedItems] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [posts, setPosts] = useState(initialPosts.map(post => ({
    ...post,
    isLiked: false,
    likeCount: post.likes || 0,
    comments: post.comments || [],
    media_type: post.media_type || (post.image_url?.includes('.mp4') ? 'video' : 'image'),
  })));
  const [currentUsername, setCurrentUsername] = useState('');

  useEffect(() => {
    const getCurrentUser = async () => {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) setCurrentUsername(JSON.parse(userDataStr).username);
    };
    getCurrentUser();
  }, []);

  // Preload media for nearby posts
  const preloadMedia = useCallback(() => {
    const preloadRange = 2;
    const start = Math.max(0, currentIndex - preloadRange);
    const end = Math.min(posts.length, currentIndex + preloadRange + 1);
    posts.slice(start, end).forEach(post => {
      if (post.image_url || post.media_url) {
        Image.prefetch(post.image_url || post.media_url).catch(e => console.error('Prefetch error:', e));
      }
    });
  }, [currentIndex, posts]);

  // Initial scroll on mount only
  useEffect(() => {
    if (posts.length > 0 && initialIndex >= 0 && !hasScrolledToInitialRef.current) {
      flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      hasScrolledToInitialRef.current = true; // Mark as done
    }
    preloadMedia();
  }, [posts, initialIndex, preloadMedia]); // Only runs when posts or initialIndex change on mount

  const toggleExpand = useCallback((index) => {
    setExpandedItems(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index);
  }, []);

  const getItemLayout = useCallback((data, index) => {
    const isVideo = posts[index]?.media_type === 'video';
    const mediaHeight = isVideo ? FIXED_VIDEO_HEIGHT : FIXED_IMAGE_HEIGHT;
    const itemHeight = mediaHeight + FIXED_CONTENT_HEIGHT;
    return {
      length: itemHeight,
      offset: posts.slice(0, index).reduce((sum, p) => {
        const h = p.media_type === 'video' ? FIXED_VIDEO_HEIGHT : FIXED_IMAGE_HEIGHT;
        return sum + h + FIXED_CONTENT_HEIGHT;
      }, 0),
      index,
    };
  }, [posts]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerText}>{posts.length > 0 ? `${Math.min(currentIndex + 1, posts.length)} of ${posts.length}` : 'No posts'}</Text>
      <View style={styles.backButton} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {posts.length > 0 ? (
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={({ item, index }) => (
            <PostItem
              item={item}
              index={index}
              currentUsername={currentUsername}
              isVisible={index === currentIndex}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
            />
          )}
          keyExtractor={(item) => (item.post_id || item._id || item.id).toString()}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          getItemLayout={getItemLayout}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            setPosts(initialPosts);
            setCurrentIndex(initialIndex);
            setIsRefreshing(false);
            hasScrolledToInitialRef.current = false; // Reset on refresh
          }}
        />
      ) : (
        <>
          {renderHeader()}
          <Text style={{ textAlign: 'center', padding: 20 }}>No posts available</Text>
        </>
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E9ECEF', height: 64 },
  headerText: { fontSize: 16, fontWeight: '600', color: '#212529' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: '#212529' },
});

export default PostViewScreen;