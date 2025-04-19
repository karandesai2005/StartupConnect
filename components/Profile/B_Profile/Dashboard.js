import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  Image,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Video } from 'expo-av';
import { NGROK_URL } from '@env';

const screenWidth = Dimensions.get('window').width;

const Dashboard = ({ userData, navigation }) => {
  const [activeTab, setActiveTab] = useState('About');
  const [expandedAboutSection, setExpandedAboutSection] = useState(null);
  const [expandedChartSection, setExpandedChartSection] = useState(null);
  const [fundingIndex, setFundingIndex] = useState(0);
  const [userPosts, setUserPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [teamIndex, setTeamIndex] = useState(0);

  const toggleAboutSection = (sectionName) => {
    setExpandedAboutSection(expandedAboutSection === sectionName ? null : sectionName);
  };

  const toggleChartSection = (chartName) => {
    setExpandedChartSection(expandedChartSection === chartName ? null : chartName);
  };

  const teamData = [
    {
      name: 'Karan Desai',
      bio: 'The CTO and co-founder of PITCH with over 15 years of experience in tech leadership. Proud student of Symbiosis Institute of Technology at Pune.',
    },
    {
      name: 'Jane Smith',
      bio: 'Jane leads our development team, specializing in mobile and web applications.',
    },
    {
      name: 'Alex Brown',
      bio: 'Alex is our marketing guru, driving brand awareness and customer engagement.',
    },
  ];

  const aboutContent = [
    { title: 'Our Mission', content: userData?.mission || 'Our mission is to empower individuals and businesses...' },
    { title: 'Who We Are', content: userData?.who_we_are || 'We are a team of passionate developers...' },
    { title: 'Our Vision', content: userData?.vision || 'We envision a world where every organization...' },
    { title: 'Our Values', content: userData?.values || 'Integrity, innovation, and customer success...' },
    { title: 'Our Team', content: '' },
    { title: 'Contact Us', content: userData?.contact || 'Have questions or want to get in touch?...' },
  ];

  const processBarData = (data) => {
    const dataset = { ...data };
    const minValue = Math.min(...dataset.datasets[0].data);
    const minHeightValue = minValue > 0 ? Math.max(minValue, 1000) : minValue;
    dataset.datasets[0].data = dataset.datasets[0].data.map((value) =>
      value === minValue && minValue > 0 ? minHeightValue : value
    );
    return dataset;
  };

  const userMetricsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{ data: [500, 600, 750, 900, 1200, 1500, 1800, 2000, 2200, 2500, 2800, 3000], color: () => '#00FF99', strokeWidth: 2 }],
  };

  const revenueData = processBarData({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{ data: [10000, 12000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000] }],
  });

  const growthRateData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{ data: [5, 6, 8, 10, 12, 15, 18, 20, 22, 25, 28, 30], color: () => '#00FF99', strokeWidth: 2 }],
  };

  const marketSizeData = [
    { name: 'TAM', value: 10000000000, color: '#8A2BE2', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'SAM', value: 5000000000, color: '#00FF99', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'SOM', value: 1000000000, color: '#1E90FF', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  ];

  const revenueStreamData = processBarData({
    labels: ['Subs', 'Ads', 'In-A', 'Try', 'Cat'],
    datasets: [{ data: [70000, 80000, 80000, 80000, 80000] }],
  });

  const pricingModelData = [
    { name: 'Free', value: 1000, color: '#8A2BE2', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Basic', value: 500, color: '#00FF99', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Premium', value: 200, color: '#1E90FF', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  ];

  const fundingData = [
    { title: 'Seed Funding', data: processBarData({ labels: ['Seed'], datasets: [{ data: [500000] }] }) },
    { title: 'Series A', data: processBarData({ labels: ['SerA'], datasets: [{ data: [2000000] }] }) },
    { title: 'Series B', data: processBarData({ labels: ['SerB'], datasets: [{ data: [5000000] }] }) },
    { title: 'Total Funding', data: processBarData({ labels: ['Tot'], datasets: [{ data: [7500000] }] }) },
  ];

  const formatYLabel = (value) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const lineChartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: () => '#00FF99',
    labelColor: () => '#000',
    style: { borderRadius: 16 },
    fillShadowGradient: '#00FF99',
    fillShadowGradientTo: '#FFFF99',
    fillShadowGradientOpacity: 0.1,
    fillShadowGradientToOpacity: 0.5,
    propsForBackgroundLines: { stroke: '#E0E0E0', strokeWidth: 1 },
    formatYLabel: formatYLabel,
    propsForLabels: { fontSize: 10 },
  };

  const barChartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: () => 'transparent',
    labelColor: () => '#000',
    style: { borderRadius: 16 },
    fillShadowGradient: '#8A2BE2',
    fillShadowGradientTo: '#40E0D0',
    fillShadowGradientOpacity: 1,
    fillShadowGradientToOpacity: 1,
    barPercentage: 0.5,
    propsForBackgroundLines: { stroke: '#E0E0E0', strokeWidth: 1 },
    formatYLabel: formatYLabel,
    propsForLabels: { fontSize: 10 },
    getBarMinHeight: () => 10,
  };

  const pieChartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: () => '#8A2BE2',
    labelColor: () => '#000',
    style: { borderRadius: 16 },
    formatYLabel: formatYLabel,
    propsForLabels: { fontSize: 10 },
  };

  const nextFundingChart = () => setFundingIndex((prev) => (prev + 1) % fundingData.length);
  const nextTeamMember = () => setTeamIndex((prev) => (prev + 1) % teamData.length);
  const prevTeamMember = () => setTeamIndex((prev) => (prev - 1 + teamData.length) % teamData.length);

  const renderChart = (category) => {
    switch (category) {
      case 'User Metrics':
        return (
          <View style={styles.chartWrapper}>
            <Text style={styles.chartTitle}>Monthly Active Users (MAU)</Text>
            <LineChart
              data={userMetricsData}
              width={screenWidth - 40}
              height={220}
              chartConfig={lineChartConfig}
              bezier
              withDots={false}
              style={styles.chart}
              withVerticalLines={true}
            />
          </View>
        );

      case 'Revenue and Financials':
        return (
          <View style={styles.chartWrapper}>
            <Text style={styles.chartTitle}>Monthly Revenue ($)</Text>
            <BarChart
              data={revenueData}
              width={screenWidth - 40}
              height={220}
              yAxisLabel=""
              chartConfig={barChartConfig}
              withInnerLines={true}
              style={styles.chart}
              fromZero={true}
              withVerticalLines={true}
            />
          </View>
        );

      case 'Growth Rate':
        return (
          <View style={styles.chartWrapper}>
            <Text style={styles.chartTitle}>Monthly Growth Rate (%)</Text>
            <LineChart
              data={growthRateData}
              width={screenWidth - 40}
              height={220}
              yAxisSuffix="%"
              chartConfig={lineChartConfig}
              bezier
              withDots={false}
              style={styles.chart}
              withVerticalLines={true}
            />
          </View>
        );

      case 'Market Size':
        return (
          <View style={styles.chartWrapper}>
            <Text style={styles.chartTitle}>Market Size ($)</Text>
            <PieChart
              data={marketSizeData}
              width={screenWidth - 40}
              height={220}
              chartConfig={pieChartConfig}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        );

      case 'Revenue Stream':
        return (
          <View style={styles.chartWrapper}>
            <Text style={styles.chartTitle}>Revenue Streams ($)</Text>
            <BarChart
              data={revenueStreamData}
              width={screenWidth - 80}
              height={220}
              yAxisLabel=""
              chartConfig={barChartConfig}
              withInnerLines={true}
              style={styles.chart}
              fromZero={true}
              withVerticalLines={true}
            />
          </View>
        );

      case 'Pricing Model':
        return (
          <View style={styles.chartWrapper}>
            <Text style={styles.chartTitle}>Pricing Model Distribution</Text>
            <PieChart
              data={pricingModelData}
              width={screenWidth - 40}
              height={220}
              chartConfig={pieChartConfig}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        );

      case 'Funding':
        return (
          <View style={styles.chartWrapper}>
            <Text style={styles.chartTitle}>Funding Overview</Text>
            <View style={styles.fundingContainer}>
              <View>
                <Text style={styles.subChartTitle}>{fundingData[fundingIndex].title}</Text>
                <BarChart
                  data={fundingData[fundingIndex].data}
                  width={screenWidth - 80}
                  height={220}
                  yAxisLabel=""
                  chartConfig={barChartConfig}
                  withInnerLines={true}
                  style={styles.chart}
                  fromZero={true}
                  withVerticalLines={true}
                />
              </View>
              <TouchableOpacity style={styles.nextButton} onPress={nextFundingChart}>
                <Icon name="chevron-right" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderAboutSection = (section) => {
    if (section.title === 'Our Team') {
      return (
        <View style={styles.contentWrapper}>
          <View style={styles.carouselContainer}>
            <TouchableOpacity style={styles.carouselButton} onPress={prevTeamMember}>
              <Icon name="chevron-left" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.teamMemberContainer}>
              <View style={styles.teamContent}>
                <View style={styles.teamHeader}>
                  <Text style={styles.teamName}>{teamData[teamIndex].name}</Text>
                </View>
                <Text style={styles.teamBio}>{teamData[teamIndex].bio}</Text>
              </View>
              <View style={styles.profileContainer}>
                <Image
                  source={require('../../../assets/profiledefault.jpg')}
                  style={styles.teamImage}
                  resizeMode="cover"
                />
              </View>
            </View>
            <TouchableOpacity style={styles.carouselButton} onPress={nextTeamMember}>
              <Icon name="chevron-right" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.contentWrapper}>
        <Text style={styles.contentText}>{section.content}</Text>
      </View>
    );
  };

  const fetchInitialData = useCallback(async () => {
    let mounted = true;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      };

      const postsUrl = userData?.username
        ? `${NGROK_URL}/api/posts/user/${encodeURIComponent(userData.username)}`
        : `${NGROK_URL}/api/posts/myposts`;
      console.log('Fetching posts from:', postsUrl);

      const postsResponse = await fetch(postsUrl, { method: 'GET', headers });
      if (!postsResponse.ok) throw new Error(`Posts fetch failed: ${postsResponse.status}`);

      const postsData = await postsResponse.json();
      const mappedPosts = Array.isArray(postsData)
        ? postsData
            .map((post) => ({
              _id: post.post_id || post.id,
              username: post.username,
              profile_picture: post.profile_picture?.startsWith('https')
                ? post.profile_picture
                : post.profile_picture
                ? `${NGROK_URL}/Uploads/${post.profile_picture}`
                : null,
              image_url: post.media_url?.startsWith('https')
                ? post.media_url
                : post.media_url
                ? `${NGROK_URL}/Uploads/${post.media_url}`
                : null,
              content: post.content,
              created_at: post.created_at,
              likes: post.like_count || 0,
              comments: post.comment_count || 0,
              media_type: post.media_type || (post.media_url?.includes('.mp4') ? 'video' : 'image'),
            }))
            .filter((post) => post.image_url && !post.image_url.includes('undefined'))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        : [];

      console.log('Fetched posts:', mappedPosts.length);
      if (mounted) {
        setUserPosts(mappedPosts);
        setIsLoadingPosts(false);
        setRefreshing(false);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      if (mounted) {
        setUserPosts([]);
        Alert.alert('Error', `Failed to fetch posts: ${error.message}`);
        setIsLoadingPosts(false);
        setRefreshing(false);
      }
    }
    return () => {
      mounted = false;
    };
  }, [navigation, userData?.username]);

  useEffect(() => {
    if (activeTab === 'Posts') {
      setIsLoadingPosts(true);
      fetchInitialData();
    }
  }, [activeTab, fetchInitialData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'Posts') {
      fetchInitialData();
    }
  }, [activeTab, fetchInitialData]);

  const itemSize = useMemo(() => (screenWidth - 32 - 4) / 3, [screenWidth]);
  const renderGridItem = useCallback(
    ({ item, index }) => (
      <TouchableOpacity
        style={[styles.gridItem, { width: itemSize, height: itemSize }]}
        onPress={() => {
          const stablePosts = [...userPosts];
          navigation.navigate('PostView', { posts: stablePosts, initialIndex: index });
        }}
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
              <Image source={require('../../../assets/play-button.png')} style={styles.playIcon} />
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
    ),
    [itemSize, navigation, userPosts]
  );

  const renderTabContent = () => {
    if (activeTab === 'About') {
      return (
        <ScrollView style={styles.tabContent}>
          {aboutContent.map((section) => (
            <View key={section.title}>
              <TouchableOpacity style={styles.sectionItem} onPress={() => toggleAboutSection(section.title)}>
                <Text style={styles.sectionText}>{section.title}</Text>
                <Icon
                  name={expandedAboutSection === section.title ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color="#000"
                />
              </TouchableOpacity>
              {expandedAboutSection === section.title && renderAboutSection(section)}
            </View>
          ))}
        </ScrollView>
      );
    } else if (activeTab === 'Statistics') {
      return (
        <ScrollView style={styles.tabContent}>
          {['User Metrics', 'Revenue and Financials', 'Growth Rate', 'Market Size', 'Revenue Stream', 'Pricing Model', 'Funding'].map(
            (category) => (
              <View key={category}>
                <TouchableOpacity style={styles.sectionItem} onPress={() => toggleChartSection(category)}>
                  <Text style={styles.sectionText}>{category}</Text>
                  <Icon name={expandedChartSection === category ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#000" />
                </TouchableOpacity>
                {expandedChartSection === category && renderChart(category)}
              </View>
            )
          )}
        </ScrollView>
      );
    } else if (activeTab === 'Posts') {
      return (
        <View style={styles.tabContent}>
          {isLoadingPosts ? (
            <ActivityIndicator size="medium" color="#666" style={styles.loadingIndicator} />
          ) : userPosts.length === 0 ? (
            <Text style={styles.noPostsText}>No posts available</Text>
          ) : (
            <FlatList
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
          )}
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.bucket}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setActiveTab('About')}>
            <Text style={[styles.headerTitle, { color: activeTab === 'About' ? '#1a1a1a' : '#7F7F7F' }]}>About</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('Statistics')}>
            <Text style={[styles.headerTitle, { color: activeTab === 'Statistics' ? '#1a1a1a' : '#7F7F7F' }]}>Statistics</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('Posts')}>
            <Text style={[styles.headerTitle, { color: activeTab === 'Posts' ? '#1a1a1a' : '#7F7F7F' }]}>Posts</Text>
          </TouchableOpacity>
        </View>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  bucket: { flex: 1, padding: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    backgroundColor: '#f5f5f5',
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  tabContent: { flex: 1 },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginVertical: 5,
    elevation: 2,
  },
  sectionText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  contentWrapper: {
    marginVertical: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
  },
  contentText: { fontSize: 14, color: '#555', lineHeight: 22 },
  chartWrapper: {
    marginVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
    position: 'relative',
  },
  chartTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, marginLeft: 10 },
  subChartTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, marginLeft: 10 },
  chart: { borderRadius: 16 },
  fundingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextButton: { borderRadius: 20, padding: 10, marginRight: 10 },
  flatListContent: { alignItems: 'center', paddingTop: 5 },
  noPostsText: { fontSize: 16, color: '#666', textAlign: 'center', paddingBottom: 10 },
  gridItem: { backgroundColor: '#f0f0f0', margin: 1 },
  gridImage: { width: '100%', height: '100%', borderRadius: 4 },
  videoContainer: { position: 'relative', width: '100%', height: '100%' },
  playIconContainer: {
    position: 'absolute',
    top: 5,
    right: 5,
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
  loadingIndicator: { paddingTop: 20 },
  carouselContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  carouselButton: {
    padding: 10,
  },
  teamMemberContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 10,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  teamContent: { flex: 1 },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    marginBottom: 5,
  },
  teamName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  teamBio: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginTop: 15,
  },
  profileContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  teamImage: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
  },
});

export default Dashboard;