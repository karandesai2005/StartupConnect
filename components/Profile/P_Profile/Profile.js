import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  Dimensions,
} from "react-native";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NGROK_URL } from '@env';
import { Video } from 'expo-av';

const ProfileHeader = React.memo(({ userData, lastUpdate, navigation, isOwnProfile, onFollow }) => {
  const isBusinessProfile = userData?.account_type === "business";

  const avatarStyle = useMemo(() => ({
    height: "100%",
    width: "100%",
    backgroundColor: "#f0f8ff",
    borderRadius: isBusinessProfile ? 20 : 48,
    overflow: "hidden",
  }), [isBusinessProfile]);

  return (
    <View style={styles.profile}>
      <View style={styles.profileSection}>
        <View style={styles.statsContainer}>
          <View style={styles.statsItem}>
            <Text style={styles.statsNumber}>{userData?.followers || "0"}</Text>
            <Text style={styles.statsLabel}>Followers</Text>
          </View>
        </View>

        <View style={styles.avatarMultiVariants}>
          <View style={avatarStyle}>
            <Image
              source={
                userData?.profile_picture
                  ? { uri: `${userData.profile_picture}?timestamp=${lastUpdate}` }
                  : require('../../../assets/del.png')
              }
              style={styles.profileImage}
              resizeMode="cover"
            />
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statsItem}>
            <Text style={styles.statsNumber}>{userData?.following || "0"}</Text>
            <Text style={styles.statsLabel}>Following</Text>
          </View>
        </View>
      </View>

      <View style={styles.text}>
        <View style={styles.id}>
          <Text style={styles.userName}>{userData?.username || "Unknown"}</Text>
          {userData?.verified && <Text style={styles.checkCircleIcon}>✓</Text>}
        </View>
        <Text style={[styles.about, { textAlign: 'center', paddingHorizontal: 10 }]}>
          {userData?.bio || "No bio available"}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {isOwnProfile ? (
          <TouchableOpacity
            style={styles.masterOutlineButton}
            onPress={() => navigation.navigate('EditProfilePage', { userData })}
          >
            <Text style={styles.button}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.followButton, userData?.isFollowing && styles.followingButton]}
            onPress={onFollow}
          >
            <Text style={styles.followButtonText}>
              {userData?.isFollowing ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const Profile = ({ route }) => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [userPosts, setUserPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const screenWidth = Dimensions.get('window').width;
  const spacing = 2;
  const itemSize = useMemo(() => (screenWidth - 32 - spacing * 2) / 3, [screenWidth]);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          setCurrentUser(JSON.parse(userDataStr));
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };
    getCurrentUser();
  }, []);

  const isOwnProfile = !route.params?.username ||
    (currentUser && route.params?.username === currentUser.username);

  const fetchUserPosts = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const username = route.params?.username;
      const endpoint = username && !isOwnProfile
        ? `${NGROK_URL}/api/posts/user/${username}`  // Corrected endpoint
        : `${NGROK_URL}/api/posts/myposts`;

      console.log('Fetching posts from:', endpoint);

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for endpoint: ${endpoint}`);
      }

      const data = await response.json();
      console.log('Raw posts data:', data);

      if (!Array.isArray(data)) {
        console.log('Posts data is not an array:', data);
        setUserPosts([]);
        return;
      }

      const mappedPosts = data.map(post => {
        console.log('Processing post:', post);
        return {
          _id: post.post_id || post.id,
          username: post.username,
          profile_picture: post.profile_picture,
          image_url: post.media_url,
          content: post.content,
          created_at: post.created_at,
          likes: post.like_count || 0,
          comments: post.comment_count || 0,
          caption: post.content,
          media_type: post.media_type || (post.media_url?.includes('.mp4') ? 'video' : 'image')
        };
      });

      const validPosts = mappedPosts
        .filter(post => {
          const isValid = post.image_url && !post.image_url.includes('undefined');
          if (!isValid) console.log('Invalid post filtered out:', post);
          return isValid;
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      console.log('Final mapped posts:', validPosts);
      setUserPosts(validPosts);
    } catch (error) {
      console.error("Posts fetch error:", error);
      setUserPosts([]);
      Alert.alert('Error', `Failed to fetch posts: ${error.message}`);
    }
  }, [navigation, route.params?.username, isOwnProfile]);

  const fetchUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const username = route.params?.username;
      const endpoint = username && !isOwnProfile
        ? `${NGROK_URL}/api/profile/user/${username}`  // Matches your profile route
        : `${NGROK_URL}/api/profile`;

      console.log('Fetching user data from:', endpoint);

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('User data:', data);

      setUserData(data);
      setLastUpdate(Date.now());
      if (isOwnProfile) {
        await AsyncStorage.setItem('userData', JSON.stringify(data));
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      Alert.alert('Error', `Failed to fetch profile data: ${error.message}`);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [navigation, route.params?.username, isOwnProfile]);

  const handleFollow = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.navigate("Login");
        return;
      }

      const isCurrentlyFollowing = userData?.isFollowing;
      const method = isCurrentlyFollowing ? "DELETE" : "POST";
      const endpoint = `${NGROK_URL}/api/profile/follow`;

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: userData.username }),
      });

      if (response.ok) {
        setUserData(prev => ({
          ...prev,
          isFollowing: !isCurrentlyFollowing,
          followers: (prev.followers || 0) + (isCurrentlyFollowing ? -1 : 1)
        }));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isCurrentlyFollowing ? 'unfollow' : 'follow'} user`);
      }
    } catch (error) {
      console.error(`${isCurrentlyFollowing ? 'Unfollow' : 'Follow'} error:`, error);
      Alert.alert('Error', `Failed to ${isCurrentlyFollowing ? 'unfollow' : 'follow'} user: ${error.message}`);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchUserData(), fetchUserPosts()]);
    setRefreshing(false);
  }, [fetchUserData, fetchUserPosts]);

  const renderGridItem = useCallback(({ item, index }) => {
    const isVideo = item.media_type === 'video' || item.image_url?.includes('.mp4');

    return (
      <TouchableOpacity
        style={[styles.gridItem, { width: itemSize, height: itemSize, marginBottom: 2 }]}
        onPress={() => navigation.navigate('PostView', { posts: userPosts, initialIndex: index })}
      >
        {isVideo ? (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: item.image_url }}
              style={styles.gridImage}
              resizeMode="cover"
              shouldPlay={false}
              isMuted={true}
              useNativeControls={false}
            />
            <View style={styles.playIconContainer}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        ) : (
          <Image
            source={
              item?.image_url
                ? { uri: item.image_url }
                : item?.media_url
                  ? { uri: item.media_url }
                  : require('../../../assets/del.png')
            }
            style={styles.gridImage}
            resizeMode="cover"
            onError={(e) => console.log('Image load error:', e.nativeEvent.error, item.image_url)}
          />
        )}
      </TouchableOpacity>
    );
  }, [itemSize, navigation, userPosts]);

  useEffect(() => {
    if (route.params?.updatedUser && isOwnProfile) {
      setUserData(prevData => ({
        ...prevData,
        ...route.params.updatedUser,
        profile_picture: route.params.updatedUser.profile_picture,
        bio: route.params.updatedUser.bio
      }));
      setLastUpdate(Date.now());
      if (route.params.forceRefresh) {
        fetchUserData();
      }
    }
  }, [route.params?.updatedUser, fetchUserData, isOwnProfile]);

  useFocusEffect(
    useCallback(() => {
      console.log('Profile focused, username:', route.params?.username);
      setIsLoading(true);
      fetchUserData();
      fetchUserPosts();
    }, [fetchUserData, fetchUserPosts, route.params?.username])
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={styles.contentContainer}>
      <FlatList
        ListHeaderComponent={
          <>
            <TouchableOpacity onPress={() => navigation.goBack('Home')} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <ProfileHeader
              userData={userData}
              lastUpdate={lastUpdate}
              navigation={navigation}
              isOwnProfile={isOwnProfile}
              onFollow={handleFollow}
            />
            <Text style={styles.postsHeading}>Posts ({userPosts.length})</Text>
            {userPosts.length === 0 && (
              <Text style={styles.noPostsText}>No posts available</Text>
            )}
          </>
        }
        data={userPosts}
        renderItem={renderGridItem}
        keyExtractor={(item) => item._id}
        numColumns={3}
        contentContainerStyle={styles.flatListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#000000"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    marginTop: 20,
  },
  profile: {
    width: "100%",
    backgroundColor: "#fff",
    alignItems: "center",
    padding: 14,
    gap: 14,
    marginTop: 30,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  avatarMultiVariants: {
    width: 96,
    height: 96,
    marginHorizontal: 20,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 48,
  },
  statsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsItem: {
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  statsLabel: {
    fontSize: 14,
    color: '#666',
  },
  text: {
    width: "100%",
    gap: 4,
    alignItems: "center",
  },
  userName: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: "#000",
  },
  id: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  about: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#000",
  },
  checkCircleIcon: {
    marginLeft: 5,
    color: "green",
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  masterOutlineButton: {
    borderRadius: 14,
    borderColor: "#ccc",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f9f9f9",
  },
  followButton: {
    borderRadius: 14,
    backgroundColor: "#007BFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  followingButton: {
    backgroundColor: "#ccc",
  },
  button: {
    fontSize: 12,
    lineHeight: 18,
    color: "#666",
    fontWeight: "600",
  },
  followButtonText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#fff",
    fontWeight: "600",
  },
  backButton: {
    position: "absolute",
    left: 28,
    top: 20,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 32,
    color: "#000",
  },
  postsHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  noPostsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingBottom: 10,
  },
  gridItem: {
    backgroundColor: '#f0f0f0',
    margin: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  playIconContainer: {
    position: 'absolute',
    top: 5,           // Move to top
    right: 5,         // Move to right
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // Slightly darker for visibility
    borderRadius: 12, // Optional: make it circular
    width: 24,        // Fixed size for the button
    height: 24,
  },
  playIcon: {
    color: 'white',
    fontSize: 16,     // Slightly smaller for the smaller container
  },
});

export default Profile;