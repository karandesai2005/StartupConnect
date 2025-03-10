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
  Keyboard
} from "react-native";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NGROK_URL } from '@env';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts';
import { Video } from 'expo-av';
import DynamicGraphs from "./DynamicGraphs";
import * as ImagePicker from 'expo-image-picker';
import Bottomnav from '../../BottamNav';

const StoryItem = React.memo(({ story, onPress, isAddButton }) => {
  const imageSource = story.image_url
    ? { uri: story.image_url }
    : require('../../../assets/del.png');

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.storyItem}
      activeOpacity={0.7}
    >
      <View style={[
        styles.storyRing,
        { borderColor: story.viewed ? '#8e8e8e' : '#007bff' },
        story.has_story && styles.activeStoryRing,
        isAddButton && { borderWidth: 0 }
      ]}>
        <View style={styles.storyImageContainer}>
          {isAddButton ? (
            <Text style={styles.addStoryText}>+</Text>
          ) : (
            <Image
              source={imageSource}
              style={styles.storyImage}
              resizeMode="cover"
              defaultSource={require('../../../assets/del.png')}
            />
          )}
          {story.has_story && !story.viewed && !isAddButton && (
            <View style={styles.unreadIndicator} />
          )}
        </View>
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {isAddButton ? 'Add Story' : story.username}
      </Text>
    </TouchableOpacity>
  );
});

