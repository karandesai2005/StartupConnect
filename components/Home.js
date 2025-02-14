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
const PostCard = memo(({ item, index, toggleExpand, expandedItems }) => {
  const [imageHeight, setImageHeight] = useState(width);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes || 0);
  const animatedScale = new Animated.Value(1);

  const isUserPost = item.hasOwnProperty('caption');

  useEffect(() => {
    const imageUrl = isUserPost ? item.image_url : 'https://picsum.photos/800/800';
    Image.getSize(
      imageUrl,
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
  }, [item]);

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

  const handleLike = async () => {
    try {
      setIsLiked(prev => !prev);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

      // Here you would typically make an API call to update the like status
      // const token = await AsyncStorage.getItem("token");
      // await axios.post(`${NGROK_URL}/api/posts/${item._id}/like`, {}, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
    } catch (error) {
      // Revert the optimistic update if the API call fails
      setIsLiked(prev => !prev);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
      console.error('Error updating like:', error);
    }
  };


  return (
    <Animated.View style={[styles.card, { transform: [{ scale: animatedScale }] }]}>
      {/* User Info Header */}
      <View style={styles.cardHeader}>
        <TouchableOpacity style={styles.userInfo}>
          <Image
            source={
              typeof item.profile_picture === 'string' && item.profile_picture.startsWith('http')
                ? { uri: item.profile_picture }
                : item.picture?.thumbnail
                  ? { uri: item.picture.thumbnail }
                  : require('../assets/del.png')
            }
            style={styles.avatar}
          />
          <View>
            <Text>
              {item.name && item.name.first && item.name.last
                ? `${item.name.first} ${item.name.last}`
                : item.username || 'Unknown User'}
            </Text>
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
            source={
              typeof item.image_url === 'string' && item.image_url.startsWith('http')
                ? { uri: item.image_url }
                : require('../assets/PITCH.png')  // Create a placeholder image
            }
            style={styles.postImage}
          />
        </View>
      </TouchableOpacity>

      {/* Engagement Section */}
      <View style={styles.cardFooter}>
        <Text style={styles.likes}>👍 {likeCount} Likes</Text>
        <Text style={styles.comments}>💬 {item.comments || 0}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Image
            source={require('../assets/icon-like.png')}
            style={[
              styles.navIcon,
              isLiked && { tintColor: '#1f219c' }
            ]}
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
          <Text style={styles.username}>
            {isUserPost ? item.username : item.name.first}{' '}
          </Text>
          {item.content}
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
    const validPosts = myPosts.filter(post => post && post.image_url);
    const mergedData = [...validPosts, ...users];

    // console.log("🛠️ Combined Data for FlatList:", JSON.stringify(mergedData, null, 2)); // ✅ Check merged posts + users

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

  const fetchMyPosts = useCallback(async () => {
    try {
      setPostsError(null);
      const token = await AsyncStorage.getItem("token");

      console.log("🔑 Retrieved Token:", token); // ✅ Check token

      if (!token) {
        console.log("⚠️ No token found in AsyncStorage");
        setPostsError('Please login to view posts');
        return;
      }

      console.log("📡 Sending request to:", `${NGROK_URL}/api/posts/myposts`);

      const response = await axios.get(`${NGROK_URL}/api/posts/myposts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      console.log("✅ API Response:", JSON.stringify(response.data, null, 2)); // ✅ Check full response

      if (response.data && Array.isArray(response.data)) {
        const sortedPosts = response.data.filter(post => post.image_url).sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        );
        setMyPosts(sortedPosts);
        // console.log("📌 Sorted User Posts:", JSON.stringify(sortedPosts, null, 2));
      } else {
        console.log("⚠️ No posts found in response.");
      }
    } catch (error) {
      console.error('❌ Error fetching posts:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    }
  }, []);



  useEffect(() => {
    loadUsers();
    fetchMyPosts();  // Fetch the user's posts
  }, [currentPage]);

  const onRefresh = useCallback(() => {
    console.log("🔄 Refresh triggered...");
    setRefreshing(true);
    setCurrentPage(1);
    loadUsers(true);
    fetchMyPosts(); // ✅ Ensure user posts refresh too
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
      </View>

      {/* Post List */}
      <FlatList
        data={combinedData}
        extraData={combinedData} // Ensures re-render when data changes
        renderItem={({ item, index }) => {
          // console.log(`📸 Rendering Post #${index}:`, item); // ✅ Check each item being rendered
          return (
            <PostCard
              key={index} // Force key for better re-renders
              item={item}
              index={index}
              toggleExpand={toggleExpand}
              expandedItems={expandedItems}
            />
          );
        }}
        keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
        onEndReached={() => setCurrentPage(prev => prev + 1)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContentContainer}
      />


      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Image source={require('../assets/home4.webp')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('CreatePost')}>
          <Image source={require('../assets/plus3.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
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
