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
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NGROK_URL } from "@env";
import { Video } from "expo-av";
import { supabase } from "../../../services/supabase";

const isDev = __DEV__;
const log = (...args) => isDev && console.log(...args);

const ProfileHeader = React.memo(
  ({ userData, navigation, isOwnProfile, onFollow }) => {
    const isBusinessProfile = userData?.account_type === "business";
    const [imageError, setImageError] = useState(false);

    const avatarStyle = useMemo(
      () => ({
        height: "100%",
        width: "100%",
        backgroundColor: "#f0f8ff",
        borderRadius: isBusinessProfile ? 20 : 48,
        overflow: "hidden",
      }),
      [isBusinessProfile]
    );

    const profilePictureSource = useMemo(() => {
      if (
        typeof userData?.profile_picture === "string" &&
        !userData.profile_picture.includes("undefined") &&
        !userData.profile_picture.includes("null")
      ) {
        return { uri: userData.profile_picture };
      }
      return require("../../../assets/profiledefault.jpg");
    }, [userData?.profile_picture]);

    log("ProfileHeader rendering:", {
      isOwnProfile,
      username: userData?.username,
      profilePicture: userData?.profile_picture,
    });

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
                source={
                  imageError
                    ? require("../../../assets/profiledefault.jpg")
                    : profilePictureSource
                }
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
            <Text style={styles.userName}>
              {userData?.username || "Unknown"}
            </Text>
            {userData?.verified && (
              <Text style={styles.checkCircleIcon}>✓</Text>
            )}
          </View>
          <Text
            style={[
              styles.about,
              { textAlign: "center", paddingHorizontal: 10 },
            ]}
          >
            {userData?.bio || "No bio available"}
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          {isOwnProfile ? (
            <TouchableOpacity
              style={styles.masterOutlineButton}
              onPress={() =>
                navigation.navigate("EditProfilePage", { userData })
              }
            >
              <Text style={styles.button}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.followButton,
                userData?.isFollowing && styles.followingButton,
              ]}
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
  },
  (prevProps, nextProps) => {
    return (
      prevProps.userData?.isFollowing === nextProps.userData?.isFollowing &&
      prevProps.userData?.followers === nextProps.userData?.followers &&
      prevProps.isOwnProfile === nextProps.isOwnProfile
    );
  }
);