const Stories = React.memo(({ stories, onStoryPress, onAddStory, title }) => {
  const addStoryItem = { id: 'add', username: 'Add Story', has_story: false, viewed: false };

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
          onPress={onAddStory}
          isAddButton={true}
        />
        {stories.map((story) => (
          <StoryItem
            key={story.story_id || story.id}
            story={story}
            onPress={() => onStoryPress?.(story)}
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
        defaultSource={require('../../../assets/del.png')}
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
  const [sections, setSections] = useState([]);
  const [stories, setStories] = useState([]);
  const [isSectionModalVisible, setSectionModalVisible] = useState(false);
  const [sectionType, setSectionType] = useState(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionContent, setSectionContent] = useState('');
  const [imageUri, setImageUri] = useState(null);

  const fetchWithAuth = async (endpoint, method = 'GET', body = null) => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      navigation.navigate('Login');
      return null;
    }
    try {
      // Make sure NGROK_URL doesn't end with a slash and endpoint starts with one
      const baseUrl = NGROK_URL.endsWith('/') ? NGROK_URL.slice(0, -1) : NGROK_URL;
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      
      const url = `${baseUrl}/api/profile${cleanEndpoint}`;
      console.log(`Fetching: ${url}`); // Debug log
      
      const response = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : null,
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch ${endpoint}: ${response.status}`);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      return null;
    }
  };

  useEffect(() => {
    if (route.params?.updatedUser) {
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

  const fetchUserPosts = useCallback(async (username) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.navigate('Login');
        return;
      }
      const endpoint = username
        ? `${NGROK_URL}/api/posts/user/${username}`
        : `${NGROK_URL}/api/posts/myposts`;
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        const mappedPosts = data.map(post => ({
          _id: post.post_id,
          username: post.username,
          profile_picture: post.profile_picture,
          image_url: post.media_url,
          content: post.content,
          created_at: post.created_at,
          likes: post.like_count || 0,
          comments: 0,
          caption: post.content,
          media_type: post.media_type || (post.media_url?.includes('.mp4') ? 'video' : 'image')
        }));
        const validPosts = mappedPosts
          .filter(post => post.image_url && !post.image_url.includes('undefined'))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setUserPosts(validPosts);
      }
    } catch (error) {
      console.error("Posts fetch error:", error);
    }
  }, [navigation]);

  // Add these functions inside your Profile component before the fetchUserData function

const fetchStories = useCallback(async () => {
  try {
    const storiesData = await fetchWithAuth('/stories');
    if (storiesData) {
      const validStories = storiesData.filter(story => 
        story && (story.story_id || story.id)
      );
      setStories(validStories);
    }
  } catch (error) {
    console.error("Stories fetch error:", error);
  }
}, [fetchWithAuth]);

const fetchSections = useCallback(async () => {
  try {
    const sectionsData = await fetchWithAuth('/sections');
    if (sectionsData) {
      setSections(sectionsData);
    }
  } catch (error) {
    console.error("Sections fetch error:", error);
  }
}, [fetchWithAuth]);

const fetchGraphs = useCallback(async () => {
  try {
    const graphsData = await fetchWithAuth('/graphs');
    if (graphsData) {
      setUserGraphs(graphsData);
    }
  } catch (error) {
    console.error("Graphs fetch error:", error);
  }
}, [fetchWithAuth]);

// Add these handler functions for creating new content
const handleAddStory = async () => {
  navigation.navigate('AddStory', { onStoryAdded: fetchStories });
};

const handleAddSection = () => {
  setSectionType(null);
  setSectionTitle('');
  setSectionContent('');
  setImageUri(null);
  setSectionModalVisible(true);
};

const handleSectionSubmit = async () => {
  if (!sectionTitle) {
    alert('Please provide a section title');
    return;
  }

  // Validate section content based on type
  if (sectionType === 'text' && !sectionContent) {
    alert('Please provide section content');
    return;
  }

  if (sectionType === 'image' && !imageUri) {
    alert('Please select an image');
    return;
  }

  try {
    const sectionData = {
      type: sectionType,
      title: sectionTitle,
      content: sectionType === 'text' ? sectionContent : null,
      image_uri: sectionType === 'image' ? imageUri : null
    };

    const response = await fetchWithAuth('/sections', 'POST', sectionData);
    if (response) {
      await fetchSections();
      setSectionModalVisible(false);
      setSectionType(null);
      setSectionTitle('');
      setSectionContent('');
      setImageUri(null);
    }
  } catch (error) {
    console.error("Error creating section:", error);
    alert('Failed to create section');
  }
};

const handleAddGraph = async (graphData) => {
  try {
    const response = await fetchWithAuth('/graphs', 'POST', graphData);
    if (response) {
      await fetchGraphs();
      setGraphModalVisible(false);
    }
  } catch (error) {
    console.error("Error creating graph:", error);
    alert('Failed to create graph');
  }
};

const pickImage = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  } catch (error) {
    console.error("Error picking image:", error);
  }
};

  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.navigate('Login');
        return;
      }
      const { username, isOtherUser } = route.params || {};

      let response;
      if (isOtherUser && username) {
        response = await fetch(`${NGROK_URL}/api/auth/users/${username}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          },
        });
      } else {
        response = await fetch(`${NGROK_URL}/api/auth/profile?timestamp=${Date.now()}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          },
        });
      }

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setLastUpdate(Date.now());
        await AsyncStorage.setItem('userData', JSON.stringify(data));
        await Promise.all([
          fetchUserPosts(isOtherUser ? username : null),
          fetchStories(),
          fetchSections(),
          fetchGraphs()
        ]);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [fetchStories, fetchSections, fetchGraphs, fetchUserPosts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  }, [fetchUserData]);

  useFocusEffect(
    useCallback(() => {
      const shouldFetch = !userData || (Date.now() - lastUpdate > 5000);
      if (shouldFetch) fetchUserData();
    }, [fetchUserData, userData, lastUpdate])
  );

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
    <View style={{ width: '100%' }}>
      {sections.map((section) => {
        switch (section.type) {
          case 'story':
            return (
              <Stories 
                key={section.section_id} 
                title={section.title} 
                stories={stories} 
                onAddStory={handleAddStory}
                onStoryPress={(story) => console.log('Story pressed:', story)}
              />
            );
          case 'image':
            return <ImageSection key={section.section_id} title={section.title} imageUri={section.image_uri} />;
          case 'text':
            return <TextSection key={section.section_id} title={section.title} content={section.content} />;
          default:
            return null;
        }
      })}
      <TouchableOpacity style={styles.addStorySectionButton} onPress={handleAddSection}>
        <Text style={styles.addStorySectionText}>+ Add New Section</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTry = () => (
    <View style={styles.try}>
      {userGraphs.map((graph) => (
        <View key={graph.graph_id} style={styles.cardStyle}>
          <Text style={styles.graphTitle}>{graph.title}</Text>
          <View style={styles.graphContainer}>
            {graph.type === 'pie' && (
              <PieChart
                data={graph.data.map((item, i) => ({
                  ...item,
                  color: ['#007bff', '#004999', '#002d5f', '#000000', '#696969'][i % 5],
                  gradientCenterColor: ['#007bff', '#004999', '#002d5f', '#000000', '#696969'][(i + 1) % 5],
                  focused: true
                }))}
                donut
                innerRadius={40}
                radius={100}
                showText
                textColor="black"
                textSize={14}
                showValuesAsLabels={true}
                showGradient
                centerLabelComponent={() => (
                  <Text style={{ fontSize: 16, color: '#333' }}>
                    Total: {graph.data.reduce((sum, item) => sum + item.value, 0)}
                  </Text>
                )}
              />
            )}
            {graph.type === 'bar' && (
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
                hideRules={true}
                maxValue={Math.max(...graph.data.map(item => item.value)) * 1.2}
              />
            )}
            {graph.type === 'line' && (
              <LineChart
                data={graph.data}
                height={200}
                width={350}
                hideRules={true}
                spacing={50}
                noOfSections={5}
                yAxisThickness={0}
                xAxisThickness={0}
                isAnimated
                animationDuration={700}
                maxValue={Math.max(...graph.data.map(item => item.value)) * 1.2}
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

  const renderGridItem = (post, index) => {
    const isVideo = post.media_type === 'video' || post.image_url?.includes('.mp4');
    return (
      <TouchableOpacity
        key={index}
        style={[styles.gridItem, { width: (Dimensions.get('window').width - 34) / 3, height: (Dimensions.get('window').width - 34) / 3, marginBottom: 2 }]}
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
                : require('../../../assets/del.png')
            }
            style={styles.gridImage}
            resizeMode="cover"
            defaultSource={require('../../../assets/del.png')}
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  const handleProfileButtonPress = () => {
    if (route.params?.isOtherUser) {
      console.log("Viewing another user's profile, no edit option available.");
    } else {
      navigation.navigate('EditProfilePage', { userData });
    }
  };

  return (
    <View style={styles.contentContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
              <View style={{
                width: 96,
                height: 96,
                backgroundColor: "#f0f8ff",
                borderRadius: isBusinessProfile ? 20 : 48,
                overflow: "hidden",
              }}>
                <Image
                  source={
                    userData?.profile_picture
                      ? { uri: `${userData.profile_picture}?timestamp=${lastUpdate}` }
                      : require('../../../assets/del.png')
                  }
                  style={styles.profileImage}
                  resizeMode="cover"
                  defaultSource={require('../../../assets/del.png')}
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
              onPress={handleProfileButtonPress}
            >
              <Text style={styles.button}>
                {route.params?.isOtherUser ? "Profile" : "Edit Profile"}
              </Text>
            </TouchableOpacity>
          </View>
          <Stories
            stories={stories}
            onStoryPress={(story) => console.log('Story pressed:', story)}
            onAddStory={handleAddStory}
            title="Milestones and others"
          />
        </View>

        <View style={styles.tab}>
          {renderTab("stories", isBusinessProfile ? "The Startup" : "The Ventures")}
          {renderTab("startups", "The Analytics")}
          {renderTab("bucks", "The Posts")}
        </View>

        {activeTab === 'stories' && renderStoriesTab()}
        {activeTab === 'startups' && renderTry()}
        {activeTab === 'bucks' && renderGrid()}
      </ScrollView>

      <Modal visible={isSectionModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Section</Text>
            {!sectionType ? (
              <View style={styles.modalOptions}>
                <TouchableOpacity style={styles.modalButton} onPress={() => setSectionType('story')}>
                  <Text style={styles.modalButtonText}>Story Section</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={() => setSectionType('image')}>
                  <Text style={styles.modalButtonText}>Image Section</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={() => setSectionType('text')}>
                  <Text style={styles.modalButtonText}>Text Section</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setSectionModalVisible(false)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.modalForm}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Section Title"
                    value={sectionTitle}
                    onChangeText={setSectionTitle}
                  />
                  {sectionType === 'text' && (
                    <TextInput
                      style={[styles.modalInput, styles.modalTextArea]}
                      placeholder="Section Content"
                      value={sectionContent}
                      onChangeText={setSectionContent}
                      multiline
                    />
                  )}
                  {sectionType === 'image' && (
                    <TouchableOpacity style={styles.modalButton} onPress={pickImage}>
                      <Text style={styles.modalButtonText}>{imageUri ? 'Image Selected' : 'Pick Image'}</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.modalFormButtons}>
                    <TouchableOpacity style={styles.modalSubmitButton} onPress={handleSectionSubmit}>
                      <Text style={styles.modalButtonText}>Add Section</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setSectionModalVisible(false)}>
                      <Text style={styles.modalButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <View style={styles.bottomNavContainer}>
        <Bottomnav />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    width: '100%',
    alignSelf: 'stretch',
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginVertical: 2,
    textAlign: 'left',
    paddingHorizontal: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    width: Dimensions.get('window').width,
    marginVertical: 5,
  },
  sectionImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
    marginVertical: 2,
  },
  sectionContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginVertical: 2,
    textAlign: 'left',
    paddingHorizontal: 15,
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: Dimensions.get('window').width - 30,
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'left',
    marginVertical: 2,
    paddingHorizontal: 15,
    flex: 1,
    width: '100%',
  },
  storiesContainer: {
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  storyItem: {
    alignItems: 'center',
    width: 72,
    marginHorizontal: 6,
    paddingVertical: 4,
  },
  storyRing: {
    borderWidth: 2,
    borderRadius: 37,
  },
  activeStoryRing: {
    borderWidth: 2.5,
    borderColor: '#007bff',
  },
  storyImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  addStoryText: {
    fontSize: 24,
    color: '#666',
    fontWeight: '600',
  },
  storyUsername: {
    marginTop: 6,
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    fontFamily: "AvenirNextCyr",
    fontWeight: '500',
  },
  unreadIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
    borderWidth: 1,
    borderColor: '#fff',
  },
  addStorySectionButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
  },
  addStorySectionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addGraphButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
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
    paddingVertical: 20,
    width: '100%',
  },
  cardStyle: {
    width: '90%',
    height: 300,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    width: 350,
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
    paddingVertical: 20,
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 0,
    width: '100%',
    position: 'relative',
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
    marginTop: 55,
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
    marginBottom: 20,
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
    paddingTop: 20,
  },
  scrollViewContent: {
    paddingBottom: 80,
    width: '100%',
    alignItems: 'center',
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  modalOptions: {
    width: '100%',
    gap: 10,
  },
  modalButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalForm: {
    width: '100%',
    gap: 15,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    width: '100%',
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalFormButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalSubmitButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginRight: 5,
  },
});

export default Profile;