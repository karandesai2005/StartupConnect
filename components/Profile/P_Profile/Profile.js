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
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NGROK_URL } from '@env';
import { Video } from 'expo-av';

const ProfileHeader = React.memo(({ userData, lastUpdate, navigation, isOwnProfile, onFollow }) => {
  const isBusinessProfile = userData?.account_type === "business";
  const [imageError, setImageError] = useState(false);
  
  const avatarStyle = useMemo(() => ({
    height: "100%",
    width: "100%",
    backgroundColor: "#f0f8ff",
    borderRadius: isBusinessProfile ? 20 : 48,
    overflow: "hidden",
  }), [isBusinessProfile]);

  const profilePictureUrl = useMemo(() => {
    if (!userData?.profile_picture) return null;
    return userData.profile_picture.startsWith('https')
      ? `${userData.profile_picture}?cache_bust=${lastUpdate}`
      : `${NGROK_URL}/uploads/${userData.profile_picture}?cache_bust=${lastUpdate}`;
  }, [userData?.profile_picture, lastUpdate]);

  return (
    <View style={styles.profile}>
      <View style={styles.profileSection}>
        <View style={styles.statsContainer}>
          <Text style={styles.statsNumber}>{userData?.followers || "0"}</Text>
          <Text style={styles.statsLabel}>Followers</Text>
        </View>
        <View style={styles.avatarMultiVariants}>
          <View style={avatarStyle}>
            <Image
              source={imageError || !profilePictureUrl ? require('../../../assets/profiledefault.jpg') : { uri: profilePictureUrl }}
              style={styles.profileImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          </View>
        </View>
        <View style={styles.statsContainer}>
          <Text style={styles.statsNumber}>{userData?.following || "0"}</Text>
          <Text style={styles.statsLabel}>Following</Text>
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
  const [userPosts, setUserPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const { width: screenWidth } = Dimensions.get('window');
  const itemSize = useMemo(() => (screenWidth - 32 - 4) / 3, [screenWidth]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem('userData')
      .then(userDataStr => {
        if (mounted && userDataStr) setCurrentUser(JSON.parse(userDataStr));
      })
      .catch(error => console.error('Error getting current user:', error));
    return () => { mounted = false; };
  }, []);

  const isOwnProfile = useMemo(() => 
    !route.params?.username || 
    (currentUser && route.params?.username === currentUser.username),
    [route.params?.username, currentUser]
  );

  const fetchUserDataAndPosts = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.navigate('Login');
        return;
      }
      const username = route.params?.username;
      const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Cache-Control": "no-cache" };
      const [profileResponse, postsResponse] = await Promise.all([
        fetch(username && !isOwnProfile ? `${NGROK_URL}/api/profile/user/${username}` : `${NGROK_URL}/api/profile`, { method: "GET", headers }),
        fetch(username && !isOwnProfile ? `${NGROK_URL}/api/posts/user/${username}` : `${NGROK_URL}/api/posts/myposts`, { method: "GET", headers })
      ]);

      if (!profileResponse.ok || !postsResponse.ok) throw new Error('Network response was not ok');
      const [profileData, postsData] = await Promise.all([profileResponse.json(), postsResponse.json()]);
      const formattedUserData = {
        ...profileData,
        profile_picture: profileData.profile_picture?.startsWith('https') 
          ? profileData.profile_picture 
          : profileData.profile_picture ? `${NGROK_URL}/uploads/${profileData.profile_picture}` : null,
      };
      setUserData(formattedUserData);
      if (isOwnProfile) await AsyncStorage.setItem('userData', JSON.stringify(formattedUserData));

      const mappedPosts = Array.isArray(postsData) ? postsData.map(post => ({
        _id: post.post_id || post.id,
        username: post.username,
        profile_picture: post.profile_picture?.startsWith('https') ? post.profile_picture : post.profile_picture ? `${NGROK_URL}/uploads/${post.profile_picture}` : null,
        image_url: post.media_url?.startsWith('https') ? post.media_url : post.media_url ? `${NGROK_URL}/uploads/${post.media_url}` : null,
        content: post.content,
        created_at: post.created_at,
        likes: post.like_count || 0,
        comments: post.comment_count || 0,
        media_type: post.media_type || (post.media_url?.includes('.mp4') ? 'video' : 'image')
      })).filter(post => post.image_url && !post.image_url.includes('undefined'))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [];
      setUserPosts(mappedPosts);
    } catch (error) {
      console.error("Fetch error:", error);
      setUserPosts([]);
      Alert.alert('Error', `Failed to fetch data: ${error.message}`);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [navigation, route.params?.username, isOwnProfile]);

  useFocusEffect(useCallback(() => {
    if (!userData || !userPosts.length) {
      setIsLoading(true);
      fetchUserDataAndPosts();
    }
  }, [fetchUserDataAndPosts, userData, userPosts]));

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserDataAndPosts();
  }, [fetchUserDataAndPosts]);

  const renderGridItem = useCallback(({ item, index }) => (
    <TouchableOpacity
      style={[styles.gridItem, { width: itemSize, height: itemSize }]}
      onPress={() => navigation.navigate('PostView', { posts: userPosts, initialIndex: index })}
    >
      {item.media_type === 'video' || item.image_url?.includes('.mp4') ? (
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
          source={item.image_url ? { uri: item.image_url } : require('../../../assets/profiledefault.jpg')}
          style={styles.gridImage}
          resizeMode="cover"
        />
      )}
    </TouchableOpacity>
  ), [itemSize, navigation, userPosts]);

  if (isLoading) return <SafeAreaView style={styles.safeArea}><ActivityIndicator size="large" color="#007BFF" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <FlatList
        ListHeaderComponent={
          <>
            <TouchableOpacity onPress={() => navigation.goBack('Home')} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <ProfileHeader
              userData={userData}
              lastUpdate={Date.now()}
              navigation={navigation}
              isOwnProfile={isOwnProfile}
              onFollow={async () => {
                const token = await AsyncStorage.getItem("token");
                if (!token) return navigation.navigate("Login");
                const method = userData?.isFollowing ? "DELETE" : "POST";
                try {
                  const response = await fetch(`${NGROK_URL}/api/profile/follow`, {
                    method,
                    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ username: userData.username }),
                  });
                  if (response.ok) setUserData(prev => ({ ...prev, isFollowing: !prev.isFollowing, followers: (prev.followers || 0) + (prev.isFollowing ? -1 : 1) }));
                } catch (error) {
                  Alert.alert('Error', `Failed to ${userData?.isFollowing ? 'unfollow' : 'follow'}: ${error.message}`);
                }
              }}
            />
            <Text style={styles.postsHeading}>Posts ({userPosts.length})</Text>
            {userPosts.length === 0 && <Text style={styles.noPostsText}>No posts available</Text>}
          </>
        }
        data={userPosts}
        renderItem={renderGridItem}
        keyExtractor={(item) => item._id}
        numColumns={3}
        contentContainerStyle={styles.flatListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        initialNumToRender={9}
        maxToRenderPerBatch={12}
        windowSize={5}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  flatListContent: { paddingHorizontal: 16, paddingBottom: 20 },
  profile: { width: "100%", backgroundColor: "#fff", alignItems: "center", padding: 14, gap: 14 },
  profileSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, marginTop: 25 },
  avatarMultiVariants: { width: 96, height: 96, marginHorizontal: 20 },
  profileImage: { width: "100%", height: "100%", borderRadius: 48 },
  statsContainer: { alignItems: 'center', justifyContent: 'center' },
  statsNumber: { fontSize: 18, fontWeight: '700', color: '#000' },
  statsLabel: { fontSize: 14, color: '#666' },
  text: { width: "100%", gap: 4, alignItems: "center" },
  userName: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: "#000" },
  id: { flexDirection: "row", alignItems: "center", gap: 4 },
  about: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: "#000" },
  checkCircleIcon: { marginLeft: 5, color: "green" },
  buttonContainer: { width: "100%", alignItems: "center" },
  masterOutlineButton: { borderRadius: 14, borderColor: "#ccc", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#f9f9f9" },
  followButton: { borderRadius: 14, backgroundColor: "#007BFF", paddingHorizontal: 20, paddingVertical: 8 },
  followingButton: { backgroundColor: "#ccc" },
  button: { fontSize: 12, lineHeight: 18, color: "#666", fontWeight: "600" },
  followButtonText: { fontSize: 14, lineHeight: 20, color: "#fff", fontWeight: "600" },
  backButton: { position: "absolute", left: 5, top: 5, zIndex: 1 },
  backButtonText: { fontSize: 32, color: "#000", marginRight: 9 },
  postsHeading: { fontSize: 18, fontWeight: '700', color: '#000', textAlign: 'center', paddingTop: 20, paddingBottom: 10 },
  noPostsText: { fontSize: 16, color: '#666', textAlign: 'center', paddingBottom: 10 },
  gridItem: { backgroundColor: '#f0f0f0', margin: 1 },
  gridImage: { width: '100%', height: '100%', borderRadius: 4 },
  videoContainer: { position: 'relative', width: '100%', height: '100%' },
  playIconContainer: { position: 'absolute', top: 5, right: 5, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, width: 24, height: 24 },
  playIcon: { color: 'white', fontSize: 16 },
});

export default Profile;