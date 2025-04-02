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

const ProfileHeader = React.memo(({ userData, navigation, isOwnProfile, onFollow }) => {
 const isBusinessProfile = userData?.account_type === "business";
 const [imageError, setImageError] = useState(false);

 const avatarStyle = useMemo(() => ({
 height: "100%",
 width: "100%",
 backgroundColor: "#f0f8ff",
 borderRadius: isBusinessProfile ? 20 : 48,
 overflow: "hidden",
 }), [isBusinessProfile]);

 // Stable profile picture URL without lastUpdate dependency
 const profilePictureUrl = useMemo(() => {
  const url = userData?.profile_picture || null;
  console.log('Profile Picture URL:', url);
  return url;
}, [userData?.profile_picture]);

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
 const [profileType, setProfileType] = useState(null); // Add this to track whose profile we're viewing
 const { width: screenWidth } = Dimensions.get('window');
 const itemSize = useMemo(() => (screenWidth - 32 - 4) / 3, [screenWidth]);

 // Load current user data first, before any profile fetching
 useEffect(() => {
 let mounted = true;
 const loadCurrentUser = async () => {
 try {
 const userDataStr = await AsyncStorage.getItem('userData');
 if (mounted && userDataStr) {
 const parsedUser = JSON.parse(userDataStr);
 setCurrentUser(parsedUser);

 // Determine profile type based on route params
 const { username } = route.params || {};
 if (username && username !== parsedUser.username) {
 setProfileType('other');
 } else {
 setProfileType('own');
 }
 }
 } catch (error) {
 console.error('Error getting current user:', error);
 }
 };

 loadCurrentUser();
 return () => { mounted = false; };
 }, [route.params]);

 const isOwnProfile = useMemo(() => {
 return profileType === 'own';
 }, [profileType]);

 const fetchUserDataAndPosts = useCallback(async () => {
 // Don't proceed until we know which profile type we're showing
 if (!profileType || !currentUser) return;

 let mounted = true;
 try {
 const token = await AsyncStorage.getItem("token");
 if (!token) {
 navigation.navigate('Login');
 return;
 }

 const headers = {
 "Authorization": `Bearer ${token}`,
 "Content-Type": "application/json",
 "Cache-Control": "no-cache"
 };

 const { username } = route.params || {};
 const isViewingOtherUser = profileType === 'other';

 const profileUrl = isViewingOtherUser
 ? `${NGROK_URL}/api/profile/user/${username}`
 : `${NGROK_URL}/api/profile`;
 const postsUrl = isViewingOtherUser
 ? `${NGROK_URL}/api/posts/user/${username}`
 : `${NGROK_URL}/api/posts/myposts`;

 const [profileResponse, postsResponse] = await Promise.all([
 fetch(profileUrl, { method: "GET", headers }),
 fetch(postsUrl, { method: "GET", headers })
 ]);

 if (!profileResponse.ok || !postsResponse.ok) throw new Error('Network response was not ok');
 const [profileData, postsData] = await Promise.all([profileResponse.json(), postsResponse.json()]);
 const formattedUserData = {
  ...profileData,
  profile_picture: profileData.profile_picture || null, // Just use it as-is
};

 if (mounted) {
 setUserData(formattedUserData);

 // Update local storage only if viewing own profile
 if (!isViewingOtherUser) {
 await AsyncStorage.setItem('userData', JSON.stringify(formattedUserData));
 }

 const mappedPosts = Array.isArray(postsData) ? postsData.map(post => ({
 _id: post.post_id || post.id,
 username: post.username,
 profile_picture: post.profile_picture?.startsWith('https') ? post.profile_picture : post.profile_picture ? `${NGROK_URL}/uploads/${post.profile_picture}` : null,
 image_url: post.media_url?.startsWith('https') ? post.media_url : post.media_url ? `${NGROK_URL}/uploads/${post.media_url}` : null,
 content: post.content,
 created_at: post.created_at,
 likes: post.like_count || 0,
 comments: post.comment_count || 0,
 "mediaHospitality": post.media_type || (post.media_url?.includes('.mp4') ? 'video' : 'image')
 })).filter(post => post.image_url && !post.image_url.includes('undefined'))
 .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [];

 setUserPosts(mappedPosts);
 setIsLoading(false);
 setRefreshing(false);
 }
 } catch (error) {
 console.error("Fetch error:", error);
 if (mounted) {
 setUserPosts([]);
 Alert.alert('Error', `Failed to fetch data: ${error.message}`);
 setIsLoading(false);
 setRefreshing(false);
 }
 }
 return () => { mounted = false; };
 }, [navigation, route.params, currentUser, profileType]);

 // Only fetch data once we know which profile type we're viewing
 useEffect(() => {
 if (profileType) {
 setIsLoading(true);
 setUserData(null);
 fetchUserDataAndPosts();
 }
 }, [profileType, fetchUserDataAndPosts]);

 // Remove the useFocusEffect to prevent refetching on focus (which causes flicker)
 // Instead, handle refreshes explicitly
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
 <Image
 source={require("../../../assets/play-button.png")}
 style={styles.playIcon}
 />
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
 if (isLoading || !userData) {
 return (
 <SafeAreaView style={styles.safeArea}>
 <ActivityIndicator size="large" color="#007BFF" />
 </SafeAreaView>
 );
 }

 return (
 <SafeAreaView style={styles.safeArea}>
 <StatusBar barStyle="dark-content" backgroundColor="#fff" />
 <FlatList
 ListHeaderComponent={
 <>
 <TouchableOpacity
 onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
 style={styles.backButton}
 >
 <Text style={styles.backButtonText}>←</Text>
 </TouchableOpacity>
 <ProfileHeader
 userData={userData}
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
 playIconContainer: {
 position: 'absolute',
 top: 5,
 right: 5,
 // backgroundColo`r: 'rgb(0, 0, 0)',
 borderRadius: 12,
 width: 30,
 height: 30,
 justifyContent: 'center',
 alignItems: 'center',
 },
 playIcon: {
 width: 20,
 height: 20,
 tintColor: 'black',

 },
});

export default Profile;