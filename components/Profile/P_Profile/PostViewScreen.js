import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const PostViewScreen = ({ route }) => {
  const { posts, initialIndex } = route.params;
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [expandedItems, setExpandedItems] = useState({});
  
  const toggleExpand = useCallback((index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  const renderPost = ({ item, index }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(item.likes || 0);
    const [imageHeight, setImageHeight] = useState(width);
    const [isLoading, setIsLoading] = useState(true);
    const animatedScale = new Animated.Value(1);

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

    const handleLike = () => {
      setIsLiked(prev => !prev);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    };

    return (
      <Animated.View style={[styles.card, { transform: [{ scale: animatedScale }] }]}>
        {/* User Info Header */}
        <View style={styles.cardHeader}>
          <TouchableOpacity style={styles.userInfo}>
            <Image
              source={
                item?.profile_picture
                  ? { uri: item.profile_picture }
                  : require('../../../assets/del.png')
              }
              style={styles.avatar}
            />
            <Text style={styles.name}>{item.username || 'Unknown User'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <Text style={styles.moreButtonText}>•••</Text>
          </TouchableOpacity>
        </View>

        {/* Post Image */}
        <TouchableOpacity
          activeOpacity={0.95}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={[styles.imageContainer, { height: imageHeight }]}>
            {isLoading && (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            )}
            <Image
              source={{ uri: item.image_url }}
              style={styles.postImage}
              onLoad={() => setIsLoading(false)}
            />
          </View>
        </TouchableOpacity>

        {/* Engagement Section */}
        <View style={styles.cardFooter}>
          <Text style={styles.likes}>👍 {likeCount} Likes</Text>
          <Text style={styles.comments}>💬 {item.comments || 0}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Image
              source={require('../../../assets/icon-like.png')}
              style={[styles.navIcon, isLiked && { tintColor: '#1f219c' }]}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Image source={require('../../../assets/comment6.png')} style={styles.navIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Image source={require('../../../assets/share.png')} style={styles.navIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Image source={require('../../../assets/save.png')} style={styles.navIcon} />
          </TouchableOpacity>
        </View>

        {/* Caption */}
        <View style={styles.captionContainer}>
          <Text
            style={styles.caption}
            numberOfLines={expandedItems[index] ? undefined : 2}
          >
            <Text style={styles.username}>{item.username} </Text>
            {item.caption}
          </Text>
          <TouchableOpacity onPress={() => toggleExpand(index)}>
            <Text style={styles.showMoreText}>
              {expandedItems[index] ? 'Show less' : 'Show more'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>{`${currentIndex + 1} of ${posts.length}`}</Text>
        <View style={styles.backButton} />
      </View>

      {/* Posts */}
      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item, index) => index.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.floor(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
        }}
      />
    </SafeAreaView>
  );
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
    height: '100%',
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
});

export default PostViewScreen;