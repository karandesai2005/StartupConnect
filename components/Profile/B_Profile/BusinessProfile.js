import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NGROK_URL } from '@env';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Dashboard from './Dashboard';

const { width: screenWidth } = Dimensions.get('window');

const ProfileHeader = React.memo(({ userData, navigation, isOwnProfile, onFollow }) => {
  const [imageError, setImageError] = useState(false);

  const avatarStyle = useMemo(() => ({
    height: '100%',
    width: '100%',
    backgroundColor: '#f0f8ff',
    borderRadius: 20,
    overflow: 'hidden',
  }), []);

  const profilePictureUrl = useMemo(() => {
    if (!userData?.profile_picture) return null;
    return userData.profile_picture.startsWith('https')
      ? userData.profile_picture
      : `${NGROK_URL}/Uploads/${userData.profile_picture}`;
  }, [userData?.profile_picture]);

  console.log('ProfileHeader rendering:', { isOwnProfile, username: userData?.username });

  return (
    <View style={styles.profile}>
      <View style={styles.profileSection}>
        <View style={styles.statsContainer}>
          <Text style={styles.statsNumber}>{userData?.followers || '0'}</Text>
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
          <Text style={styles.statsNumber}>{userData?.following || '0'}</Text>
          <Text style={styles.statsLabel}>Following</Text>
        </View>
      </View>
      <View style={styles.text}>
        <View style={styles.id}>
          <Text style={styles.userName}>{userData?.username || 'Unknown'}</Text>
          {userData?.verified && <Text style={styles.checkCircleIcon}>✓</Text>}
        </View>
        <Text style={[styles.bio, { textAlign: 'center', paddingHorizontal: 10 }]}>
          {userData?.bio || 'No bio available'}
        </Text>
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>About</Text>
          <Text style={styles.about}>
            {userData?.about || userData?.bio || 'No about information provided.'}
          </Text>
        </View>
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
              {userData?.isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.userData?.isFollowing === nextProps.userData?.isFollowing &&
         prevProps.userData?.followers === nextProps.userData?.followers &&
         prevProps.isOwnProfile === nextProps.isOwnProfile;
});

const BusinessProfile = ({ route }) => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const scrollRef = useRef(null);
  const lastOffsetY = useRef(0);

  const fetchInitialData = useCallback(async () => {
    let mounted = true;
    try {
      setIsLoading(true);
      const userDataStr = await AsyncStorage.getItem('userData');
      const token = await AsyncStorage.getItem('token');
      console.log('AsyncStorage:', { userDataStr: !!userDataStr, token: !!token });

      if (!token) {
        console.log('No token, redirecting to Login');
        navigation.navigate('Login');
        return;
      }

      const parsedUser = userDataStr ? JSON.parse(userDataStr) : null;
      if (mounted) {
        console.log('Current user:', parsedUser?.username || 'none');
        setCurrentUser(parsedUser);
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      };

      const { username = parsedUser?.username, isOtherUser = false } = route.params || {};
      if (!username) {
        console.warn('No username, redirecting to Main');
        navigation.navigate('Main');
        return;
      }

      const isViewingOtherUser = isOtherUser || (username && parsedUser && username !== parsedUser.username);

      console.log('Params:', { username, isOtherUser, isViewingOtherUser });

      const profileUrl = isViewingOtherUser
        ? `${NGROK_URL}/api/profile/user/${encodeURIComponent(username)}`
        : `${NGROK_URL}/api/profile`;

      console.log('Fetching:', profileUrl);

      const profileResponse = await fetch(profileUrl, { method: 'GET', headers }).catch(e => {
        throw new Error(`Profile fetch error: ${e.message}`);
      });

      if (!profileResponse.ok) throw new Error(`Profile fetch failed: ${profileResponse.status}`);

      const profileData = await profileResponse.json();

      const formattedUserData = {
        ...profileData,
        profile_picture: profileData.profile_picture?.startsWith('https')
          ? profileData.profile_picture
          : profileData.profile_picture ? `${NGROK_URL}/Uploads/${profileData.profile_picture}` : null,
        about: profileData.about || profileData.bio || 'No about information provided.',
        mission: profileData.mission || 'Empowering entrepreneurs...',
        who_we_are: profileData.who_we_are || 'A team of innovators...',
        vision: profileData.vision || 'Connecting businesses globally...',
        values: profileData.values || 'Integrity, collaboration, excellence...',
        contact: profileData.contact || 'Reach us at contact@pitch.com',
      };

      if (mounted) {
        console.log('User data:', formattedUserData.username);
        setUserData(formattedUserData);
        if (!isViewingOtherUser && formattedUserData) {
          await AsyncStorage.setItem('userData', JSON.stringify(formattedUserData));
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Fetch error:', error.message);
      if (mounted) {
        Alert.alert('Error', `Failed to load profile: ${error.message}`);
        setIsLoading(false);
        navigation.navigate('Main');
      }
    }
    return () => { mounted = false; };
  }, [navigation, route.params]);

  useEffect(() => {
    console.log('BusinessProfile mounted');
    fetchInitialData();
  }, [fetchInitialData]);

  const isOwnProfile = useMemo(() => {
    if (!currentUser || !userData) {
      console.log('isOwnProfile: Waiting', { currentUser: currentUser?.username, userData: userData?.username });
      return false;
    }
    const { username, isOtherUser } = route.params || {};
    const result = !isOtherUser && (!username || username === currentUser.username || userData.username === currentUser.username);
    console.log('isOwnProfile:', { routeUsername: username, isOtherUser, currentUser: currentUser.username, userData: userData.username, result });
    return result;
  }, [currentUser, userData, route.params]);

  const onGestureEvent = useCallback(({ nativeEvent }) => {
    console.log('Gesture event:', {
      state: nativeEvent.state,
      translationY: nativeEvent.translationY,
      velocityY: nativeEvent.velocityY,
    });
    if (nativeEvent.state === State.ACTIVE) {
      console.log('Gesture active:', { translationY: nativeEvent.translationY });
    }
    if (nativeEvent.state === State.END) {
      console.log('Gesture ended:', { translationY: nativeEvent.translationY });
      if (nativeEvent.translationY < -100) {
        console.log('Swipe up detected');
        setShowDashboard(true);
      } else if (nativeEvent.translationY > 100 && showDashboard) {
        console.log('Swipe down detected');
        setShowDashboard(false);
      }
    }
  }, [showDashboard]);

  const onHandlerStateChange = useCallback(({ nativeEvent }) => {
    console.log('Handler state change:', {
      state: nativeEvent.state,
      translationY: nativeEvent.translationY,
    });
  }, []);

  const handleScroll = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    console.log('Scroll event:', { offsetY, lastOffsetY: lastOffsetY.current });
    if (!showDashboard && offsetY < -100) {
      console.log('Scroll up detected');
      setShowDashboard(true);
    } else if (showDashboard && offsetY > 100) {
      console.log('Scroll down detected');
      setShowDashboard(false);
    }
    lastOffsetY.current = offsetY;
  }, [showDashboard]);

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
      {showDashboard ? (
        <View style={styles.swipeContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Main')}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetY={[-20, 20]}
          >
            <View style={styles.gestureArea}>
              <Dashboard userData={userData} navigation={navigation} />
            </View>
          </PanGestureHandler>
        </View>
      ) : (
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          activeOffsetY={[-20, 20]}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.swipeContainer}
            contentContainerStyle={styles.scrollContent}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate('Main')}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <ProfileHeader
              userData={userData}
              navigation={navigation}
              isOwnProfile={isOwnProfile}
              onFollow={async () => {
                const token = await AsyncStorage.getItem('token');
                if (!token) return navigation.navigate('Login');
                const method = userData?.isFollowing ? 'DELETE' : 'POST';
                try {
                  console.log('Following:', userData.username, 'Method:', method);
                  const response = await fetch(`${NGROK_URL}/api/profile/follow/${encodeURIComponent(userData.username)}`, {
                    method,
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                  });
                  const result = await response.json();
                  console.log('Follow response:', result);
                  if (response.ok) {
                    setUserData(prev => ({
                      ...prev,
                      isFollowing: result.isFollowing,
                      followers: result.followers,
                    }));
                  } else {
                    Alert.alert('Error', result.error || 'Something went wrong');
                  }
                } catch (error) {
                  console.error('Follow error:', error);
                  Alert.alert('Error', `Failed to ${userData?.isFollowing ? 'unfollow' : 'follow'}: ${error.message}`);
                }
              }}
            />
            <Text style={styles.swipePrompt}>Swipe up for dashboard</Text>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => {
                console.log('Debug: Toggling dashboard');
                setShowDashboard(!showDashboard);
              }}
            >
              <Text style={styles.debugButtonText}>
                {showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
              </Text>
            </TouchableOpacity>
            {/* Spacer to allow scrolling */}
            <View style={{ height: 200 }} />
          </ScrollView>
        </PanGestureHandler>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  swipeContainer: { flex: 1, width: '100%' },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  gestureArea: { flex: 1 },
  profile: { width: '100%', backgroundColor: '#fff', alignItems: 'center', padding: 14, gap: 14 },
  profileSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, marginTop: 25 },
  avatarMultiVariants: { width: 96, height: 96, marginHorizontal: 20 },
  profileImage: { width: '100%', height: '100%', borderRadius: 20 },
  statsContainer: { alignItems: 'center', justifyContent: 'center' },
  statsNumber: { fontSize: 18, fontWeight: '700', color: '#000' },
  statsLabel: { fontSize: 14, color: '#666' },
  text: { width: '100%', gap: 8, alignItems: 'center' },
  userName: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: '#000' },
  id: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bio: { fontSize: 14, lineHeight: 20, fontWeight: '500', color: '#000' },
  aboutSection: { width: '100%', paddingHorizontal: 20, gap: 4 },
  aboutTitle: { fontSize: 16, fontWeight: '700', color: '#000', textAlign: 'center' },
  about: { fontSize: 14, lineHeight: 20, color: '#333', textAlign: 'center' },
  checkCircleIcon: { marginLeft: 5, color: 'green' },
  buttonContainer: { width: '100%', alignItems: 'center' },
  masterOutlineButton: { borderRadius: 14, borderColor: '#ccc', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f9f9f9' },
  followButton: { borderRadius: 14, backgroundColor: '#007BFF', paddingHorizontal: 20, paddingVertical: 8 },
  followingButton: { backgroundColor: '#ccc' },
  button: { fontSize: 12, lineHeight: 18, color: '#666', fontWeight: '600' },
  followButtonText: { fontSize: 14, lineHeight: 20, color: '#fff', fontWeight: '600' },
  backButton: { position: 'absolute', left: 5, top: 5, zIndex: 1 },
  backButtonText: { fontSize: 32, color: '#000', marginRight: 9 },
  swipePrompt: { fontSize: 16, color: '#666', textAlign: 'center', marginVertical: 20 },
  debugButton: { backgroundColor: '#007BFF', padding: 10, borderRadius: 10, margin: 20 },
  debugButtonText: { color: '#fff', fontSize: 16, textAlign: 'center' },
});

export default BusinessProfile;