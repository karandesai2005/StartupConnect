import React, { useState, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
} from "react-native";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NGROK_URL } from '@env';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts';
import Card from "../../Card";
import { Video } from 'expo-av';
import DynamicGraphs from "./DynamicGraphs";
import Stories from "../../Stories";

// Sample data for Stories
const myStories = [
  { id: '3', username: 'Alice', imageUrl: '', hasStory: false, viewed: false },
  { id: '4', username: 'Bob', imageUrl: '', hasStory: false, viewed: false },
  { id: '5', username: 'Charlie', imageUrl: '', hasStory: false, viewed: false },
  { id: '6', username: 'Dave', imageUrl: '', hasStory: false, viewed: false },
  { id: '7', username: 'Eve', imageUrl: '', hasStory: false, viewed: false },
];

const handleStoryPress = (story) => {
  console.log('Story clicked:', story);
};

const Profile = ({ route, isBusinessProfile = false }) => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [activeTab, setActiveTab] = useState('stories');
  const [userPosts, setUserPosts] = useState([]);
  
  const [isGraphModalVisible, setGraphModalVisible] = useState(false);
  const [userGraphs, setUserGraphs] = useState([]);
  const handleAddGraph = (graphData) => {
    setUserGraphs(prev => [...prev, graphData]);
  };

  const screenWidth = Dimensions.get('window').width;
  const spacing = 2;
  const itemSize = (screenWidth - 32 - spacing * 2) / 3;

  const [isModalVisible, setModalVisible] = useState(false);
  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  const cardStyle = {
    width: '90%',
    minHeight: 400,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 15,
  };
  const pieColors = ['#007bff', '#004999', '#002d5f', '#000000', '#696969'];

  useEffect(() => {
    if (route.params?.updatedUser) {
      console.log("Received updated user data:", route.params.updatedUser);
      setUserData(prevData => ({
        ...prevData,
        ...route.params.updatedUser,
        profile_picture: route.params.updatedUser.profile_picture,
        bio: route.params.updatedUser.bio
      }));
      setLastUpdate(Date.now());
      if (route.params.forceRefresh) fetchUserData();
    }
  }, [route.params?.updatedUser]);

  const fetchUserPosts = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.navigate('Login');
        return;
      }
      const response = await fetch(`${NGROK_URL}/api/posts/myposts`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched user posts:", data);
        const mappedPosts = data.map(post => ({
          _id: post.post_id,
          username: post.username,
          profile_picture: post.profile_picture,
          image_url: post.media_url,
          content: post.content,
          created_at: post.created_at,
          likes: 0,
          comments: 0,
          caption: post.content,
          media_type: post.media_type || (post.media_url?.includes('.mp4') ? 'video' : 'image')
        }));
        const validPosts = mappedPosts
          .filter(post => post.image_url && !post.image_url.includes('undefined'))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setUserPosts(validPosts);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Posts fetch error:", error);
      Alert.alert('Error', 'Failed to fetch posts');
    }
  }, [navigation]);

  const fetchUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.navigate('Login');
        return;
      }
      const response = await fetch(`${NGROK_URL}/api/auth/profile?timestamp=${Date.now()}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched profile data:", data);
        setUserData(data);
        setLastUpdate(Date.now());
        await AsyncStorage.setItem('userData', JSON.stringify(data));
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      Alert.alert('Error', 'Failed to fetch profile data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchUserData(), fetchUserPosts()]);
    setRefreshing(false);
  }, [fetchUserData, fetchUserPosts]);

  useFocusEffect(
    useCallback(() => {
      const shouldFetch = !userData || (Date.now() - lastUpdate > 5000);
      if (shouldFetch) {
        setIsLoading(true);
        fetchUserData();
        fetchUserPosts();
      }
      return () => {};
    }, [fetchUserData, fetchUserPosts, userData, lastUpdate])
  );

  const avatarStyle = {
    height: "100%",
    width: "100%",
    backgroundColor: "#f0f8ff",
    borderRadius: isBusinessProfile ? 20 : 48,
    overflow: "hidden",
  };
  const del = {
    height: "100%",
    width: "100%",
    backgroundColor: "#f0f8ff",
    borderRadius: isBusinessProfile ? 20 : 48,
    overflow: "hidden",
    marginLeft: 10,
    marginRight: 10,
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

  const data = [
    { value: 50, label: 'Jan', frontColor: '#007bff', color: '#007bff' },
    { value: 80, label: 'Feb', frontColor: '#B0B0B0', color: '#B0B0B0' },
    { value: 60, label: 'Mar', frontColor: '#505050', color: '#505050' },
    { value: 90, label: 'Apr', frontColor: '#000000', color: '#000000' },
  ];

  const renderTry = () => (
    <View style={styles.try}>
      {userGraphs.map((graph, index) => (
        <View key={index} style={cardStyle}>
          <Text style={styles.graphTitle}>{graph.title}</Text>
          <View style={styles.graphContainer}>
            {graph.type === 'pie' && (
              <PieChart
                data={graph.data.map((item, i) => ({
                  ...item,
                  color: pieColors[i % pieColors.length],
                  gradientCenterColor: pieColors[(i + 1) % pieColors.length],
                  focused: true
                }))}
                radius={120}
                showText
                textColor="black"
                textSize={14}
                textBackground={{ color: 'white', opacity: 0.7 }}
                labelPosition="onBorder"
                showValuesAsLabels={true}
                showGradient
                gradientStyle={{ position: 'absolute', top: 0, left: 0 }}
              />
            )}
            {graph.type === 'bar' && (
              <BarChart
                data={graph.data}
                isAnimated
                animationDuration={300}
                barWidth={18}
                barBorderRadius={3}
                height={300}
                width={300}
                minHeight={1}
                spacing={20}
                noOfSections={5}
                yAxisThickness={0}
                xAxisThickness={0}
              />
            )}
            {graph.type === 'line' && (
              <LineChart
                data={graph.data}
                height={300}
                width={300}
                minHeight={1}
                spacing={50}
                noOfSections={5}
                yAxisThickness={0}
                xAxisThickness={0}
                isAnimated
                animationDuration={7000}
              />
            )}
          </View>
        </View>
      ))}
      <TouchableOpacity 
        style={styles.addGraphButton}
        onPress={() => setGraphModalVisible(true)}
      >
        <Text style={styles.addGraphButtonText}>+ Add New Graph</Text>
      </TouchableOpacity>
      <DynamicGraphs
        visible={isGraphModalVisible}
        onClose={() => setGraphModalVisible(false)}
        onAddGraph={handleAddGraph}
      />
    </View>
  );

  const renderGridItem = (post, index) => {
    const isVideo = post.media_type === 'video' || post.image_url?.includes('.mp4');
    return (
      <TouchableOpacity
        key={index}
        style={[styles.gridItem, { width: itemSize, height: itemSize, marginBottom: 2 }]}
        onPress={() => navigation.navigate('PostView', { posts: userPosts, initialIndex: index })}
      >
        {isVideo ? (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: post.image_url }}
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
              post?.image_url 
                ? { uri: post.image_url }
                : post?.media_url
                  ? { uri: post.media_url }
                  : require('../../../assets/del.png')
            }
            style={styles.gridImage}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderGrid = () => (
    <View style={styles.gridContainer}>
      {userPosts.map((post, index) => renderGridItem(post, index))}
    </View>
  );

  const renderVenturesContent = () => (
    <View style={styles.venturesContainer}>
      <Card 
        title="Featured Achievement" 
        style={{ width: '90%', marginBottom: 20 }}
      >
        <View style={styles.cardContent}>
          <Text style={styles.cardHeader}>Top Venture Milestone</Text>
          <Text style={styles.cardParagraph}>
            This is a significant milestone in our venture journey, showcasing our success and dedication to innovation and growth in the entrepreneurial space.
          </Text>
          <Image
            source={require('../../../assets/ok.png')} // Replace with your certificate image path
            style={styles.certificateImage}
            resizeMode="contain"
          />
        </View>
      </Card>
    </View>
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
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#000000"
          />
        }
      >
        <TouchableOpacity onPress={() => navigation.goBack('Home')} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.profile}>
          <View style={styles.profileSection}>
            <View style={styles.statsContainer}>
              <View style={styles.statsItem}>
                <Text style={styles.statsNumber}>1.2K</Text>
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
                  onError={(error) => console.log("Image load error:", error.nativeEvent.error)}
                />
              </View>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statsItem}>
                <Text style={styles.statsNumber}>856</Text>
                <Text style={styles.statsLabel}>Following</Text>
              </View>
            </View>
          </View>
          <View style={styles.text}>
            <View style={styles.id}>
              <Text style={styles.userName}>{userData?.username || "Chir.a.g"}</Text>
              <Text style={styles.checkCircleIcon}>✓</Text>
            </View>
            <Text style={[styles.about, { textAlign: 'center', paddingHorizontal: 10 }]}>
              {userData?.bio || "CEO of PITCH. Entrepreneur investor and many more"}
            </Text>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.masterOutlineButton}
              onPress={() => navigation.navigate('EditProfilePage', { userData })}
            >
              <Text style={styles.button}>Edit Profile</Text>
            </TouchableOpacity>
            <View style={styles.storiesWrapper}>
              <Stories 
                stories={myStories} 
                onStoryPress={handleStoryPress} 
                title="Milestones and others" 
              />
            </View>
          </View>
        </View>

        <View style={styles.tab}>
          {renderTab("stories", isBusinessProfile ? "The Startup" : "The Ventures")}
          {renderTab("startups", "The Analytics")}
          {renderTab("bucks", "The Posts")}
        </View>

        {activeTab === 'stories' && (
          <View>
            <View style={styles.storiesWrapper}>
              <Stories stories={myStories} onStoryPress={handleStoryPress} title="Startups" />
            </View>
            <View style={styles.storiesWrapper}>
              <Stories stories={myStories} onStoryPress={handleStoryPress} title="Investments" />
            </View>
            {renderVenturesContent()}
          </View>
        )}
        {activeTab === 'startups' && renderTry()}
        {activeTab === 'bucks' && renderGrid()}
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Image source={require('../../../assets/home4.webp')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('CreatePost')}>
          <Image source={require('../../../assets/plus3.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Image source={require('../../../assets/bell.png')} style={styles.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Image source={require('../../../assets/settings.png')} style={styles.navIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  addGraphButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
    width: '90%',
  },
  addGraphButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  try: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    padding: 20,
    width: '100%',
  },
  graphTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  graphContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 350,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playIcon: {
    color: 'white',
    fontSize: 24,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 2,
    paddingTop: 20,
    paddingBottom: 20,
    width: '100%',
  },
  gridItem: {
    backgroundColor: '#f0f0f0',
    marginBottom: 2,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  profileContainer: {
    flexGrow: 1,
    backgroundColor: "#fff",
    marginTop: 30,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    marginTop: 20,
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 0,
    width: '100%',
    position: 'relative',
    height: '100%',
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 48,
  },
  profile: {
    width: "100%",
    backgroundColor: "#fff",
    alignItems: "center",
    padding: 0,
    gap: 14,
    marginTop: 30,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  avatarMultiVariants: {
    width: 96,
    height: 96,
    marginHorizontal: 20,
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
    fontFamily: "AvenirNextCyr",
  },
  statsLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: "AvenirNextCyr",
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
    fontFamily: "AvenirNextCyr",
    textAlign: "center",
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
    fontFamily: "AvenirNextCyr",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    fontSize: 12,
    lineHeight: 18,
    color: "#666",
    fontFamily: "AvenirNextCyr-Bold",
    fontWeight: "600",
  },
  tab: {
    width: "90%",
    flexDirection: "row",
    backgroundColor: "#f3f3f3",
    borderRadius: 18,
    borderColor: "#ddd",
    borderWidth: 1,
    padding: 4,
    gap: 8,
    marginTop: 10,
    alignSelf: 'center',
    justifyContent: "center",
    alignItems: "center",
  },
  tab1: {
    flex: 1,
    height: 30,
    backgroundColor: "#007bff",
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  tab2: {
    flex: 1,
    height: 28,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  tabs: {
    fontSize: 14,
    lineHeight: 20,
    color: "#fff",
    fontFamily: "AvenirNextCyr-Bold",
    fontWeight: "600",
    textAlign: "center",
  },
  tabs1: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
    fontFamily: "AvenirNextCyr-Bold",
    fontWeight: "600",
    textAlign: "center",
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
  scrollViewContent: {
    paddingBottom: 100,
    width: '100%',
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    paddingVertical: Platform.OS === 'ios' ? 20 : 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#ffff',
    width: "100%",
    bottom: 0,
    zIndex: 10,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 84 : 60,
  },
  navIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
    ...(Platform.OS === 'android' && { tintColor: undefined })
  },
  storiesWrapper: {
    width: '95%',
    marginTop: 10,
    padding: 10,
    alignSelf: 'center',
  },
  venturesContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    padding: 10,
  },
  cardContent: {
    padding: 15,
    gap: 0,
  },
  cardHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    fontFamily: "AvenirNextCyr",
  },
  cardParagraph: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    fontFamily: "AvenirNextCyr",
  },
  certificateImage: {
    width: '100%',
    height: 400, // Adjusted for a certificate-like 2:1.5 ratio (approx. 8.5" x 11" scaled for mobile)
    borderRadius: 8,
  },
});

export default Profile;