const Profile = ({ route }) => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const { width: screenWidth } = Dimensions.get("window");
  const itemSize = useMemo(() => (screenWidth - 32 - 4) / 3, [screenWidth]);

  const fetchInitialData = useCallback(async () => {
    let mounted = true;
    try {
      setIsLoading(true);
      const userDataStr = await AsyncStorage.getItem("userData");
      let token = await AsyncStorage.getItem("token");
      log("AsyncStorage fetched:", { userDataStr, token });

      if (!token) {
        log("No token, attempting session refresh");
        const {
          data: { session },
          error,
        } = await supabase.auth.refreshSession();
        if (error || !session) {
          console.error("Session refresh failed:", error?.message);
          navigation.navigate("Login");
          return;
        }
        token = session.access_token;
        await AsyncStorage.setItem("token", token);
      }

      const parsedUser = userDataStr ? JSON.parse(userDataStr) : null;
      if (mounted) {
        log("Setting currentUser:", parsedUser);
        setCurrentUser(parsedUser);
      }

      const baseUrl = NGROK_URL.replace(/\/+$/, "");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      };

      const { username } = route.params || {};
      const isViewingOtherUser =
        username && parsedUser && username !== parsedUser.username;
      const userId = isViewingOtherUser ? undefined : parsedUser?.user_id;

      const profileUrl = isViewingOtherUser
        ? `${baseUrl}/api/profile/user/${username}`
        : `${baseUrl}/api/profile${userId ? `?user_id=${userId}` : ""}`;
      const postsUrl = isViewingOtherUser
        ? `${baseUrl}/api/profile/posts/user/${username}`
        : `${baseUrl}/api/posts/myposts${userId ? `?user_id=${userId}` : ""}`;

      log("Fetching profile from:", profileUrl);
      log("Fetching posts from:", postsUrl);

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        const [profileResponse, postsResponse] = await Promise.all([
          fetch(profileUrl, { method: "GET", headers }).catch((e) => ({
            ok: false,
            status: 500,
            text: () => Promise.resolve(e.message),
          })),
          fetch(postsUrl, { method: "GET", headers }).catch((e) => ({
            ok: false,
            status: 500,
            text: () => Promise.resolve(e.message),
          })),
        ]);

        log("Profile response:", {
          status: profileResponse.status,
          ok: profileResponse.ok,
        });
        log("Posts response:", {
          status: postsResponse.status,
          ok: postsResponse.ok,
        });

        if (profileResponse.ok && postsResponse.ok) {
          const [profileData, postsData] = await Promise.all([
            profileResponse.json(),
            postsResponse.json(),
          ]);
          const formattedUserData = { ...profileData };

          if (mounted) {
            log("Setting userData:", formattedUserData);
            setUserData(formattedUserData);
            if (!isViewingOtherUser && formattedUserData) {
              await AsyncStorage.setItem(
                "userData",
                JSON.stringify(formattedUserData)
              );
            }

            const mappedPosts = Array.isArray(postsData)
              ? postsData
                  .map((post) => ({
                    _id: post.post_id || post.id,
                    username: post.username,
                    profile_picture: post.profile_picture,
                    image_url: post.media_url,
                    content: post.content,
                    created_at: post.created_at,
                    likes: post.like_count || 0,
                    comments: post.comment_count || 0,
                    media_type: post.media_type || "image",
                  }))
                  .filter(
                    (post) =>
                      post.image_url && !post.image_url.includes("undefined")
                  )
                  .sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at)
                  )
              : [];

            log("Fetched posts:", mappedPosts.length, mappedPosts);
            setUserPosts(mappedPosts);
            setIsLoading(false);
            setRefreshing(false);
            break;
          }
        } else {
          const profileError = profileResponse.ok
            ? ""
            : await profileResponse.text();
          const postsError = postsResponse.ok ? "" : await postsResponse.text();
          console.error("Fetch error details:", { profileError, postsError });

          if (
            profileResponse.status === 500 ||
            postsResponse.status === 500 ||
            profileResponse.status === 0 ||
            postsResponse.status === 0
          ) {
            retryCount++;
            log(
              `Retry ${retryCount}/${maxRetries} due to error: Profile ${profileResponse.status}, Posts ${postsResponse.status}`
            );
            if (retryCount === maxRetries) {
              throw new Error(
                `Fetch failed after retries: Profile ${
                  profileResponse.status
                } - ${profileError || "Network error"}, Posts ${
                  postsResponse.status
                } - ${postsError || "Network error"}`
              );
            }
            const {
              data: { session },
              error,
            } = await supabase.auth.refreshSession();
            if (error || !session)
              throw new Error("Session refresh failed during retry");
            token = session.access_token;
            await AsyncStorage.setItem("token", token);
            headers["Authorization"] = `Bearer ${token}`;
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * Math.pow(2, retryCount))
            );
          } else if (postsResponse.status === 404) {
            log("Posts endpoint returned 404, setting empty posts");
            if (mounted) {
              setUserPosts([]);
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                setUserData({ ...profileData });
                if (!isViewingOtherUser && profileData) {
                  await AsyncStorage.setItem(
                    "userData",
                    JSON.stringify(profileData)
                  );
                }
              }
              setIsLoading(false);
              setRefreshing(false);
            }
            break;
          } else {
            throw new Error(
              `Fetch failed: Profile ${profileResponse.status} - ${
                profileError || "Unknown error"
              }, Posts ${postsResponse.status} - ${
                postsError || "Unknown error"
              }`
            );
          }
        }
      }
    } catch (error) {
      console.error("Fetch error:", error.message);
      if (mounted) {
        setUserPosts([]);
        Alert.alert(
          "Error",
          `Failed to fetch data: ${error.message}. Please check your network and try again.`
        );
        setIsLoading(false);
        setRefreshing(false);
      }
    }
    return () => {
      mounted = false;
    };
  }, [navigation, route.params]);

  useEffect(() => {
    log("Profile component mounted, fetching data...");
    fetchInitialData();
  }, [fetchInitialData]);

  const isOwnProfile = useMemo(() => {
    if (!currentUser || !userData) {
      log("isOwnProfile: Waiting for data", { currentUser, userData });
      return false;
    }
    const { username } = route.params || {};
    const result =
      !username ||
      username === currentUser.username ||
      userData.username === currentUser.username;
    log("isOwnProfile calculated:", {
      routeUsername: username,
      currentUser: currentUser?.username,
      userData: userData?.username,
      result,
    });
    return result;
  }, [currentUser, userData, route.params]);

  useEffect(() => {
    if (currentUser && userData && !isLoading) {
      log("Data loaded, forcing re-render:", {
        currentUser: currentUser.username,
        userData: userData.username,
      });
      setIsLoading(false);
    }
  }, [currentUser, userData, isLoading]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInitialData();
  }, [fetchInitialData]);

  const renderGridItem = useCallback(
    ({ item, index }) => {
      const [mediaError, setMediaError] = useState(false);
      const [isMediaLoading, setIsMediaLoading] = useState(true);

      const mediaSource = useMemo(() => {
        if (
          typeof item.image_url === "string" &&
          !item.image_url.includes("undefined") &&
          !item.image_url.includes("null")
        ) {
          return { uri: item.image_url };
        }
        return require("../../../assets/profiledefault.jpg");
      }, [item.image_url]);

      log(`renderGridItem: Rendering post ${item._id}:`, {
        image_url: item.image_url,
        media_type: item.media_type,
      });

      return (
        <TouchableOpacity
          style={[styles.gridItem, { width: itemSize, height: itemSize }]}
          onPress={() => {
            const stablePosts = [...userPosts];
            navigation.navigate("PostView", {
              posts: stablePosts,
              initialIndex: index,
            });
          }}
        >
          {isMediaLoading && !mediaError && (
            <View style={styles.gridItem}>
              <ActivityIndicator size="small" color="#007BFF" />
            </View>
          )}
          {mediaError ? (
            <View style={styles.gridItem}>
              <Text style={styles.errorText}>Failed to load</Text>
            </View>
          ) : item.media_type === "video" ? (
            <View style={styles.videoContainer}>
              <Video
                source={mediaSource}
                style={styles.gridImage}
                resizeMode="cover"
                shouldPlay={false}
                isMuted={true}
                useNativeControls={false}
                onLoad={() => setIsMediaLoading(false)}
                onError={(error) => {
                  console.error(
                    `renderGridItem: Video loading error for post ${item._id}:`,
                    error
                  );
                  setIsMediaLoading(false);
                  setMediaError(true);
                }}
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
              source={mediaSource}
              style={styles.gridImage}
              resizeMode="cover"
              onLoad={() => setIsMediaLoading(false)}
              onError={(e) => {
                console.error(
                  `renderGridItem: Image loading error for post ${item._id}:`,
                  e.nativeEvent.error
                );
                setIsMediaLoading(false);
                setMediaError(true);
              }}
            />
          )}
        </TouchableOpacity>
      );
    },
    [itemSize, navigation, userPosts]
  );

  if (isLoading || !currentUser || !userData) {
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
              onPress={() =>
                navigation.reset({ index: 0, routes: [{ name: "Main" }] })
              }
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
                const baseUrl = NGROK_URL.replace(/\/+$/, "");
                const method = userData?.isFollowing ? "DELETE" : "POST";
                try {
                  log("Following:", userData.username, "Method:", method);
                  const response = await fetch(
                    `${baseUrl}/api/profile/follow/${userData.username}`,
                    {
                      method,
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  const result = await response.json();
                  log("Response:", result);
                  if (response.ok) {
                    setUserData((prev) => ({
                      ...prev,
                      isFollowing: result.isFollowing,
                      followers: result.followers,
                    }));
                  } else {
                    Alert.alert(
                      "Error",
                      result.error || "Something went wrong"
                    );
                  }
                } catch (error) {
                  console.error("Follow error:", error);
                  Alert.alert(
                    "Error",
                    `Failed to ${
                      userData?.isFollowing ? "unfollow" : "follow"
                    }: ${error.message}`
                  );
                }
              }}
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        initialNumToRender={9}
        maxToRenderPerBatch={12}
        windowSize={5}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  flatListContent: { paddingHorizontal: 16, paddingBottom: 20 },
  profile: {
    width: "100%",
    backgroundColor: "#fff",
    alignItems: "center",
    padding: 14,
    gap: 14,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 25,
  },
  avatarMultiVariants: { width: 96, height: 96, marginHorizontal: 20 },
  profileImage: { width: "100%", height: "100%", borderRadius: 48 },
  statsContainer: { alignItems: "center", justifyContent: "center" },
  statsNumber: { fontSize: 18, fontWeight: "700", color: "#000" },
  statsLabel: { fontSize: 14, color: "#666" },
  text: { width: "100%", gap: 4, alignItems: "center" },
  userName: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: "#000" },
  id: { flexDirection: "row", alignItems: "center", gap: 4 },
  about: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: "#000" },
  checkCircleIcon: { marginLeft: 5, color: "green" },
  buttonContainer: { width: "100%", alignItems: "center" },
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
  followingButton: { backgroundColor: "#ccc" },
  button: { fontSize: 12, lineHeight: 18, color: "#666", fontWeight: "600" },
  followButtonText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#fff",
    fontWeight: "600",
  },
  backButton: { position: "absolute", left: 5, top: 5, zIndex: 1 },
  backButtonText: { fontSize: 32, color: "#000", marginRight: 9 },
  postsHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    paddingTop: 20,
    paddingBottom: 10,
  },
  noPostsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingBottom: 10,
  },
  gridItem: {
    backgroundColor: "#f0f0f0",
    margin: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gridImage: { width: "100%", height: "100%", borderRadius: 4 },
  videoContainer: { position: "relative", width: "100%", height: "100%" },
  playIconContainer: {
    position: "absolute",
    top: 5,
    right: 5,
    borderRadius: 12,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: {
    width: 20,
    height: 20,
    tintColor: "black",
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 12,
    textAlign: "center",
    padding: 5,
  },
});

export default Profile;
