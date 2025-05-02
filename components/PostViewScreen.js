import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import PropTypes from "prop-types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PostItem from "./PostItem";
import { NGROK_URL } from "@env";

const { width } = Dimensions.get("window");
const FIXED_MEDIA_HEIGHT = (width * 5) / 4;
const FIXED_CONTENT_HEIGHT = 150;

const isDev = __DEV__;
const log = (...args) => isDev && console.log(...args);

const PostViewScreen = ({ route }) => {
  const { posts: initialPosts = [], initialIndex = 0 } = route?.params || {};
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const hasScrolledToInitialRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [expandedItems, setExpandedItems] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [currentUsername, setCurrentUsername] = useState("");

  useEffect(() => {
    const initializePosts = () => {
      const baseUrl = NGROK_URL.replace(/\/+$/, "");
      const validPosts = initialPosts
        .filter((post) => {
          const hasId = post && (post.post_id || post._id || post.id);
          if (!hasId) {
            console.warn("Post missing ID:", post);
          }
          return hasId;
        })
        .map((post) => {
          // Rename image_url to media_url and ensure it's a full URL
          let mediaUrl = post.image_url;
          if (mediaUrl && !mediaUrl.startsWith("http")) {
            mediaUrl = `${baseUrl}${mediaUrl.startsWith("/") ? "" : "/"}${mediaUrl}`;
          }
          return {
            ...post,
            media_url: mediaUrl,
            isLiked: false,
            likeCount: post.likes || 0,
            comments: post.comments || [],
            media_type: post.media_type || "image",
          };
        });
      log("Initialized posts:", validPosts.length, validPosts);
      setPosts(validPosts);
      setIsLoading(false);
    };
    initializePosts();
  }, [initialPosts]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          navigation.replace("Login");
          return;
        }
        let retryCount = 0;
        const maxRetries = 3;
        while (retryCount < maxRetries) {
          try {
            const userDataStr = await AsyncStorage.getItem("userData");
            if (userDataStr) {
              const userData = JSON.parse(userDataStr);
              setCurrentUsername(userData.username);
            }
            break;
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              console.error("Auth check failed after retries:", error);
              navigation.replace("Login");
              return;
            }
            log(
              `Retry ${retryCount}/${maxRetries} for fetching user data:`,
              error.message
            );
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * Math.pow(2, retryCount))
            );
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        navigation.replace("Login");
      }
    };
    checkAuthStatus();
  }, [navigation]);

  const preloadMedia = useCallback(() => {
    const preloadRange = 2;
    const start = Math.max(0, currentIndex - preloadRange);
    const end = Math.min(posts.length, currentIndex + preloadRange + 1);
    posts.slice(start, end).forEach((post) => {
      if (post.media_type === "video") return;
      const mediaUrl = post.media_url;
      if (
        mediaUrl &&
        typeof mediaUrl === "string" &&
        mediaUrl.startsWith("http")
      ) {
        Image.prefetch(mediaUrl).catch((e) =>
          console.error("Prefetch error:", e)
        );
      }
    });
  }, [currentIndex, posts]);

  useEffect(() => {
    if (
      posts.length > 0 &&
      initialIndex >= 0 &&
      !hasScrolledToInitialRef.current
    ) {
      flatListRef.current?.scrollToIndex({
        index: initialIndex,
        animated: false,
      });
      hasScrolledToInitialRef.current = true;
    }
    preloadMedia();
  }, [posts, initialIndex, preloadMedia]);

  const toggleExpand = useCallback((index) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const handleDelete = useCallback(
    (postId) => {
      setPosts((prevPosts) =>
        prevPosts.filter(
          (post) => (post.post_id || post._id || post.id) !== postId
        )
      );
      setCurrentIndex((prevIndex) => {
        if (prevIndex >= posts.length - 1) return Math.max(0, prevIndex - 1);
        return prevIndex;
      });
    },
    [posts.length]
  );

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index);
  }, []);

  const getItemLayout = useCallback(
    (data, index) => ({
      length: FIXED_MEDIA_HEIGHT + FIXED_CONTENT_HEIGHT,
      offset: (FIXED_MEDIA_HEIGHT + FIXED_CONTENT_HEIGHT) * index,
      index,
    }),
    []
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerText}>
        {posts.length > 0
          ? `${Math.min(currentIndex + 1, posts.length)} of ${posts.length}`
          : "No posts"}
      </Text>
      <View style={styles.backButton} />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#007AFF"
          style={styles.loading}
        />
      </SafeAreaView>
    );
  }

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
              onDelete={handleDelete}
            />
          )}
          keyExtractor={(item, index) =>
            (
              item.post_id ||
              item._id ||
              item.id ||
              `fallback-${index}`
            ).toString()
          }
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          getItemLayout={getItemLayout}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={true}
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            const refreshedPosts = initialPosts
              .filter((post) => post && (post.post_id || post._id || post.id))
              .map((post) => {
                let mediaUrl = post.image_url;
                if (mediaUrl && !mediaUrl.startsWith("http")) {
                  mediaUrl = `${NGROK_URL.replace(/\/+$/, "")}${mediaUrl.startsWith("/") ? "" : "/"}${mediaUrl}`;
                }
                return {
                  ...post,
                  media_url: mediaUrl,
                  isLiked: false,
                  likeCount: post.likes || 0,
                  comments: post.comments || [],
                  media_type: post.media_type || "image",
                };
              });
            setPosts(refreshedPosts);
            setCurrentIndex(initialIndex);
            setIsRefreshing(false);
            hasScrolledToInitialRef.current = false;
          }}
        />
      ) : (
        <>
          {renderHeader()}
          <Text style={{ textAlign: "center", padding: 20 }}>
            No posts available
          </Text>
        </>
      )}
    </SafeAreaView>
  );
};

PostViewScreen.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      posts: PropTypes.arrayOf(PropTypes.object),
      initialIndex: PropTypes.number,
    }),
  }),
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    height: 64,
  },
  headerText: { fontSize: 16, fontWeight: "600", color: "#212529" },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: { fontSize: 24, color: "#212529" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default PostViewScreen;