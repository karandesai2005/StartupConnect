import React, { useState, useCallback, useEffect } from "react";
import {
  Platform,
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  FlatList,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NGROK_URL } from "@env";
import { BarChart, PieChart, LineChart } from "react-native-gifted-charts";
import { Video } from "expo-av";
import DynamicGraphs from "./DynamicGraphs";
import * as ImagePicker from "expo-image-picker";

const StoryItem = React.memo(({ story, onPress, isAddButton }) => {
  const imageSource = isAddButton
    ? require("../../../assets/del.png")
    : story.image_url
    ? { uri: story.image_url }
    : require("../../../assets/del.png");

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.storyItem}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.storyRing,
          { borderColor: story.viewed ? "#8e8e8e" : "#1f219c" },
          story.has_story && styles.activeStoryRing,
          isAddButton && { borderWidth: 0 },
        ]}
      >
        <View style={styles.storyImageContainer}>
          {isAddButton ? (
            <Text style={styles.addStoryText}>+</Text>
          ) : (
            <Image
              source={imageSource}
              style={styles.storyImage}
              resizeMode="cover"
              defaultSource={require("../../../assets/del.png")}
            />
          )}
          {story.has_story && !story.viewed && !isAddButton && (
            <View style={styles.unreadIndicator} />
          )}
        </View>
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {isAddButton ? "Add Story" : story.username}
      </Text>
    </TouchableOpacity>
  );
});

const Stories = React.memo(({ stories, onStoryPress, onAddStory, title, sectionId }) => {
  const addStoryItem = { id: "add", username: "Add Story", has_story: false, viewed: false };
  const filteredStories = stories.filter((story) => story.section === sectionId);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.divider} />
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.divider} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContainer}
      >
        <StoryItem
          story={addStoryItem}
          onPress={() => onAddStory(sectionId)}
          isAddButton={true}
        />
        {filteredStories.map((story, index) => (
          <StoryItem
            key={story.story_id}
            story={story}
            onPress={() => onStoryPress(story, index)}
          />
        ))}
      </ScrollView>
      <View style={styles.divider} />
    </View>
  );
});

const ImageSection = ({ title, imageUri }) => (
  <View style={styles.sectionContainer}>
    <View style={styles.divider} />
    <Text style={styles.sectionHeader}>{title}</Text>
    <View style={styles.divider} />
    {imageUri ? (
      <Image
        source={{ uri: imageUri }}
        style={styles.sectionImage}
        resizeMode="cover"
        defaultSource={require("../../../assets/del.png")}
      />
    ) : (
      <Text style={styles.placeholderText}>No image uploaded</Text>
    )}
    <View style={styles.divider} />
  </View>
);

const TextSection = ({ title, content }) => (
  <View style={styles.sectionContainer}>
    <View style={styles.divider} />
    <Text style={styles.sectionHeader}>{title}</Text>
    <View style={styles.divider} />
    <Text style={styles.sectionContent}>{content}</Text>
    <View style={styles.divider} />
  </View>
);

const LinkSection = ({ title, linkType, onPress }) => (
  <View style={styles.sectionContainer}>
    <View style={styles.divider} />
    <Text style={styles.sectionHeader}>{title}</Text>
    <View style={styles.divider} />
    <TouchableOpacity style={styles.linkButton} onPress={onPress}>
      <Text style={styles.linkText}>
        {linkType === "team" ? "View Team Profiles" : linkType === "startups" ? "View Startup Profiles" : "View Startup Profile"}
      </Text>
    </TouchableOpacity>
    <View style={styles.divider} />
  </View>
);

