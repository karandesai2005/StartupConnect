import React, { useEffect, useState, useCallback, memo } from 'react';
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

const { width } = Dimensions.get('window');

// Memoized Post Card Component
const PostCard = memo(({ item, index, toggleExpand, expandedItems }) => {
  const [imageHeight, setImageHeight] = useState(width);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false); // State to track like status
  const animatedScale = new Animated.Value(1);

  // Calculate image dimensions when the component mounts
  useEffect(() => {
    Image.getSize(
      item.postImage || 'https://picsum.photos/800/800',
      (originalWidth, originalHeight) => {
        const aspectRatio = originalWidth / originalHeight;
        const calculatedHeight = width / aspectRatio;
        setImageHeight(calculatedHeight);
      },
      (error) => {
        console.log('Error getting image size:', error);
        setImageHeight(width);
      }
    );
  }, []);

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

  // Toggle like status
  const toggleLike = () => {
    setIsLiked(!isLiked);
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: animatedScale }] }]}>
      {/* User Info Header */}
      <View style={styles.cardHeader}>
        <TouchableOpacity style={styles.userInfo}>
          <Image source={{ uri: item.picture.thumbnail }} style={styles.avatar} />
          <View>
            <Text style={styles.name}>
              {item.name.first} {item.name.last}
            </Text>
            <Text style={styles.timeStamp}>2h ago</Text>
          </View>
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
            source={{ uri: 'https://picsum.photos/800/800' }}
            style={[styles.postImage, { height: imageHeight }]}
            resizeMode="contain"
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
          />
        </View>
      </TouchableOpacity>

      {/* Engagement Section */}
      <View style={styles.cardFooter}>
        <Text style={styles.likes}>👍️ 789K Likes</Text>
        <Text style={styles.comments}>💬 3M Comments</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={toggleLike}>
          <Image
            source={require('../assets/icon-like.png')}
            style={[styles.navIcon, { tintColor: isLiked ? '#1f219c' : 'black' }]}
          />
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
          <Text style={styles.username}>{item.name.first} </Text>
          This is a sample text. This is the comment. Let's go. This is a good MVP.
          Additional content for testing the "Show More" functionality...
        </Text>
        <TouchableOpacity onPress={() => toggleExpand(index)}>
          <Text style={styles.showMoreText}>
            {expandedItems[index] ? 'Show less' : 'Show more'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

// Main HomeScreen Component
export default function HomeScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedItems, setExpandedItems] = useState({});
  const navigation = useNavigation();

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

  useEffect(() => {
    loadUsers();
  }, [currentPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    loadUsers(true);
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

  return (
    <View style={styles.container}>
      <View style={styles.statusBarBackground} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfileP')}>
          <Image source={require('../assets/del.png')} style={styles.profilePic} />
        </TouchableOpacity>
        <TextInput
          style={styles.searchBar}
          placeholder="Search..."
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity onPress={() => navigation.navigate('Chat')}>
          <Image source={require('../assets/Arrow.png')} style={styles.chatIcon} />
        </TouchableOpacity>
      </View>

      {/* Post List */}
      <FlatList
        data={users}
        renderItem={({ item, index }) => (
          <PostCard
            item={item}
            index={index}
            toggleExpand={toggleExpand}
            expandedItems={expandedItems}
          />
        )}
        keyExtractor={(item, index) => index.toString()}
        onEndReached={() => setCurrentPage(prev => prev + 1)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContentContainer}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Image source={require('../assets/home4.webp')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Image source={require('../assets/plus3.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Image source={require('../assets/bell.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfileB')}>
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
      android: -10
    })
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  searchBar: {
    flex: 1,
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
    height: '100%',
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
});