const Profile = ({ route, isBusinessProfile = false }) => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [activeTab, setActiveTab] = useState("stories");
  const [userPosts, setUserPosts] = useState([]);
  const [isGraphModalVisible, setGraphModalVisible] = useState(false);
  const [userGraphs, setUserGraphs] = useState([]);
  const [sections, setSections] = useState([]);
  const [stories, setStories] = useState([]);
  const [isSectionModalVisible, setSectionModalVisible] = useState(false);
  const [isLinkSectionModalVisible, setLinkSectionModalVisible] = useState(false);
  const [sectionType, setSectionType] = useState(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionContent, setSectionContent] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [networkError, setNetworkError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const sectionMap = {
    "Our Journey": "milestones",
    "Key Metrics": "metrics",
    "Updates": "updates",
  };

  const fetchWithAuth = async (endpoint, method = "GET", body = null) => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      navigation.navigate("Login");
      return null;
    }
    try {
      const baseUrl = NGROK_URL.endsWith("/") ? NGROK_URL.slice(0, -1) : NGROK_URL;
      const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      const url = `${baseUrl}/api/profile${cleanEndpoint}`;
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : null,
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigation.navigate("Login");
          return null;
        }
        throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      setNetworkError(true);
      return null;
    }
  };

  const loadCachedData = async () => {
    try {
      const cachedUserData = await AsyncStorage.getItem("userData");
      if (cachedUserData) setUserData(JSON.parse(cachedUserData));
      const cachedPosts = await AsyncStorage.getItem("userPosts");
      if (cachedPosts) setUserPosts(JSON.parse(cachedPosts));
      const cachedStories = await AsyncStorage.getItem("stories");
      if (cachedStories) setStories(JSON.parse(cachedStories));
      const cachedSections = await AsyncStorage.getItem("sections");
      if (cachedSections) setSections(JSON.parse(cachedSections));
      const cachedGraphs = await AsyncStorage.getItem("userGraphs");
      if (cachedGraphs) setUserGraphs(JSON.parse(cachedGraphs));
    } catch (error) {
      console.error("Error loading cached data:", error);
    }
  };

  const fetchUserData = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      navigation.navigate("Login");
      return;
    }
    const { username, isOtherUser } = route.params || {};
    const endpoint = isOtherUser && username
      ? `${NGROK_URL}/api/auth/users/${username}`
      : `${NGROK_URL}/api/auth/profile?timestamp=${Date.now()}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    if (response.ok) {
      const data = await response.json();
      setUserData(data);
      setIsFollowing(data.isFollowing || false);
      setLastUpdate(Date.now());
      await AsyncStorage.setItem("userData", JSON.stringify(data));
      setNetworkError(false);
    } else {
      throw new Error("Failed to fetch user data");
    }
  };

  const fetchUserPosts = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;
    const { username } = route.params || {};
    const endpoint = username
      ? `${NGROK_URL}/api/profile/posts/user/${username}`
      : `${NGROK_URL}/api/profile/posts/myposts`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      const data = await response.json();
      const mappedPosts = data.map((post) => ({
        _id: post.post_id,
        username: post.username,
        profile_picture: post.profile_picture,
        image_url: post.media_url,
        content: post.content,
        created_at: post.created_at,
        likes: post.like_count || 0,
        comments: 0,
        caption: post.content,
        media_type: post.media_type || (post.media_url?.includes(".mp4") ? "video" : "image"),
      }))
        .filter((post) => post.image_url && !post.image_url.includes("undefined"))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setUserPosts(mappedPosts);
      await AsyncStorage.setItem("userPosts", JSON.stringify(mappedPosts));
    }
  };

  const fetchStories = async () => {
    const storiesData = await fetchWithAuth("/stories");
    if (storiesData) {
      const validStories = storiesData.map((story) => ({
        story_id: story.story_id,
        image_url: story.image_url.startsWith("http") ? story.image_url : `${NGROK_URL}${story.image_url}`,
        has_story: story.has_story === 1 || true,
        viewed: story.viewed === 1,
        username: story.username || userData?.username || "User",
        profile_picture: userData?.profile_picture || null,
        section: story.section || "milestones",
      }));
      setStories(validStories);
      await AsyncStorage.setItem("stories", JSON.stringify(validStories));
    }
  };

  const fetchSections = async () => {
    const sectionsData = await fetchWithAuth("/sections");
    if (sectionsData) {
      setSections(sectionsData);
      await AsyncStorage.setItem("sections", JSON.stringify(sectionsData));
    }
  };

  const fetchGraphs = async () => {
    const graphsData = await fetchWithAuth("/graphs");
    if (graphsData) {
      setUserGraphs(graphsData);
      await AsyncStorage.setItem("userGraphs", JSON.stringify(graphsData));
    }
  };

  const refreshProfileData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUserData(),
        fetchUserPosts(),
        fetchStories(),
        fetchSections(),
        fetchGraphs(),
      ]);
    } catch (error) {
      console.error("Refresh failed:", error);
      await loadCachedData();
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (route.params?.updatedUser) {
      setUserData((prev) => ({ ...prev, ...route.params.updatedUser }));
      setLastUpdate(Date.now());
      if (route.params.forceRefresh) refreshProfileData();
    }
  }, [route.params?.updatedUser, refreshProfileData]);

  useFocusEffect(
    useCallback(() => {
      if (!userData) {
        refreshProfileData();
      } else if (Date.now() - lastUpdate > 60000) {
        refreshProfileData();
      } else {
        loadCachedData().then(() => setIsLoading(false));
      }
    }, [userData, lastUpdate, refreshProfileData])
  );

  const handleAddStory = (sectionId) => {
    navigation.navigate("AddStory", {
      onStoryAdded: (newStory) => {
        const fullImageUrl = newStory.image_url.startsWith("http")
          ? newStory.image_url
          : `${NGROK_URL}${newStory.image_url}`;
        setStories((prev) => [
          ...prev,
          {
            story_id: newStory.story_id,
            image_url: fullImageUrl,
            has_story: true,
            viewed: false,
            username: userData?.username || "User",
            profile_picture: userData?.profile_picture || null,
            section: newStory.section || sectionId,
          },
        ]);
        fetchStories();
      },
      section: sectionId,
    });
  };

  const handleAddSection = () => {
    setSectionType(null);
    setSectionTitle("");
    setSectionContent("");
    setImageUri(null);
    setSectionModalVisible(true);
  };

  const handleSectionSubmit = async () => {
    if (!sectionTitle) return alert("Please provide a section title");
    if (sectionType === "text" && !sectionContent) return alert("Please provide section content");
    if (sectionType === "image" && !imageUri) return alert("Please select an image");
    const sectionData = {
      type: sectionType,
      title: sectionTitle,
      content: sectionType === "text" ? sectionContent : null,
      image_uri: sectionType === "image" ? imageUri : null,
    };
    const response = await fetchWithAuth("/sections", "POST", sectionData);
    if (response) {
      await fetchSections();
      setSectionModalVisible(false);
      resetSectionModal();
    } else {
      alert("Failed to create section");
    }
  };

  const resetSectionModal = () => {
    setSectionType(null);
    setSectionTitle("");
    setSectionContent("");
    setImageUri(null);
  };

  const handleAddLinkSection = () => {
    setLinkSectionModalVisible(true);
  };

  const handleLinkSectionSubmit = async (linkType) => {
    const sectionData = {
      type: "link",
      title: `${linkType === "team" ? "Team Profiles" : linkType === "startups" ? "Startup Profiles" : "Startup Profile"}`,
      linkType,
    };
    const response = await fetchWithAuth("/sections", "POST", sectionData);
    if (response) {
      await fetchSections();
      setLinkSectionModalVisible(false);
    } else {
      alert("Failed to create link section");
    }
  };

  const handleSectionNavigation = (linkType) => {
    if (linkType === "team") {
      navigation.navigate("TeamProfiles");
    } else if (linkType === "startups") {
      navigation.navigate("StartupProfiles");
    } else if (linkType === "singleStartup") {
      navigation.navigate("StartupProfile");
    }
  };

  const handleAddGraph = async (graphData) => {
    const response = await fetchWithAuth("/graphs", "POST", graphData);
    if (response) {
      await fetchGraphs();
      setGraphModalVisible(false);
    } else {
      alert("Failed to create graph");
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleFollow = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      navigation.navigate("Login");
      return;
    }
    try {
      const response = await fetch(`${NGROK_URL}/api/profile/follow`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: userData.username }),
      });
      if (response.ok) {
        setIsFollowing(true);
        setUserData((prev) => ({
          ...prev,
          followers: (prev.followers || 0) + 1,
        }));
      } else {
        throw new Error("Failed to follow user");
      }
    } catch (error) {
      console.error("Follow error:", error);
      alert("Failed to follow user");
    }
  };

  const renderTab = (tabName, label) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabName ? styles.tab1 : styles.tab2]}
      onPress={() => setActiveTab(tabName)}
    >
      <Text style={activeTab === tabName ? styles.tabs : styles.tabs1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderStoriesTab = () => (
    <View style={{ width: "100%" }}>
      <Stories
        title="Our Journey"
        sectionId="milestones"
        stories={stories}
        onAddStory={handleAddStory}
        onStoryPress={(story, index) =>
          navigation.navigate("ViewStory", {
            stories: stories.filter((s) => s.section === "milestones"),
            initialIndex: index,
          })
        }
      />
      {sections.map((section) => {
        switch (section.type) {
          case "story":
            return (
              <Stories
                key={section.section_id}
                title={section.title}
                sectionId={sectionMap[section.title] || section.title.toLowerCase().replace(/ /g, "_")}
                stories={stories}
                onAddStory={handleAddStory}
                onStoryPress={(story, index) =>
                  navigation.navigate("ViewStory", {
                    stories: stories.filter((s) => s.section === (sectionMap[section.title] || section.title.toLowerCase().replace(/ /g, "_"))),
                    initialIndex: index,
                  })
                }
              />
            );
          case "image":
            return <ImageSection key={section.section_id} title={section.title} imageUri={section.image_uri} />;
          case "text":
            return <TextSection key={section.section_id} title={section.title} content={section.content} />;
          case "link":
            return (
              <LinkSection
                key={section.section_id}
                title={section.title}
                linkType={section.linkType}
                onPress={() => handleSectionNavigation(section.linkType)}
              />
            );
          default:
            return null;
        }
      })}
      <TouchableOpacity style={styles.addStorySectionButton} onPress={handleAddSection}>
        <Text style={styles.addStorySectionText}>+ Add New Section</Text>
      </TouchableOpacity>
      {userData?.role === "founder" && !route.params?.isOtherUser && (
        <TouchableOpacity style={styles.addLinkSectionButton} onPress={handleAddLinkSection}>
          <Text style={styles.addLinkSectionText}>+ Add Link Section</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAnalyticsTab = () => (
    <View style={styles.try}>
      {userGraphs.map((graph) => (
        <View key={graph.graph_id} style={styles.cardStyle}>
          <Text style={styles.graphTitle}>{graph.title}</Text>
          <View style={styles.graphContainer}>
            {graph.type === "pie" && (
              <PieChart
                data={graph.data.map((item, i) => ({
                  ...item,
                  color: ["#007bff", "#004999", "#002d5f", "#000000", "#696969"][i % 5],
                  gradientCenterColor: ["#007bff", "#004999", "#002d5f", "#000000", "#696969"][(i + 1) % 5],
                  focused: true,
                }))}
                donut
                innerRadius={40}
                radius={100}
                showText
                textColor="black"
                textSize={14}
                showValuesAsLabels
                showGradient
                centerLabelComponent={() => (
                  <Text style={{ fontSize: 16, color: "#333" }}>
                    Total: {graph.data.reduce((sum, item) => sum + item.value, 0)}
                  </Text>
                )}
              />
            )}
            {graph.type === "bar" && (
              <BarChart
                data={graph.data}
                isAnimated
                animationDuration={300}
                barWidth={18}
                barBorderRadius={3}
                height={200}
                width={350}
                spacing={20}
                noOfSections={5}
                yAxisThickness={0}
                xAxisThickness={0}
                hideRules
                maxValue={Math.max(...graph.data.map((item) => item.value)) * 1.2}
              />
            )}
            {graph.type === "line" && (
              <LineChart
                data={graph.data}
                height={200}
                width={350}
                hideRules
                spacing={50}
                noOfSections={5}
                yAxisThickness={0}
                xAxisThickness={0}
                isAnimated
                animationDuration={700}
                maxValue={Math.max(...graph.data.map((item) => item.value)) * 1.2}
              />
            )}
          </View>
        </View>
      ))}
      <TouchableOpacity style={styles.addGraphButton} onPress={() => setGraphModalVisible(true)}>
        <Text style={styles.addGraphButtonText}>+ Add New Graph</Text>
      </TouchableOpacity>
      <DynamicGraphs
        visible={isGraphModalVisible}
        onClose={() => setGraphModalVisible(false)}
        onAddGraph={handleAddGraph}
      />
    </View>
  );

  const renderGridItem = ({ item, index }) => {
    const isVideo = item.media_type === "video" || item.image_url?.includes(".mp4");
    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => navigation.navigate("PostView", { posts: userPosts, initialIndex: index })}
      >
        {isVideo ? (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: item.image_url }}
              style={styles.gridImage}
              resizeMode="cover"
              shouldPlay={false}
              isMuted
              useNativeControls={false}
            />
            <View style={styles.playIconContainer}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        ) : (
          <Image
            source={item.image_url ? { uri: item.image_url } : require("../../../assets/del.png")}
            style={styles.gridImage}
            resizeMode="cover"
            defaultSource={require("../../../assets/del.png")}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderPostsTab = () => (
    <FlatList
      data={userPosts}
      renderItem={renderGridItem}
      keyExtractor={(item) => item._id}
      numColumns={3}
      contentContainerStyle={styles.gridContainer}
      columnWrapperStyle={{ gap: 2 }}
    />
  );

  if (isLoading && !userData) {
    return (
      <View style={styles.container}>
        <View style={styles.profileSection}>
          <View style={[styles.avatarMultiVariants, { backgroundColor: "#ddd" }]} />
          <View style={styles.statsContainer}>
            <Text style={[styles.statsNumber, { color: "#ddd" }]}>---</Text>
            <Text style={[styles.statsLabel, { color: "#ddd" }]}>Followers</Text>
          </View>
        </View>
        <ActivityIndicator size="small" color="#1f219c" />
      </View>
    );
  }

  const handleProfileButtonPress = () => {
    if (route.params?.isOtherUser) {
      console.log("Viewing another user's profile, no edit option.");
    } else {
      navigation.navigate("EditProfilePage", { userData });
    }
  };

  const sampleProfile = {
    image_url: userData?.profile_picture || null,
    has_story: false,
    viewed: false,
    username: userData?.username || "User",
  };

  return (
    <View style={styles.contentContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshProfileData} />}
      >
        <TouchableOpacity onPress={() => navigation.goBack("Home")} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        {networkError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Network error. Showing cached data.</Text>
            <TouchableOpacity onPress={refreshProfileData} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.profile}>
          <View style={styles.profileSection}>
            <View style={styles.statsContainer}>
              <Text style={styles.statsNumber}>{userData?.followers || "1.2K"}</Text>
              <Text style={styles.statsLabel}>Followers</Text>
            </View>
            <View style={styles.avatarMultiVariants}>
              <Image
                source={
                  userData?.profile_picture
                    ? { uri: `${userData.profile_picture}?timestamp=${lastUpdate}` }
                    : require("../../../assets/del.png")
                }
                style={styles.profileImage}
                resizeMode="cover"
                defaultSource={require("../../../assets/del.png")}
              />
            </View>
            <View style={styles.statsContainer}>
              <Text style={styles.statsNumber}>{userData?.following || "856"}</Text>
              <Text style={styles.statsLabel}>Following</Text>
            </View>
          </View>
          <View style={styles.text}>
            <View style={styles.id}>
              <Text style={styles.userName}>{userData?.username || "Chir.a.g"}</Text>
              {userData?.verified && <Text style={styles.checkCircleIcon}>✓</Text>}
            </View>
            <Text style={[styles.about, { textAlign: "center", paddingHorizontal: 10 }]}>
              {userData?.bio || "CEO of PITCH. Entrepreneur, investor, and more."}
            </Text>
            {userData?.funding_ask && (
              <Text style={styles.fundingAsk}>
                Seeking {userData.funding_ask.amount} for {userData.funding_ask.equity}% equity
              </Text>
            )}
          </View>
          <View style={styles.buttonContainer}>
            {route.params?.isOtherUser ? (
              <TouchableOpacity
                style={[
                  styles.masterOutlineButton,
                  isFollowing && { backgroundColor: "#1f219c" },
                ]}
                onPress={isFollowing ? null : handleFollow}
              >
                <Text style={[styles.button, isFollowing && { color: "white" }]}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.masterOutlineButton} onPress={handleProfileButtonPress}>
                <Text style={styles.button}>Edit Profile</Text>
              </TouchableOpacity>
            )}
            {route.params?.isOtherUser && userData?.role === "founder" && (
              <TouchableOpacity
                style={[styles.masterOutlineButton, { backgroundColor: "#1f219c" }]}
                onPress={() => navigation.navigate("ConnectInvestor", { user: userData })}
              >
                <Text style={[styles.button, { color: "white" }]}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.tab}>
          {renderTab("stories", "Our Journey")}
          {renderTab("startups", "Key Metrics")}
          {renderTab("bucks", "Updates")}
        </View>

        {activeTab === "stories" && renderStoriesTab()}
        {activeTab === "startups" && renderAnalyticsTab()}
        {activeTab === "bucks" && renderPostsTab()}
      </ScrollView>

      <Modal visible={isSectionModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Section</Text>
            {!sectionType ? (
              <View style={styles.modalOptions}>
                <TouchableOpacity style={styles.modalButton} onPress={() => setSectionType("story")}>
                  <Text style={styles.modalButtonText}>Story Section</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={() => setSectionType("image")}>
                  <Text style={styles.modalButtonText}>Image Section</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={() => setSectionType("text")}>
                  <Text style={styles.modalButtonText}>Text Section</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setSectionModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ width: "100%" }} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.modalForm}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Section Title"
                    value={sectionTitle}
                    onChangeText={setSectionTitle}
                  />
                  {sectionType === "text" && (
                    <TextInput
                      style={[styles.modalInput, styles.modalTextArea]}
                      placeholder="Section Content"
                      value={sectionContent}
                      onChangeText={setSectionContent}
                      multiline
                    />
                  )}
                  {sectionType === "image" && (
                    <TouchableOpacity style={styles.modalButton} onPress={pickImage}>
                      <Text style={styles.modalButtonText}>
                        {imageUri ? "Image Selected" : "Pick Image"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.modalFormButtons}>
                    <TouchableOpacity style={styles.modalSubmitButton} onPress={handleSectionSubmit}>
                      <Text style={styles.modalButtonText}>Add Section</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setSectionModalVisible(false);
                        resetSectionModal();
                      }}
                    >
                      <Text style={styles.modalButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={isLinkSectionModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Link Section</Text>
            <View style={styles.modalOptions}>
              <TouchableOpacity
                style={styles.linkOptionContainer}
                onPress={() => handleLinkSectionSubmit("team")}
              >
                <StoryItem
                  story={sampleProfile}
                  onPress={() => handleLinkSectionSubmit("team")}
                  isAddButton={false}
                />
                <Text style={styles.linkOptionText}>Team Profiles</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkOptionContainer}
                onPress={() => handleLinkSectionSubmit("startups")}
              >
                <StoryItem
                  story={sampleProfile}
                  onPress={() => handleLinkSectionSubmit("startups")}
                  isAddButton={false}
                />
                <Text style={styles.linkOptionText}>Startup Profiles</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkOptionContainer}
                onPress={() => handleLinkSectionSubmit("singleStartup")}
              >
                <StoryItem
                  story={sampleProfile}
                  onPress={() => handleLinkSectionSubmit("singleStartup")}
                  isAddButton={false}
                />
                <Text style={styles.linkOptionText}>Single Startup Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLinkSectionModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: { width: "100%", paddingVertical: 5, backgroundColor: "#fff" },
  sectionHeader: { fontSize: 18, fontWeight: "600", color: "#333", marginVertical: 2, paddingHorizontal: 15 },
  divider: { height: 1, backgroundColor: "#ccc", width: Dimensions.get("window").width, marginVertical: 5 },
  sectionImage: { width: "100%", height: 200, borderRadius: 8, resizeMode: "cover", marginVertical: 2 },
  sectionContent: { fontSize: 14, color: "#666", lineHeight: 20, paddingHorizontal: 15 },
  placeholderText: { fontSize: 14, color: "#999", paddingHorizontal: 15 },
  storiesContainer: { paddingVertical: 2, flexDirection: "row", alignItems: "center", paddingHorizontal: 15 },
  storyItem: { alignItems: "center", width: 72, marginHorizontal: 6, paddingVertical: 4 },
  storyRing: { borderWidth: 2, borderRadius: 37 },
  activeStoryRing: { borderWidth: 2.5, borderColor: "#1f219c" },
  storyImageContainer: { width: 70, height: 70, borderRadius: 35, overflow: "hidden", backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" },
  storyImage: { width: "100%", height: "100%" },
  addStoryText: { fontSize: 24, color: "#666", fontWeight: "600" },
  storyUsername: { marginTop: 6, fontSize: 12, textAlign: "center", color: "#666", fontFamily: "AvenirNextCyr", fontWeight: "500" },
  unreadIndicator: { position: "absolute", bottom: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: "#1f219c", borderWidth: 1, borderColor: "#fff" },
  addStorySectionButton: { backgroundColor: "#1f219c", padding: 15, borderRadius: 10, marginVertical: 20, alignItems: "center", width: "90%", alignSelf: "center" },
  addStorySectionText: { color: "white", fontSize: 16, fontWeight: "600" },
  addLinkSectionButton: { backgroundColor: "#1f219c", padding: 15, borderRadius: 10, marginVertical: 10, alignItems: "center", width: "90%", alignSelf: "center" },
  addLinkSectionText: { color: "white", fontSize: 16, fontWeight: "600" },
  linkButton: { backgroundColor: "#1f219c", padding: 10, borderRadius: 5, alignItems: "center", marginHorizontal: 15, marginVertical: 5 },
  linkText: { color: "white", fontSize: 14, fontWeight: "600" },
  addGraphButton: { backgroundColor: "#1f219c", padding: 15, borderRadius: 10, marginVertical: 20, alignItems: "center", width: "90%", alignSelf: "center" },
  addGraphButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  try: { flexDirection: "column", alignItems: "center", paddingVertical: 20, width: "100%" },
  cardStyle: { width: "90%", height: 300, marginBottom: 20, backgroundColor: "white", borderRadius: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  graphTitle: { fontSize: 18, fontWeight: "600", color: "#333", textAlign: "center", padding: 15, borderBottomWidth: 1, borderBottomColor: "#eee" },
  graphContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 10, width: 350 },
  videoContainer: { position: "relative", width: "100%", height: "100%" },
  playIconContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)" },
  playIcon: { color: "white", fontSize: 24 },
  gridContainer: { paddingVertical: 20, width: "100%" },
  gridItem: { width: (Dimensions.get("window").width - 34) / 3, height: (Dimensions.get("window").width - 34) / 3, backgroundColor: "#f0f0f0", marginBottom: 2 },
  gridImage: { width: "100%", height: "100%", borderRadius: 4 },
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  contentContainer: { flex: 1, alignItems: "center", paddingHorizontal: 0, width: "100%", position: "relative" },
  profileImage: { width: "100%", height: "100%", borderRadius: 48 },
  profile: { width: "100%", backgroundColor: "#fff", alignItems: "center", padding: 0, gap: 14, marginTop: 55 },
  profileSection: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 40, paddingTop: 20 },
  avatarMultiVariants: { width: 96, height: 96, marginHorizontal: 20, backgroundColor: "#f0f8ff", borderRadius: 48, overflow: "hidden" },
  statsContainer: { alignItems: "center", justifyContent: "center" },
  statsNumber: { fontSize: 18, fontWeight: "700", color: "#000", fontFamily: "AvenirNextCyr" },
  statsLabel: { fontSize: 14, color: "#666", fontFamily: "AvenirNextCyr" },
  text: { width: "100%", gap: 4, alignItems: "center" },
  userName: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: "#000", fontFamily: "AvenirNextCyr", textAlign: "center" },
  id: { flexDirection: "row", alignItems: "center", gap: 4 },
  about: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: "#000", fontFamily: "AvenirNextCyr" },
  fundingAsk: { fontSize: 14, color: "#1f219c", fontWeight: "600", marginTop: 5 },
  checkCircleIcon: { marginLeft: 5, color: "green" },
  buttonContainer: { width: "100%", flexDirection: "row", justifyContent: "center", gap: 10 },
  masterOutlineButton: { borderRadius: 14, borderColor: "#ccc", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#f9f9f9", alignItems: "center", justifyContent: "center" },
  button: { fontSize: 12, lineHeight: 18, color: "#666", fontFamily: "AvenirNextCyr-Bold", fontWeight: "600" },
  tab: { width: "90%", flexDirection: "row", backgroundColor: "#f3f3f3", borderRadius: 18, borderColor: "#ddd", borderWidth: 1, padding: 4, gap: 8, marginTop: 10, alignSelf: "center", marginBottom: 20 },
  tab1: { flex: 1, height: 30, backgroundColor: "#1f219c", borderRadius: 18, paddingVertical: 4, paddingHorizontal: 8, justifyContent: "center", alignItems: "center" },
  tab2: { flex: 1, height: 28, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 8, justifyContent: "center", alignItems: "center" },
  tabs: { fontSize: 14, lineHeight: 20, color: "#fff", fontFamily: "AvenirNextCyr-Bold", fontWeight: "600", textAlign: "center" },
  tabs1: { fontSize: 14, lineHeight: 20, color: "#666", fontFamily: "AvenirNextCyr-Bold", fontWeight: "600", textAlign: "center" },
  backButton: { position: "absolute", left: 28, top: 20, zIndex: 1 },
  backButtonText: { fontSize: 32, color: "#000", paddingTop: 20 },
  scrollViewContent: { paddingBottom: 80, width: "100%", alignItems: "center" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContainer: { width: "80%", backgroundColor: "white", borderRadius: 10, padding: 20, alignItems: "center", maxHeight: Dimensions.get("window").height * 0.7 },
  modalTitle: { fontSize: 20, fontWeight: "600", marginBottom: 20 },
  modalOptions: { width: "100%", gap: 15 },
  modalButton: { backgroundColor: "#1f219c", padding: 10, borderRadius: 5, alignItems: "center" },
  cancelButton: { backgroundColor: "#666" },
  modalButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  modalForm: { width: "100%", gap: 15 },
  modalInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 10, fontSize: 16, width: "100%" },
  modalTextArea: { height: 100, textAlignVertical: "top" },
  modalFormButtons: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  modalSubmitButton: { backgroundColor: "#1f219c", padding: 10, borderRadius: 5, alignItems: "center", flex: 1, marginRight: 5 },
  linkOptionContainer: { flexDirection: "row", alignItems: "center", justifyContent: "flex-start", width: "100%" },
  linkOptionText: { fontSize: 16, fontWeight: "600", color: "#333", marginLeft: 10 },
  errorContainer: { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  errorText: { color: "red", fontSize: 14, marginRight: 10 },
  retryButton: { padding: 5, backgroundColor: "#1f219c", borderRadius: 5 },
  retryButtonText: { color: "white", fontSize: 12 },
});

export default Profile;